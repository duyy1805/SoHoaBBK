import axiosClient from "./axiosClient";

export const getDashboardOverview = (params = {}) => {
    return axiosClient.get("/dashboard/overview", { params });
};
