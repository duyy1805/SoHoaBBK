const sql = require("mssql");

const text = (value) => String(value ?? "").trim();
const key = (value) => text(value).toLocaleLowerCase("vi-VN");
const groupKey = (name, description) => `${key(name)}|${key(description)}`;
const isActive = (value) => value !== false && value !== 0;

const createSummary = (totalRows, products) => ({
  totalRows,
  affectedProducts: products.length,
  products: products.map((product) => ({
    Id: Number(product.Id),
    MaSanPham: product.MaSanPham,
    TenSanPham: product.TenSanPham || product.TenVatTu || ""
  })),
  createdNhom: 0,
  updatedNhom: 0,
  reactivatedNhom: 0,
  deactivatedNhom: 0,
  clonedNhom: 0,
  createdMuc: 0,
  updatedMuc: 0,
  reactivatedMuc: 0,
  deactivatedMuc: 0,
  createdGanNhom: 0,
  updatedGanNhom: 0,
  reactivatedGanNhom: 0,
  deactivatedGanNhom: 0
});

const querySnapshot = async (requestFactory, productIds) => {
  const ids = productIds.map(Number).filter(Number.isInteger);
  if (!ids.length) return { assignments: [], items: [] };

  const assignmentsResult = await requestFactory().query(`
    SELECT a.Id, a.SanPhamId, a.NhomKiemId, a.BatBuoc, a.ThuTu,
           a.TrangThai, g.TenNhom, g.MoTa, g.ThuTu AS ThuTuNhom,
           g.TrangThai AS NhomTrangThai,
           (SELECT COUNT(*)
              FROM dbo.SAN_PHAM_NHOM_KIEM usageRow
             WHERE usageRow.NhomKiemId = a.NhomKiemId
               AND ISNULL(usageRow.TrangThai, 1) = 1) AS ActiveUsage
      FROM dbo.SAN_PHAM_NHOM_KIEM a
      JOIN dbo.DM_NHOM_KIEM g ON g.Id = a.NhomKiemId
     WHERE a.SanPhamId IN (${ids.join(",")})
     ORDER BY a.SanPhamId, ISNULL(a.TrangThai, 1) DESC, a.Id DESC
  `);

  const groupIds = Array.from(new Set(
    (assignmentsResult.recordset || []).map((row) => Number(row.NhomKiemId))
  ));
  if (!groupIds.length) {
    return { assignments: assignmentsResult.recordset || [], items: [] };
  }

  const itemsResult = await requestFactory().query(`
    SELECT Id, NhomKiemId, TenMucKiem, ThamChieu, PhuongPhapKiem,
           TieuChuan, ThuTu, TrangThai, DiemTrongYeu
      FROM dbo.DM_CHECK_ITEM
     WHERE NhomKiemId IN (${groupIds.join(",")})
     ORDER BY ISNULL(TrangThai, 1) DESC, Id DESC
  `);

  return {
    assignments: assignmentsResult.recordset || [],
    items: itemsResult.recordset || []
  };
};

