const test = require('node:test');
const assert = require('node:assert/strict');
const { canFinalizeKph } = require('../utils/kphCompletionAccess');

const standalone = { NguoiLapId: 10, LoaiBienBan: 'STANDALONE' };
const inspectionRecord = { NguoiLapId: 10, LoaiBienBan: 'THUONG' };

test('người tạo, trưởng bộ phận và ADMIN được hoàn tất KPH', () => {
    assert.equal(canFinalizeKph({ user: { userId: 10 }, record: standalone }), true);
    assert.equal(canFinalizeKph({ user: { userId: 20 }, record: standalone, isCreatorDepartmentLead: true }), true);
    assert.equal(canFinalizeKph({ user: { userId: 20, roles: ['ADMIN'] }, record: standalone }), true);
});

test('KET_LUAN chỉ thay thế quyền hoàn tất cho phiếu KPH độc lập', () => {
    const user = { userId: 20, permissions: ['KET_LUAN'] };
    assert.equal(canFinalizeKph({ user, record: standalone }), true);
    assert.equal(canFinalizeKph({ user, record: inspectionRecord }), false);
});

test('người ngoài các nhóm được phép không thể hoàn tất', () => {
    assert.equal(canFinalizeKph({ user: { userId: 20, roles: [], permissions: [] }, record: standalone }), false);
});
