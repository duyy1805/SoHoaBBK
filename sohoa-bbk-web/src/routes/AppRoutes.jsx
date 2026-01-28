import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '../components/Layout/AppLayout';
import Login from '../pages/Login';
import PhieuKiemList from '../pages/PhieuKiem/PhieuKiemList';
import PhieuKiemDetail from '../pages/PhieuKiem/PhieuKiemDetail';

export default function AppRoutes() {
    return (
        <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />

            {/* Protected */}
            <Route element={<AppLayout />}>
                <Route path="/phieu-kiem" element={<PhieuKiemList />} />
                <Route path="/phieu-kiem/:id" element={<PhieuKiemDetail />} />
            </Route>

            <Route path="*" element={<Navigate to="/phieu-kiem" />} />
        </Routes>
    );
}