const buildSyncPlan = async ({ requestFactory, model }) => {
  const products = Array.from(model.products.values());
  const summary = createSummary(model.totalRows, products);
  const snapshot = await querySnapshot(requestFactory, products.map((item) => item.Id));
  const assignmentsByProduct = new Map();
  const itemsByGroup = new Map();

  snapshot.assignments.forEach((row) => {
    const productId = Number(row.SanPhamId);
    if (!assignmentsByProduct.has(productId)) assignmentsByProduct.set(productId, []);
    assignmentsByProduct.get(productId).push(row);
  });
  snapshot.items.forEach((row) => {
    const id = Number(row.NhomKiemId);
    if (!itemsByGroup.has(id)) itemsByGroup.set(id, []);
    itemsByGroup.get(id).push(row);
  });

  const plan = {
    summary,
    groups: [],
    deactivateAssignmentIds: new Set(),
    deactivateGroupIds: new Set(),
    deactivateItemIds: new Set()
  };
  const keptAssignmentIds = new Set();
  const reactivatedAssignmentIds = new Set();
  const previewByProductId = new Map(
    summary.products.map((product) => [Number(product.Id), product])
  );

  products.forEach((product) => {
    const preview = previewByProductId.get(Number(product.Id));
    const assignments = assignmentsByProduct.get(Number(product.Id)) || [];
    preview.currentGroups = assignments
      .filter((assignment) => isActive(assignment.TrangThai))
      .map((assignment) => ({
        AssignmentId: Number(assignment.Id),
        NhomKiemId: Number(assignment.NhomKiemId),
        TenNhom: assignment.TenNhom,
        MoTa: assignment.MoTa || "",
        Shared: Number(assignment.ActiveUsage || 0) > 1,
        items: (itemsByGroup.get(Number(assignment.NhomKiemId)) || [])
          .filter((item) => isActive(item.TrangThai))
          .map((item) => ({
            Id: Number(item.Id),
            TenMucKiem: item.TenMucKiem,
            DiemTrongYeu: Boolean(item.DiemTrongYeu)
          }))
      }));
    preview.resultGroups = [];
  });

  for (const product of products) {
    const assignments = assignmentsByProduct.get(Number(product.Id)) || [];
    const assignmentsByKey = new Map();
    assignments.forEach((assignment) => {
      const currentKey = groupKey(assignment.TenNhom, assignment.MoTa);
      if (!assignmentsByKey.has(currentKey)) assignmentsByKey.set(currentKey, []);
      assignmentsByKey.get(currentKey).push(assignment);
    });

    for (const desiredGroup of product.groups.values()) {
      const candidates = assignmentsByKey.get(desiredGroup.key) || [];
      const ranked = [...candidates].sort((left, right) => {
        const leftOtherUsage = Number(left.ActiveUsage || 0) - (isActive(left.TrangThai) ? 1 : 0);
        const rightOtherUsage = Number(right.ActiveUsage || 0) - (isActive(right.TrangThai) ? 1 : 0);
        const leftRank = leftOtherUsage === 0 ? (isActive(left.TrangThai) ? 0 : 1) : (isActive(left.TrangThai) ? 2 : 3);
        const rightRank = rightOtherUsage === 0 ? (isActive(right.TrangThai) ? 0 : 1) : (isActive(right.TrangThai) ? 2 : 3);
        return leftRank - rightRank || Number(right.Id) - Number(left.Id);
      });
      const selected = ranked[0] || null;
      const otherActiveUsage = selected
        ? Number(selected.ActiveUsage || 0) - (isActive(selected.TrangThai) ? 1 : 0)
        : 0;
      const mustClone = Boolean(selected && otherActiveUsage > 0);

      if (!selected || mustClone) {
        plan.groups.push({
          action: mustClone ? "clone" : "create",
          productId: Number(product.Id),
          desired: desiredGroup
        });
        summary.createdNhom += 1;
        summary.createdMuc += desiredGroup.items.size;
        summary.createdGanNhom += 1;
        if (mustClone) summary.clonedNhom += 1;
        previewByProductId.get(Number(product.Id)).resultGroups.push({
          TenNhom: desiredGroup.TenNhom,
          MoTa: desiredGroup.MoTa,
          Action: mustClone ? "CLONE" : "CREATE",
          items: Array.from(desiredGroup.items.values()).map((item) => ({
            TenMucKiem: item.TenMucKiem,
            DiemTrongYeu: Boolean(item.DiemTrongYeu),
            Action: "CREATE"
          }))
        });
      } else {
        keptAssignmentIds.add(Number(selected.Id));
        const groupId = Number(selected.NhomKiemId);
        const groupPlan = {
          action: "reuse",
          productId: Number(product.Id),
          groupId,
          assignmentId: Number(selected.Id),
          desired: desiredGroup,
          updateItems: [],
          createItems: []
        };

        summary.updatedNhom += 1;
        if (!isActive(selected.NhomTrangThai)) summary.reactivatedNhom += 1;
        if (isActive(selected.TrangThai)) {
          summary.updatedGanNhom += 1;
        } else {
          summary.reactivatedGanNhom += 1;
          reactivatedAssignmentIds.add(Number(selected.Id));
        }

        const existingItems = itemsByGroup.get(groupId) || [];
        const existingItemsByName = new Map();
        existingItems.forEach((item) => {
          const itemKey = key(item.TenMucKiem);
          if (!existingItemsByName.has(itemKey)) existingItemsByName.set(itemKey, []);
          existingItemsByName.get(itemKey).push(item);
        });
        const keptItemIds = new Set();
        const resultItems = [];

        for (const desiredItem of desiredGroup.items.values()) {
          const matches = existingItemsByName.get(desiredItem.key) || [];
          const matched = matches[0] || null;
          if (matched) {
            keptItemIds.add(Number(matched.Id));
            groupPlan.updateItems.push({ id: Number(matched.Id), desired: desiredItem });
            summary.updatedMuc += 1;
            if (!isActive(matched.TrangThai)) summary.reactivatedMuc += 1;
            resultItems.push({
              TenMucKiem: desiredItem.TenMucKiem,
              DiemTrongYeu: Boolean(desiredItem.DiemTrongYeu),
              Action: isActive(matched.TrangThai) ? "UPDATE" : "REACTIVATE"
            });
          } else {
            groupPlan.createItems.push(desiredItem);
            summary.createdMuc += 1;
            resultItems.push({
              TenMucKiem: desiredItem.TenMucKiem,
              DiemTrongYeu: Boolean(desiredItem.DiemTrongYeu),
              Action: "CREATE"
            });
          }
        }

        existingItems.forEach((item) => {
          if (isActive(item.TrangThai) && !keptItemIds.has(Number(item.Id))) {
            plan.deactivateItemIds.add(Number(item.Id));
          }
        });
        plan.groups.push(groupPlan);
        previewByProductId.get(Number(product.Id)).resultGroups.push({
          TenNhom: desiredGroup.TenNhom,
          MoTa: desiredGroup.MoTa,
          Action: !isActive(selected.NhomTrangThai) || !isActive(selected.TrangThai)
            ? "REACTIVATE"
            : "UPDATE",
          items: resultItems
        });
      }

      candidates.forEach((candidate) => {
        if (isActive(candidate.TrangThai) && !keptAssignmentIds.has(Number(candidate.Id))) {
          plan.deactivateAssignmentIds.add(Number(candidate.Id));
        }
      });
    }

    assignments.forEach((assignment) => {
      if (isActive(assignment.TrangThai) && !keptAssignmentIds.has(Number(assignment.Id))) {
        plan.deactivateAssignmentIds.add(Number(assignment.Id));
      }
    });
  }

  summary.deactivatedGanNhom = plan.deactivateAssignmentIds.size;

  const activeUsageAfter = new Map();
  snapshot.assignments.forEach((assignment) => {
    const groupId = Number(assignment.NhomKiemId);
    if (!activeUsageAfter.has(groupId)) {
      activeUsageAfter.set(groupId, Number(assignment.ActiveUsage || 0));
    }
    if (plan.deactivateAssignmentIds.has(Number(assignment.Id)) && isActive(assignment.TrangThai)) {
      activeUsageAfter.set(groupId, activeUsageAfter.get(groupId) - 1);
    }
    if (reactivatedAssignmentIds.has(Number(assignment.Id)) && !isActive(assignment.TrangThai)) {
      activeUsageAfter.set(groupId, activeUsageAfter.get(groupId) + 1);
    }
  });

  snapshot.assignments.forEach((assignment) => {
    const groupId = Number(assignment.NhomKiemId);
    if (activeUsageAfter.get(groupId) === 0 && isActive(assignment.NhomTrangThai)) {
      plan.deactivateGroupIds.add(groupId);
    }
  });
  plan.deactivateGroupIds.forEach((groupId) => {
    (itemsByGroup.get(groupId) || []).forEach((item) => {
      if (isActive(item.TrangThai)) plan.deactivateItemIds.add(Number(item.Id));
    });
  });
  summary.deactivatedNhom = plan.deactivateGroupIds.size;
  summary.deactivatedMuc = plan.deactivateItemIds.size;
  summary.products.forEach((product) => {
    product.currentGroups.forEach((group) => {
      group.WillDeactivate = plan.deactivateAssignmentIds.has(group.AssignmentId);
      group.WillClone = group.WillDeactivate && product.resultGroups.some((resultGroup) => (
        resultGroup.Action === "CLONE"
        && groupKey(resultGroup.TenNhom, resultGroup.MoTa) === groupKey(group.TenNhom, group.MoTa)
      ));
      group.items.forEach((item) => {
        item.WillDeactivate = group.WillDeactivate || plan.deactivateItemIds.has(item.Id);
      });
    });
  });

  return plan;
};

