const test = require('node:test');
const assert = require('node:assert/strict');

const {
    normalizeAqlConfigKey,
    normalizeAqlCustomer,
    normalizeAqlCustomers
} = require('./utils/checkItemAqlConfig');

test('normalizeAqlConfigKey trims, collapses whitespace and normalizes case', () => {
    assert.equal(normalizeAqlConfigKey('  Sản   phẩm\n'), 'sản phẩm');
    assert.equal(normalizeAqlConfigKey('RFID'), 'rfid');
});

test('customer normalization accepts only IKEA and DEK', () => {
    assert.equal(normalizeAqlCustomer(' dek '), 'DEK');
    assert.equal(normalizeAqlCustomer('Ikea'), 'IKEA');
    assert.equal(normalizeAqlCustomer('OTHER'), null);
    assert.deepEqual(normalizeAqlCustomers(['dek', 'IKEA', 'DEK', 'other']), ['DEK', 'IKEA']);
});
