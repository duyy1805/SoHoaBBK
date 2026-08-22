import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '../components/Layout/AppLayout';
import Login from '../features/Login';
import Dashboard from '../features/Dashboard/Dashboard';
import PhieuKiemList from '../features/PhieuKiem/pages/PhieuKiemList';
import PhieuKiemDetail from '../features/PhieuKiem/pages/PhieuKiemDetail';
import SxbtDetail from '../features/PhieuKiem/pages/SxbtDetail';
import TrenChuyenDetail from '../features/PhieuKiem/pages/TrenChuyenDetail';
import CuoiChuyenDetail from '../features/PhieuKiem/pages/CuoiChuyenDetail';
import PhieuKiemCreate from '../features/PhieuKiem/pages/PhieuKiemCreate';
import ProtectedRoute from './ProtectedRoute';
import DanhMucManager from '../features/DanhMuc/DanhMucManager'
import BienBanDetail from '../features/BienBan/BienBanDetail';
import BienBanList from '../features/BienBan/BienBanList';
import BienBanSxbtDetail from '../features/BienBan/BienBanSxbtDetail';
import PhieuXuLyKhongPhuHopList from '../features/BienBan/PhieuXuLyKhongPhuHopList';
import PhieuXuLyKhongPhuHopDetail from '../features/BienBan/PhieuXuLyKhongPhuHopDetail';
import CongDoanList from '../features/PhieuKiem/pages/CongDoanList';
import CongDoanDetail from '../features/PhieuKiem/pages/CongDoanDetail';
import UserAdminPage from '../features/UserAdmin/UserAdminPage';
import UserAdminRoute from './UserAdminRoute';
import WorkCenterPage from '../features/WorkCenter/WorkCenterPage';

const workCenterEnabled = import.meta.env.VITE_ENABLE_WORK_CENTER !== 'false';

export default function AppRoutes() {
    return (
        <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />

            {/* Protected */}
            <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/phieu-kiem" element={<PhieuKiemList />} />
                    <Route path="/phieu-kiem/cong-doan" element={<CongDoanList />} />
                    <Route path="/phieu-kiem/cong-doan/:id" element={<CongDoanDetail />} />
                    <Route path="/phieu-kiem/sxbt/:id" element={<SxbtDetail />} />
                    <Route path="/phieu-kiem/cuoi-chuyen/:id" element={<CuoiChuyenDetail />} />
                    <Route path="/phieu-kiem/tren-chuyen/:id" element={<TrenChuyenDetail />} />
                    <Route path="/phieu-kiem/:id" element={<PhieuKiemDetail />} />
                    <Route path="/phieu-kiem/create" element={<PhieuKiemCreate />} />
                    <Route path="/danh-muc" element={<DanhMucManager />} />
                    <Route path="/bien-ban" element={<BienBanList />} />
                    <Route path="/bien-ban/sxbt/:id" element={<BienBanSxbtDetail />} />
                    <Route path="/bien-ban/:id" element={<BienBanDetail />} />
                    <Route path="/phieu-xu-ly-khong-phu-hop" element={<PhieuXuLyKhongPhuHopList />} />
                    <Route path="/phieu-xu-ly-khong-phu-hop/:id" element={<PhieuXuLyKhongPhuHopDetail />} />
                    <Route
                        path="/trung-tam-xu-ly"
                        element={workCenterEnabled ? <WorkCenterPage /> : <Navigate to="/bien-ban" replace />}
                    />
                    <Route element={<UserAdminRoute />}>
                        <Route path="/quan-ly-nguoi-dung" element={<UserAdminPage />} />
                    </Route>
                </Route>
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
    );
}
