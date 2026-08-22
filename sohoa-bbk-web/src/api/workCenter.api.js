import axiosClient from "./axiosClient";

export const getWorkCenter = () => axiosClient.get("/work-center", { timeout: 30000 });

export const getWorkCenterDetail = (record) => {
    if (record.recordSource === "KPH_STANDALONE") {
        return axiosClient.get(`/phieu-xu-ly-khong-phu-hop/${record.bienBanId}`);
    }
    if (record.recordType === "SXBT") {
        return axiosClient.get(`/bien-ban-sxbt/${record.bienBanId}`);
    }
    return axiosClient.get(`/bien-ban/${record.bienBanId}`);
};
