import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '../components/Layout/AppLayout';
import Login from '../features/Login';
import PhieuKiemList from '../features/PhieuKiem/pages/PhieuKiemList';
import PhieuKiemDetail from '../features/PhieuKiem/pages/PhieuKiemDetail';
import PhieuKiemCreate from '../features/PhieuKiem/pages/PhieuKiemCreate';
import ProtectedRoute from './ProtectedRoute';
import DanhMucManager from '../features/DanhMuc/DanhMucManager'
import BienBanDetail from '../features/BienBan/BienBanDetail';
import BienBanList from '../features/BienBan/BienBanList';

export default function AppRoutes() {
    return (
        <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />

            {/* Protected */}
            <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                    <Route path="/phieu-kiem" element={<PhieuKiemList />} />
                    <Route path="/phieu-kiem/:id" element={<PhieuKiemDetail />} />
                    <Route path="/phieu-kiem/create" element={<PhieuKiemCreate />} />
                    <Route path="/danh-muc" element={<DanhMucManager />} />
                    <Route path="/bien-ban" element={<BienBanList />} />
                    <Route path="/bien-ban/:id" element={<BienBanDetail />} />
                </Route>
            </Route>

            <Route path="*" element={<Navigate to="/phieu-kiem" />} />
        </Routes>
    );
}