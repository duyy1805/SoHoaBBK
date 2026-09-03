const test = require("node:test");
const assert = require("node:assert/strict");

const {
    canActAsExecutive,
    getExecutiveNextStatus,
    isExecutiveApprovalTarget,
    normalizeExecutiveDecision
} = require("../utils/executiveApproval");

test("chỉ ADMIN hoặc người có permission Ban giám đốc được xử lý", () => {
    assert.equal(canActAsExecutive({ roles: ["ADMIN"], permissions: [] }), true);
    assert.equal(canActAsExecutive({ roles: ["LANH_DAO"], permissions: ["XAC_NHAN_BAN_GIAM_DOC"] }), true);
    assert.equal(canActAsExecutive({ roles: ["LANH_DAO"], permissions: [] }), false);
});

test("chuẩn hóa quyết định và trạng thái kế tiếp", () => {
    assert.equal(normalizeExecutiveDecision(" approve "), "APPROVE");
    assert.equal(normalizeExecutiveDecision("return"), "RETURN");
    assert.equal(normalizeExecutiveDecision("reject"), null);
    assert.equal(getExecutiveNextStatus("APPROVE"), "CHO_THEO_DOI");
    assert.equal(getExecutiveNextStatus("RETURN"), "TRA_LAI_CHINH_SUA");
});

test("chỉ hồ sơ V01 không phải SXBT đã chụp cấu hình mới cần duyệt", () => {
    assert.equal(isExecutiveApprovalTarget({
        MauPhieuVersion: "V01", LoaiBienBan: "GENERAL", RequiresExecutiveApproval: true
    }), true);
    assert.equal(isExecutiveApprovalTarget({
        MauPhieuVersion: "V01", LoaiBienBan: "STANDALONE", RequiresExecutiveApproval: true
    }), true);
    assert.equal(isExecutiveApprovalTarget({
        MauPhieuVersion: "V01", LoaiBienBan: "SXBT", RequiresExecutiveApproval: true
    }), false);
    assert.equal(isExecutiveApprovalTarget({
        MauPhieuVersion: "V00", LoaiBienBan: "GENERAL", RequiresExecutiveApproval: true
    }), false);
});
