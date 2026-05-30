import axiosClient from "./axiosClient";

export const getDashboardOverview = () => {
    return axiosClient.get("/dashboard/overview");
};

