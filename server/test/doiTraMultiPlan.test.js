const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizePlanSelectKeys, childTicketNumber } = require('../utils/doiTraMultiPlan');

test('chuẩn hóa và loại trùng kế hoạch trong phiếu nhóm', () => {
    assert.deepEqual(normalizePlanSelectKeys([' A ', 'B', 'A']), ['A', 'B']);
    assert.deepEqual(normalizePlanSelectKeys([], null), []);
    assert.equal(normalizePlanSelectKeys(Array.from({ length: 25 }, (_, index) => `P${index}`), null).length, 25);
    assert.deepEqual(normalizePlanSelectKeys(['X'.repeat(301)], null), []);
});

test('cấp số nội bộ riêng cho từng kế hoạch con', () => {
    assert.equal(childTicketNumber('DTP-261118-001', 0, 1), 'DTP-261118-001');
    assert.equal(childTicketNumber('DTP-261118-002', 0, 2), 'DTP-261118-002-01');
    assert.equal(childTicketNumber('DTP-261118-002', 1, 2), 'DTP-261118-002-02');
});
