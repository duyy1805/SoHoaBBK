const sql = require('mssql');

const normalizeIds = (values) => [...new Set((Array.isArray(values) ? values : [values])
    .map(Number)
    .filter((value) => Number.isInteger(value) && value > 0))];

const roleLabels = {
    PX: 'Phân xưởng xác nhận',
    KIEM_NGHIEM: 'Kiểm nghiệm xác nhận',
    TBP: 'Trưởng bộ phận xác nhận',
    KCS_CONG_DOAN: 'KCS hoàn tất',
    TBP_CONG_DOAN: 'Trưởng bộ phận duyệt'
};

const sxbtFields = {
    SxbtKcsCompletedAt: { key: 'SXBT_KCS_COMPLETED', label: 'KCS hoàn tất kiểm tra', by: 'SxbtKcsCompletedBy', status: 'DA_HOAN_TAT' },
    SxbtKhoConfirmedAt: { key: 'SXBT_KHO_CONFIRMED', label: 'Kho xác nhận', by: 'SxbtKhoConfirmedBy', status: 'DA_XAC_NHAN' },
    SxbtConfirmedAt: { key: 'SXBT_CONFIRMED', label: 'Đơn vị SXBT xác nhận', by: 'SxbtConfirmedBy', status: 'DA_XAC_NHAN' },
    SxbtKhoBypassedAt: { key: 'SXBT_KHO_BYPASSED', label: 'Bỏ qua xác nhận Kho', by: 'SxbtKhoBypassedBy', status: 'BO_QUA' }
};

