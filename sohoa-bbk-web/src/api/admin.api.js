import axiosClient from "./axiosClient";

export const getUserAdminMetadata = () => axiosClient.get("/admin/metadata");

export const getManagedUsers = (params) => axiosClient.get("/admin/users", { params });
export const getManagedUser = (id) => axiosClient.get(`/admin/users/${id}`);
export const createManagedUser = (data) => axiosClient.post("/admin/users", data);
export const updateManagedUser = (id, data) => axiosClient.put(`/admin/users/${id}`, data);
export const changeManagedUserStatus = (id, trangThai, rowVersion) =>
    axiosClient.patch(`/admin/users/${id}/status`, { trangThai, rowVersion });
export const resetManagedUserPassword = (id, password, rowVersion) =>
    axiosClient.post(`/admin/users/${id}/reset-password`, { password, rowVersion });
export const uploadManagedUserSignature = (id, file) => {
    const formData = new FormData();
    formData.append("signature", file);
    return axiosClient.post(`/admin/users/${id}/signature`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
    });
};
export const deleteManagedUserSignature = (id) =>
    axiosClient.delete(`/admin/users/${id}/signature`);

export const getManagedRoles = () => axiosClient.get("/admin/roles");
export const createManagedRole = (data) => axiosClient.post("/admin/roles", data);
export const updateManagedRole = (id, roleName, rowVersion) =>
    axiosClient.put(`/admin/roles/${id}`, { roleName, rowVersion });
export const changeManagedRoleStatus = (id, trangThai, rowVersion) =>
    axiosClient.patch(`/admin/roles/${id}/status`, { trangThai, rowVersion });
export const updateManagedRolePermissions = (id, permissionIds, rowVersion) =>
    axiosClient.put(`/admin/roles/${id}/permissions`, { permissionIds, rowVersion });

export const getWorkflowSettings = () => axiosClient.get("/admin/settings/workflow");
export const updateWorkflowSettings = (requireExecutiveApprovalForKph, rowVersion) =>
    axiosClient.put("/admin/settings/workflow", { requireExecutiveApprovalForKph, rowVersion });
