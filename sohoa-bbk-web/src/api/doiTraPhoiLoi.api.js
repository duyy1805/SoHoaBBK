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

export const getDoiTraDefectGroups = () =>
    axiosClient.get('/doi-tra-phoi-loi/defect-groups');

export const getDoiTraPhoiOptions = (id) =>
    axiosClient.get(`/doi-tra-phoi-loi/${id}/phoi-options`);

export const saveDoiTraPhoi = (id, rowVersion, items) =>
    axiosClient.put(`/doi-tra-phoi-loi/${id}/phoi`, { rowVersion, items });

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
