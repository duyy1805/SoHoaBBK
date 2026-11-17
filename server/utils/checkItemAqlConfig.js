const SUPPORTED_CUSTOMERS = new Set(['IKEA', 'DEK']);

const normalizeAqlConfigKey = (value) => String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('vi-VN');

const normalizeAqlCustomer = (value) => {
    const customer = String(value ?? '').trim().toUpperCase();
    return SUPPORTED_CUSTOMERS.has(customer) ? customer : null;
};

const normalizeAqlCustomers = (values) => {
    const source = Array.isArray(values) ? values : [values];
    return [...new Set(source.map(normalizeAqlCustomer).filter(Boolean))];
};

module.exports = {
    SUPPORTED_CUSTOMERS,
    normalizeAqlConfigKey,
    normalizeAqlCustomer,
    normalizeAqlCustomers
};
