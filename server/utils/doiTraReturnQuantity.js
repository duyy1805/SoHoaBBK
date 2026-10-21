const isValidReturnQuantity = (value) => Number.isFinite(value)
    && value > 0
    && value < 1e15
    && Math.abs(value * 1000 - Math.round(value * 1000)) <= 1e-7;

const groupMaterialsByWarehouse = (materials = []) => {
    const groups = new Map();
    materials.forEach((item) => {
        const warehouseId = Number(item.SourceKhoXuatId);
        if (!groups.has(warehouseId)) groups.set(warehouseId, []);
        groups.get(warehouseId).push(item);
    });
    return groups;
};

module.exports = { isValidReturnQuantity, groupMaterialsByWarehouse };
