const sql = require('mssql');

const loadDefectFlowRecordsets = async (executor, filters = {}, includeAllDetails = false) => {
    const result = await new sql.Request(executor)
        .input('FromDate', sql.Date, filters.fromDate || null)
        .input('ToDate', sql.Date, filters.toDate || null)
        .input('UnitId', sql.SmallInt, filters.unitId || null)
        .input('DepartmentId', sql.SmallInt, filters.departmentId || null)
        .input('PlanId', sql.Int, filters.planId || null)
        .input('OrderId', sql.Int, filters.orderId || null)
        .input('WarehouseId', sql.SmallInt, filters.warehouseId || null)
        .input('Keyword', sql.NVarChar(200), filters.keyword || null)
        .input('Page', sql.Int, filters.page || 1)
        .input('PageSize', sql.Int, filters.pageSize || 50)
        .input('IncludeAllDetails', sql.Bit, includeAllDetails)
        .execute('sp_DTPL_BaoCaoNhapXuatLoi');
    return result.recordsets || [];
};

module.exports = { loadDefectFlowRecordsets };
