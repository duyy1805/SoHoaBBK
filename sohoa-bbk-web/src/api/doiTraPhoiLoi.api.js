import axiosClient from './axiosClient';

export const searchDoiTraProductionPlans = (params = {}) =>
    axiosClient.get('/doi-tra-phoi-loi/plans', { params });

export const getDoiTraProductionPlanDetail = (planSelectKey) =>
    axiosClient.get('/doi-tra-phoi-loi/plans/detail', { params: { planSelectKey } });

export const getDoiTraPhoiLoiList = (params = {}) =>
    axiosClient.get('/doi-tra-phoi-loi', { params });

export const createDoiTraPhoiLoi = (planSelectKey) =>
    axiosClient.post('/doi-tra-phoi-loi', { planSelectKey });

export const getDoiTraPhoiLoiDetail = (id) =>
    axiosClient.get(`/doi-tra-phoi-loi/${id}`);

export const cancelDoiTraPhoiLoi = (id, rowVersion) =>
    axiosClient.post(`/doi-tra-phoi-loi/${id}/cancel`, { rowVersion });

export const deleteDoiTraPhoiLoi = (id) =>
    axiosClient.delete(`/doi-tra-phoi-loi/${id}`);

export const getDoiTraDefectGroups = () =>
    axiosClient.get('/doi-tra-phoi-loi/defect-groups');

export const getDoiTraPhoiOptions = (id) =>
    axiosClient.get(`/doi-tra-phoi-loi/${id}/phoi-options`);

export const saveDoiTraPhoi = (id, rowVersion, items) =>
    axiosClient.put(`/doi-tra-phoi-loi/${id}/phoi`, { rowVersion, items });

export const saveDoiTraDinhMuc = (id, rowVersion, items) =>
    axiosClient.put(`/doi-tra-phoi-loi/${id}/dinh-muc`, { rowVersion, items });

export const executeDoiTraAction = (id, actionCode, data) =>
    axiosClient.post(`/doi-tra-phoi-loi/${id}/actions/${actionCode}`, data);

export const confirmDoiTraDinhMuc = (id, rowVersion) =>
    axiosClient.post(`/doi-tra-phoi-loi/${id}/dinh-muc/confirm`, { rowVersion });

export const getDoiTraKph = (id) => axiosClient.get(`/doi-tra-phoi-loi/${id}/kph`);
export const saveDoiTraKphDepartments = (id, rowVersion, boPhanIds) =>
    axiosClient.put(`/doi-tra-phoi-loi/${id}/kph/opinion-departments`, { rowVersion, boPhanIds });
export const addDoiTraKphSection = (id, section, data) =>
    axiosClient.post(`/doi-tra-phoi-loi/${id}/kph/sections/${section}`, data);
export const updateDoiTraKphSection = (id, section, rowId, data) =>
    axiosClient.patch(`/doi-tra-phoi-loi/${id}/kph/sections/${section}/${rowId}`, data);
export const deleteDoiTraKphSection = (id, section, rowId) =>
    axiosClient.delete(`/doi-tra-phoi-loi/${id}/kph/sections/${section}/${rowId}`);
export const saveDoiTraKphOpinion = (id, opinionId, noiDung) =>
    axiosClient.put(`/doi-tra-phoi-loi/${id}/kph/opinions/${opinionId}/draft`, { noiDung });
export const confirmDoiTraKphOpinion = (id, opinionId) =>
    axiosClient.post(`/doi-tra-phoi-loi/${id}/kph/opinions/${opinionId}/confirm`);
export const returnDoiTraKphOpinion = (id, opinionId, reason) =>
    axiosClient.post(`/doi-tra-phoi-loi/${id}/kph/opinions/${opinionId}/return`, { reason });
export const confirmDoiTraKphCreator = (id) => axiosClient.post(`/doi-tra-phoi-loi/${id}/kph/creator-confirm`);
export const approveDoiTraKphExecutive = (id, decision, reason) =>
    axiosClient.post(`/doi-tra-phoi-loi/${id}/kph/executive-approval`, { decision, reason });
export const followUpDoiTraKph = (id, data) => axiosClient.post(`/doi-tra-phoi-loi/${id}/kph/follow-up`, data);

export const getDoiTraDefectGroupManagement = () =>
    axiosClient.get('/doi-tra-phoi-loi/defect-groups/manage');

export const createDoiTraDefectGroup = (data) =>
    axiosClient.post('/doi-tra-phoi-loi/defect-groups', data);

export const updateDoiTraDefectGroup = (id, data) =>
    axiosClient.put(`/doi-tra-phoi-loi/defect-groups/${id}`, data);

export const getDoiTraTraceabilityLookups = () =>
    axiosClient.get('/doi-tra-phoi-loi/traceability-lookups');

export const previewDoiTraSummary = (phieuIds) =>
    axiosClient.post('/doi-tra-phoi-loi/summary-preview', { phieuIds });
