const test = require('node:test');
const assert = require('node:assert/strict');
const {
    statusAfterKphCompletionForPlan,
    statusAfterWarehouseConfirm
} = require('../utils/doiTraParallelWorkflow');
const { normalizeDoiTraOperationConfig } = require('../utils/doiTraOperationConfig');

test('Bao gói hoàn tất KPH trước thì chờ Kho xác nhận', () => {
    assert.equal(statusAfterKphCompletionForPlan({
        requiresB7: false,
        dinhMucStatus: 'KHONG_AP_DUNG',
        warehouseConfirmed: false
    }), 'KPH_HOAN_TAT_CHO_KHO');
    assert.equal(statusAfterWarehouseConfirm({
        requiresB7: false,
        currentStatus: 'KPH_HOAN_TAT_CHO_KHO'
    }), 'HOAN_TAT');
});

test('Bao gói Kho xác nhận trước thì hoàn tất ngay khi KPH kết thúc', () => {
    assert.equal(statusAfterWarehouseConfirm({
        requiresB7: false,
        currentStatus: 'CHO_Y_KIEN_KPH'
    }), 'CHO_Y_KIEN_KPH');
    assert.equal(statusAfterKphCompletionForPlan({
        requiresB7: false,
        dinhMucStatus: 'KHONG_AP_DUNG',
        warehouseConfirmed: true
    }), 'HOAN_TAT');
});

test('Công đoạn thường vẫn hoàn tất theo KPH và B7', () => {
    assert.equal(statusAfterKphCompletionForPlan({
        requiresB7: true,
        dinhMucStatus: 'CHUA_NHAP',
        warehouseConfirmed: true
    }), 'KPH_HOAN_TAT_CHO_B7');
});

test('chuẩn hóa cấu hình chọn BTP công đoạn trước', () => {
    assert.deepEqual(normalizeDoiTraOperationConfig({
        selectionMode: 'previous_stage_btp', btpSuffix: '.m', requiresB7: false,
        requireLenhXuatVatTu: false, isActive: true
    }), {
        selectionMode: 'PREVIOUS_STAGE_BTP', btpSuffix: 'M', requiresB7: false,
        requireLenhXuatVatTu: false, isActive: true
    });
    assert.ok(normalizeDoiTraOperationConfig({
        selectionMode: 'PREVIOUS_STAGE_BTP', btpSuffix: ''
    }).error);
});