const validDate = (value) => {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const loadInspectionApprovalHistoryMap = async (executor, phieuKiemIds) => {
    const ids = normalizeIds(phieuKiemIds);
    const map = new Map(ids.map((id) => [id, []]));
    if (!ids.length) return map;

    const request = new sql.Request(executor)
        .input('IdsJson', sql.NVarChar(sql.MAX), JSON.stringify(ids));
    const result = await request.query(`
        SELECT confirmation.Id, confirmation.PhieuKiemId, confirmation.NguoiXacNhanId,
            confirmation.VaiTro, confirmation.TrangThai, confirmation.NoiDung,
            confirmation.ThoiGian,
            COALESCE(NULLIF(actor.FullName,N''),actor.Username) AS ActorName,
            actor.BoPhanId, department.MaBoPhan, department.TenBoPhan
        FROM dbo.PHIEU_KIEM_XAC_NHAN confirmation
        LEFT JOIN dbo.USERS actor ON actor.Id=confirmation.NguoiXacNhanId
        LEFT JOIN dbo.DM_BO_PHAN department ON department.Id=actor.BoPhanId
        WHERE confirmation.PhieuKiemId IN (
            SELECT TRY_CONVERT(int,[value]) FROM OPENJSON(@IdsJson)
        );

        SELECT customField.PhieuKiemId, customField.FieldName, customField.FieldValue
        FROM dbo.PhieuKiem_CustomFields customField
        WHERE customField.PhieuKiemId IN (
            SELECT TRY_CONVERT(int,[value]) FROM OPENJSON(@IdsJson)
        ) AND customField.FieldName IN (
            N'SxbtKcsCompletedAt',N'SxbtKcsCompletedBy',
            N'SxbtKhoConfirmedAt',N'SxbtKhoConfirmedBy',
            N'SxbtConfirmedAt',N'SxbtConfirmedBy',
            N'SxbtKhoBypassedAt',N'SxbtKhoBypassedBy'
        );

        ;WITH latest_lot_confirmation AS (
            SELECT item.PhieuKiemId, lot.KhoXacNhanBy, lot.KhoXacNhanAt,
                ROW_NUMBER() OVER (
                    PARTITION BY item.PhieuKiemId
                    ORDER BY lot.KhoXacNhanAt DESC, lot.Id DESC
                ) AS rn
            FROM dbo.PHIEU_KIEM_BTP_ITEM_LOT lot
            INNER JOIN dbo.PHIEU_KIEM_BTP_ITEM item ON item.Id=lot.BtpItemId
            WHERE item.PhieuKiemId IN (
                SELECT TRY_CONVERT(int,[value]) FROM OPENJSON(@IdsJson)
            ) AND lot.KhoXacNhanAt IS NOT NULL
        )
        SELECT latest.PhieuKiemId, latest.KhoXacNhanBy, latest.KhoXacNhanAt,
            COALESCE(NULLIF(actor.FullName,N''),actor.Username) AS ActorName,
            actor.BoPhanId, department.MaBoPhan, department.TenBoPhan
        FROM latest_lot_confirmation latest
        LEFT JOIN dbo.USERS actor ON actor.Id=latest.KhoXacNhanBy
        LEFT JOIN dbo.DM_BO_PHAN department ON department.Id=actor.BoPhanId
        WHERE latest.rn=1;
    `);

    for (const row of result.recordsets?.[0] || []) {
        if (!validDate(row.ThoiGian)) continue;
        const role = String(row.VaiTro || '').toUpperCase();
        map.get(Number(row.PhieuKiemId))?.push({
            eventKey: `CONFIRMATION_${row.Id}`,
            label: roleLabels[role] || row.VaiTro || 'Xác nhận phiếu',
            role: row.VaiTro || null,
            status: row.TrangThai || null,
            actorId: row.NguoiXacNhanId || null,
            actorName: row.ActorName || null,
            departmentId: row.BoPhanId || null,
            departmentCode: row.MaBoPhan || null,
            departmentName: row.TenBoPhan || null,
            occurredAt: row.ThoiGian,
            note: row.NoiDung || null,
            source: 'PHIEU_KIEM_XAC_NHAN'
        });
    }

    const customFieldsById = new Map();
    for (const row of result.recordsets?.[1] || []) {
        const id = Number(row.PhieuKiemId);
        if (!customFieldsById.has(id)) customFieldsById.set(id, {});
        customFieldsById.get(id)[row.FieldName] = row.FieldValue;
    }
    const actorIds = [...new Set([...customFieldsById.values()].flatMap((fields) =>
        Object.values(sxbtFields).map((definition) => Number(fields[definition.by] || 0)).filter(Boolean)
    ))];
    let actorMap = new Map();
    if (actorIds.length) {
        const actors = await new sql.Request(executor)
            .input('ActorIdsJson', sql.NVarChar(sql.MAX), JSON.stringify(actorIds))
            .query(`
                SELECT actor.Id, COALESCE(NULLIF(actor.FullName,N''),actor.Username) AS ActorName,
                    actor.BoPhanId, department.MaBoPhan, department.TenBoPhan
                FROM dbo.USERS actor
                LEFT JOIN dbo.DM_BO_PHAN department ON department.Id=actor.BoPhanId
                WHERE actor.Id IN (SELECT TRY_CONVERT(int,[value]) FROM OPENJSON(@ActorIdsJson))
            `);
        actorMap = new Map((actors.recordset || []).map((actor) => [Number(actor.Id), actor]));
    }

    for (const [id, fields] of customFieldsById) {
        for (const [atField, definition] of Object.entries(sxbtFields)) {
            if (!validDate(fields[atField])) continue;
            const actorId = Number(fields[definition.by] || 0) || null;
            const actor = actorMap.get(actorId) || {};
            map.get(id)?.push({
                eventKey: definition.key,
                label: definition.label,
                role: definition.key,
                status: definition.status,
                actorId,
                actorName: actor.ActorName || null,
                departmentId: actor.BoPhanId || null,
                departmentCode: actor.MaBoPhan || null,
                departmentName: actor.TenBoPhan || null,
                occurredAt: fields[atField],
                note: null,
                source: 'PHIEU_KIEM_CUSTOM_FIELD'
            });
        }
    }

    for (const row of result.recordsets?.[2] || []) {
        const id = Number(row.PhieuKiemId);
        const hasCustomKho = (map.get(id) || []).some((event) => event.eventKey === 'SXBT_KHO_CONFIRMED');
        if (hasCustomKho || !validDate(row.KhoXacNhanAt)) continue;
        map.get(id)?.push({
            eventKey: 'SXBT_KHO_CONFIRMED_LEGACY',
            label: 'Kho xác nhận',
            role: 'SXBT_KHO_CONFIRMED',
            status: 'DA_XAC_NHAN',
            actorId: row.KhoXacNhanBy || null,
            actorName: row.ActorName || null,
            departmentId: row.BoPhanId || null,
            departmentCode: row.MaBoPhan || null,
            departmentName: row.TenBoPhan || null,
            occurredAt: row.KhoXacNhanAt,
            note: null,
            source: 'PHIEU_KIEM_BTP_ITEM_LOT'
        });
    }

    for (const [id, history] of map) {
        map.set(id, history.sort((left, right) =>
            validDate(left.occurredAt).getTime() - validDate(right.occurredAt).getTime()
        ));
    }
    return map;
};

const attachApprovalSummaries = async (executor, rows = []) => {
    const historyMap = await loadInspectionApprovalHistoryMap(executor, rows.map((row) => row.Id));
    return rows.map((row) => {
        const history = historyMap.get(Number(row.Id)) || [];
        const latest = history[history.length - 1];
        return {
            ...row,
            LatestApprovalAt: latest?.occurredAt || null,
            LatestApprovalLabel: latest?.label || null,
            LatestApprovalBy: latest?.actorName || null,
            ApprovalCount: history.length
        };
    });
};

module.exports = { loadInspectionApprovalHistoryMap, attachApprovalSummaries };
