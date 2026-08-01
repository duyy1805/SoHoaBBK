const normalizeText = (value) => String(value ?? '').trim().toUpperCase();

const isNumericPackingMethod = (value) => /^\d+$/.test(String(value ?? '').trim());

const getClosingScheduleCustomer = ({ invoiceNo, packingMethod } = {}) => {
    const normalizedInvoiceNo = normalizeText(invoiceNo);

    if (normalizedInvoiceNo.includes('ECIS')) {
        return 'IKEA';
    }

    if (normalizedInvoiceNo.includes('DC')) {
        return 'DEK';
    }

    // PackingMethod dạng một dãy số là dấu hiệu dự phòng của lịch DEK.
    if (isNumericPackingMethod(packingMethod)) {
        return 'DEK';
    }

    return null;
};

const attachClosingScheduleCustomer = (row = {}) => ({
    ...row,
    KhachHang: getClosingScheduleCustomer({
        invoiceNo: row.InvoiceNo,
        packingMethod: row.PackingMethod
    })
});

module.exports = {
    getClosingScheduleCustomer,
    attachClosingScheduleCustomer,
    isNumericPackingMethod
};
