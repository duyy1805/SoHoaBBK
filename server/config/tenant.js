const TENANTS = Object.freeze({ Z76: 'Z76', PLP: 'PLP' });
const allowedInspectionTypeIds = new Set([3, 6]);

const tenantOf = (req) => String(req?.tenant || 'Z76').toUpperCase() === 'PLP' ? TENANTS.PLP : TENANTS.Z76;
const isPlpRequest = (req) => tenantOf(req) === TENANTS.PLP;
const getTenantConfig = (req) => {
    const tenant = tenantOf(req);
    const isPlp = tenant === TENANTS.PLP;
    return {
        tenant,
        isPlp,
        allowedInspectionTypeIds: isPlp ? allowedInspectionTypeIds : null,
        unitCode: isPlp ? (process.env.PLP_UNIT_CODE || 'PHAT_LONG_PHUOC') : 'Z76',
        unitId: isPlp ? (process.env.PLP_UNIT_ID || '1') : null,
        unitName: isPlp ? (process.env.PLP_UNIT_NAME || 'Xí nghiệp 76.1') : '',
        displayName: isPlp ? 'Phat Long Phuoc' : 'Z76'
    };
};

module.exports = { TENANTS, allowedInspectionTypeIds, tenantOf, isPlpRequest, getTenantConfig };
