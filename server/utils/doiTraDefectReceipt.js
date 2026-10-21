const isValidDefectReceiptQuantity = (value, planQuantity) => {
    const quantity = Number(value);
    const limit = Number(planQuantity);
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity >= 1e14) return false;
    if (Math.abs(quantity * 100 - Math.round(quantity * 100)) > 1e-8) return false;
    return Number.isFinite(limit) && limit > 0 && quantity <= limit;
};

const normalizeOperationCode = (value) => String(value || '').trim().toUpperCase();

const isOperationSnapshotCompatible = (snapshotCode, currentCode) => {
    const snapshot = normalizeOperationCode(snapshotCode);
    const current = normalizeOperationCode(currentCode);
    return Boolean(snapshot && current && snapshot === current);
};

module.exports = {
    isValidDefectReceiptQuantity,
    isOperationSnapshotCompatible,
    normalizeOperationCode
};
