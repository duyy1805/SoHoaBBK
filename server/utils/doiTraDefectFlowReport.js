const GROUP_TYPES = ['COUNTERPARTY', 'WAREHOUSE', 'PLAN', 'ORDER', 'PRODUCT'];
const FLOW_TYPES = ['PRODUCTION_WAREHOUSE', 'WAREHOUSE_CUTTING'];

const normalizeGroupType = (value) => {
    const normalized = String(value || '').trim().toUpperCase();
    return GROUP_TYPES.includes(normalized) ? normalized : 'COUNTERPARTY';
};

const negativeWarnings = (rows = [], scope) => rows
    .filter((item) => Number(item.ClosingBalance || 0) < 0)
    .map((item) => ({
        code: scope === 'TOTAL' ? 'NEGATIVE_FLOW_BALANCE' : 'NEGATIVE_GROUP_BALANCE',
        scope,
        flowType: item.FlowType,
        groupType: item.GroupType,
        groupKey: item.GroupKey,
        groupLabel: item.GroupLabel,
        uomId: item.UomId,
        uomName: item.UomName,
        value: Number(item.ClosingBalance || 0),
        message: `${item.GroupLabel || (item.FlowType === 'PRODUCTION_WAREHOUSE' ? 'Luồng sản xuất – kho' : 'Luồng kho – đơn vị cắt')} có chênh lệch cuối kỳ âm (${item.UomName || 'chưa xác định ĐVT'}).`
    }));

const buildDefectFlowReport = (recordsets = [], options = {}) => {
    const groupBy = normalizeGroupType(options.groupBy);
    const flowTotals = recordsets[1] || [];
    const allGroups = recordsets[2] || [];
    const selectedGroups = allGroups.filter((item) => String(item.GroupType || '').toUpperCase() === groupBy);
    const flowData = (flowType) => ({
        totals: flowTotals.filter((item) => item.FlowType === flowType),
        groups: selectedGroups.filter((item) => item.FlowType === flowType)
    });

    return {
        meta: { ...(recordsets[0]?.[0] || {}), GroupBy: groupBy },
        flows: {
            production: flowData('PRODUCTION_WAREHOUSE'),
            cutting: flowData('WAREHOUSE_CUTTING')
        },
        flowTotals,
        groups: selectedGroups,
        allGroups,
        warehouseReconciliation: recordsets[3] || [],
        trend: recordsets[4] || [],
        details: recordsets[5] || [],
        pagination: recordsets[6]?.[0] || { Page: 1, PageSize: 50, TotalRows: 0, TotalPages: 0 },
        filterOptions: {
            units: recordsets[7] || [],
            departments: recordsets[8] || [],
            plans: recordsets[9] || [],
            orders: recordsets[10] || [],
            warehouses: recordsets[11] || []
        },
        warnings: [
            ...negativeWarnings(flowTotals, 'TOTAL'),
            ...negativeWarnings(selectedGroups, groupBy)
        ]
    };
};

module.exports = {
    GROUP_TYPES,
    FLOW_TYPES,
    normalizeGroupType,
    buildDefectFlowReport
};
