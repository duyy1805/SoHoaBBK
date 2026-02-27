// src/api/auth.api.js

import axiosClient from "./axiosClient";

export const loginApi = (data) => {
    return axiosClient.post("/auth/login", data);
};