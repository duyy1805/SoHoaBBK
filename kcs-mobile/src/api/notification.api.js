import axiosClient from "./axiosClient";

export const getNotifications = () => axiosClient.get("/notifications");
export const markAsRead = (id) => axiosClient.post(`/notifications/${id}/read`);
export const markAllAsRead = () => axiosClient.post("/notifications/read-all");
export const savePushToken = (token) => axiosClient.post("/auth/save-push-token", { token });
export const removePushToken = (token) => axiosClient.post("/auth/remove-push-token", { token });