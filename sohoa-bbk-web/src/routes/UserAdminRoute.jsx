import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { canManageUsers } from "../utils/auth";

export default function UserAdminRoute() {
    const navigate = useNavigate();
    const allowed = canManageUsers();

    useEffect(() => {
        if (!allowed) {
            window.alert("Bạn không có quyền quản trị người dùng.");
            navigate("/dashboard", { replace: true });
        }
    }, [allowed, navigate]);

    return allowed ? <Outlet /> : null;
}
