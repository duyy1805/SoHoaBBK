const test = require('node:test');
const assert = require('node:assert/strict');
const {
    canB7Work, statusAfterB7Confirm, statusAfterKphCompletion
} = require('../utils/doiTraParallelWorkflow');

test('B7 hoàn tất trước không làm thay đổi trạng thái KPH', () => {
    assert.equal(statusAfterB7Confirm('CHO_Y_KIEN_KPH'), 'CHO_Y_KIEN_KPH');
    assert.equal(statusAfterKphCompletion('DA_XAC_NHAN'), 'HOAN_TAT');
});

test('KPH hoàn tất trước phải chờ B7', () => {
    assert.equal(statusAfterKphCompletion('DANG_NHAP'), 'KPH_HOAN_TAT_CHO_B7');
    assert.equal(statusAfterB7Confirm('KPH_HOAN_TAT_CHO_B7'), 'HOAN_TAT');
});

test('B7 chỉ làm việc sau khi workflow sẵn sàng và trước khi đã tạo LXVT', () => {
    assert.equal(canB7Work({ status: 'CHO_CAC_KE_HOACH_KCS', workflowReadyAt: new Date(), dinhMucStatus: 'CHUA_NHAP' }), true);
    assert.equal(canB7Work({ status: 'CHO_THIET_LAP_KPH', workflowReadyAt: new Date(), dinhMucStatus: 'CHUA_NHAP' }), true);
    assert.equal(canB7Work({ status: 'CHO_Y_KIEN_KPH', workflowReadyAt: null, dinhMucStatus: 'CHUA_NHAP' }), false);
    assert.equal(canB7Work({ status: 'CHO_THEO_DOI', workflowReadyAt: new Date(), dinhMucStatus: 'DA_XAC_NHAN' }), false);
    assert.equal(canB7Work({ status: 'CHO_THEO_DOI', workflowReadyAt: new Date(), dinhMucStatus: 'DANG_NHAP', hasActiveIssue: true }), false);
});