const executeSyncPlan = async (transaction, plan) => {
  const request = () => new sql.Request(transaction);

  for (const group of plan.groups) {
    if (group.action === "create" || group.action === "clone") {
      const created = await request()
        .input("TenNhom", sql.NVarChar(255), group.desired.TenNhom)
        .input("MoTa", sql.NVarChar(sql.MAX), group.desired.MoTa)
        .input("ThuTu", sql.Int, group.desired.ThuTu)
        .query(`
          INSERT dbo.DM_NHOM_KIEM (TenNhom, MoTa, ThuTu, TrangThai)
          OUTPUT INSERTED.Id
          VALUES (@TenNhom, @MoTa, @ThuTu, 1)
        `);
      const groupId = Number(created.recordset[0].Id);

      for (const item of group.desired.items.values()) {
        await request()
          .input("NhomKiemId", sql.Int, groupId)
          .input("TenMucKiem", sql.NVarChar(255), item.TenMucKiem)
          .input("ThamChieu", sql.NVarChar(255), item.ThamChieu || null)
          .input("PhuongPhapKiem", sql.NVarChar(sql.MAX), item.PhuongPhapKiem || null)
          .input("TieuChuan", sql.NVarChar(sql.MAX), item.TieuChuan || null)
          .input("ThuTu", sql.Int, item.ThuTu)
          .input("DiemTrongYeu", sql.Bit, item.DiemTrongYeu ?? false)
          .query(`
            INSERT dbo.DM_CHECK_ITEM
              (NhomKiemId, TenMucKiem, ThamChieu, PhuongPhapKiem, TieuChuan, ThuTu, TrangThai, DiemTrongYeu)
            VALUES
              (@NhomKiemId, @TenMucKiem, @ThamChieu, @PhuongPhapKiem, @TieuChuan, @ThuTu, 1, @DiemTrongYeu)
          `);
      }

      await request()
        .input("SanPhamId", sql.Int, group.productId)
        .input("NhomKiemId", sql.Int, groupId)
        .input("ThuTu", sql.Int, group.desired.ThuTuGanNhom)
        .query(`
          INSERT dbo.SAN_PHAM_NHOM_KIEM (SanPhamId, NhomKiemId, BatBuoc, ThuTu, TrangThai)
          VALUES (@SanPhamId, @NhomKiemId, 1, @ThuTu, 1)
        `);
      continue;
    }

    await request()
      .input("Id", sql.Int, group.groupId)
      .input("TenNhom", sql.NVarChar(255), group.desired.TenNhom)
      .input("MoTa", sql.NVarChar(sql.MAX), group.desired.MoTa)
      .input("ThuTu", sql.Int, group.desired.ThuTu)
      .query(`
        UPDATE dbo.DM_NHOM_KIEM
           SET TenNhom=@TenNhom, MoTa=@MoTa, ThuTu=@ThuTu, TrangThai=1
         WHERE Id=@Id
      `);

    for (const item of group.updateItems) {
      await request()
        .input("Id", sql.Int, item.id)
        .input("TenMucKiem", sql.NVarChar(255), item.desired.TenMucKiem)
        .input("ThamChieu", sql.NVarChar(255), item.desired.ThamChieu || null)
        .input("PhuongPhapKiem", sql.NVarChar(sql.MAX), item.desired.PhuongPhapKiem || null)
        .input("TieuChuan", sql.NVarChar(sql.MAX), item.desired.TieuChuan || null)
        .input("ThuTu", sql.Int, item.desired.ThuTu)
        .input("DiemTrongYeu", sql.Bit, item.desired.DiemTrongYeu ?? false)
        .query(`
          UPDATE dbo.DM_CHECK_ITEM
             SET TenMucKiem=@TenMucKiem, ThamChieu=@ThamChieu,
                 PhuongPhapKiem=@PhuongPhapKiem, TieuChuan=@TieuChuan,
                 ThuTu=@ThuTu, TrangThai=1, DiemTrongYeu=@DiemTrongYeu
           WHERE Id=@Id
        `);
    }

    for (const item of group.createItems) {
      await request()
        .input("NhomKiemId", sql.Int, group.groupId)
        .input("TenMucKiem", sql.NVarChar(255), item.TenMucKiem)
        .input("ThamChieu", sql.NVarChar(255), item.ThamChieu || null)
        .input("PhuongPhapKiem", sql.NVarChar(sql.MAX), item.PhuongPhapKiem || null)
        .input("TieuChuan", sql.NVarChar(sql.MAX), item.TieuChuan || null)
        .input("ThuTu", sql.Int, item.ThuTu)
        .input("DiemTrongYeu", sql.Bit, item.DiemTrongYeu ?? false)
        .query(`
          INSERT dbo.DM_CHECK_ITEM
            (NhomKiemId, TenMucKiem, ThamChieu, PhuongPhapKiem, TieuChuan, ThuTu, TrangThai, DiemTrongYeu)
          VALUES
            (@NhomKiemId, @TenMucKiem, @ThamChieu, @PhuongPhapKiem, @TieuChuan, @ThuTu, 1, @DiemTrongYeu)
        `);
    }

    await request()
      .input("Id", sql.Int, group.assignmentId)
      .input("ThuTu", sql.Int, group.desired.ThuTuGanNhom)
      .query(`
        UPDATE dbo.SAN_PHAM_NHOM_KIEM
           SET BatBuoc=1, ThuTu=@ThuTu, TrangThai=1
         WHERE Id=@Id
      `);
  }

  const deactivate = async (table, ids) => {
    const values = Array.from(ids);
    if (!values.length) return;
    await request().query(`UPDATE dbo.${table} SET TrangThai=0 WHERE Id IN (${values.join(",")})`);
  };
  await deactivate("SAN_PHAM_NHOM_KIEM", plan.deactivateAssignmentIds);
  await deactivate("DM_CHECK_ITEM", plan.deactivateItemIds);
  await deactivate("DM_NHOM_KIEM", plan.deactivateGroupIds);
};

module.exports = {
  buildSyncPlan,
  executeSyncPlan,
  groupKey
};
