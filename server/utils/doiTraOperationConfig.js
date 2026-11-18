const booleanValue = (value) => value === true || value === 1 || value === '1';

const normalizeDoiTraOperationConfig = (value = {}) => {
    const selectionMode = String(value.selectionMode || '').trim().toUpperCase();
    if (!['COMPONENT', 'PREVIOUS_STAGE_BTP'].includes(selectionMode)) {
        return { error: 'Chế độ chọn phôi không hợp lệ' };
    }

    let btpSuffix = String(value.btpSuffix || '').trim().replace(/^\.+/, '').toUpperCase();
    if (selectionMode === 'COMPONENT') btpSuffix = '';
    if (selectionMode === 'PREVIOUS_STAGE_BTP'
        && (!btpSuffix || btpSuffix.length > 20 || !/^[A-Z0-9_-]+$/.test(btpSuffix))) {
        return { error: 'Hậu tố BTP phải gồm 1-20 ký tự chữ, số, gạch ngang hoặc gạch dưới' };
    }

    return {
        selectionMode,
        btpSuffix: btpSuffix || null,
        requiresB7: booleanValue(value.requiresB7),
        requireLenhXuatVatTu: booleanValue(value.requireLenhXuatVatTu),
        isActive: booleanValue(value.isActive)
    };
};

module.exports = { normalizeDoiTraOperationConfig };
