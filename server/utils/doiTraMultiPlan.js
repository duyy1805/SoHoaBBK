const cleanKey = (value) => String(value ?? '').trim();

const normalizePlanSelectKeys = (planSelectKeys, planSelectKey) => {
    const input = Array.isArray(planSelectKeys) ? planSelectKeys : [planSelectKey];
    const keys = [...new Set(input.map(cleanKey).filter(Boolean))];
    if (!keys.length || keys.some((key) => key.length > 300)) return [];
    return keys;
};

const childTicketNumber = (batchNumber, index, count) => count === 1
    ? batchNumber : `${batchNumber}-${String(index + 1).padStart(2, '0')}`;

module.exports = { normalizePlanSelectKeys, childTicketNumber };
