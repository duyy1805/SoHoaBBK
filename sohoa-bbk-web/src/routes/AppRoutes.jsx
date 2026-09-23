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
import DoiTraPhoiLoiList from '../features/DoiTraPhoiLoi/pages/DoiTraPhoiLoiList';
import DoiTraPhoiLoiCreate from '../features/DoiTraPhoiLoi/pages/DoiTraPhoiLoiCreate';
import DoiTraPhoiLoiDetail from '../features/DoiTraPhoiLoi/pages/DoiTraPhoiLoiDetail';
import PhatLongPhuocWorkspace from '../features/PhieuKiem/pages/PhatLongPhuocWorkspace';
import { isPlpTenant } from '../config/tenant';

const workCenterEnabled = import.meta.env.VITE_ENABLE_WORK_CENTER !== 'false';

export default function AppRoutes() {
    const plp = isPlpTenant();
    return (
        <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />

            {/* Protected */}
            <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                    <Route path="/dashboard" element={plp ? <Navigate to="/phat-long-phuoc" replace /> : <Dashboard />} />
                    <Route path="/phieu-kiem" element={plp ? <Navigate to="/phat-long-phuoc" replace /> : <PhieuKiemList />} />
                    <Route path="/phat-long-phuoc" element={plp ? <PhatLongPhuocWorkspace /> : <Navigate to="/phieu-kiem" replace />} />
                    <Route path="/phieu-kiem/cong-doan" element={<CongDoanList />} />
                    <Route path="/phieu-kiem/cong-doan/:id" element={<CongDoanDetail />} />
                    <Route path="/phieu-kiem/sxbt/:id" element={plp ? <Navigate to="/phat-long-phuoc" replace /> : <SxbtDetail />} />
                    <Route path="/phieu-kiem/cuoi-chuyen/:id" element={<CuoiChuyenDetail />} />
                    <Route path="/phieu-kiem/tren-chuyen/:id" element={<TrenChuyenDetail />} />
                    <Route path="/phieu-kiem/:id" element={<PhieuKiemDetail />} />
                    <Route path="/phieu-kiem/create" element={<PhieuKiemCreate />} />
                    <Route path="/doi-tra-phoi-loi" element={plp ? <Navigate to="/phat-long-phuoc" replace /> : <DoiTraPhoiLoiList />} />
                    <Route path="/doi-tra-phoi-loi/create" element={plp ? <Navigate to="/phat-long-phuoc" replace /> : <DoiTraPhoiLoiCreate />} />
                    <Route path="/doi-tra-phoi-loi/:id" element={plp ? <Navigate to="/phat-long-phuoc" replace /> : <DoiTraPhoiLoiDetail />} />
                    <Route path="/danh-muc" element={plp ? <Navigate to="/phat-long-phuoc" replace /> : <DanhMucManager />} />
                    <Route path="/bien-ban" element={<BienBanList />} />
                    <Route path="/bien-ban/sxbt/:id" element={plp ? <Navigate to="/phat-long-phuoc" replace /> : <BienBanSxbtDetail />} />
                    <Route path="/bien-ban/:id" element={<BienBanDetail />} />
                    <Route path="/phieu-xu-ly-khong-phu-hop" element={plp ? <Navigate to="/phat-long-phuoc" replace /> : <PhieuXuLyKhongPhuHopList />} />
                    <Route path="/phieu-xu-ly-khong-phu-hop/:id" element={plp ? <Navigate to="/phat-long-phuoc" replace /> : <PhieuXuLyKhongPhuHopDetail />} />
                    <Route
                        path="/trung-tam-xu-ly"
                        element={!plp && workCenterEnabled ? <WorkCenterPage /> : <Navigate to={plp ? "/phat-long-phuoc" : "/bien-ban"} replace />}
                    />
                    <Route element={<UserAdminRoute />}>
                        <Route path="/quan-ly-nguoi-dung" element={<UserAdminPage />} />
                    </Route>
                </Route>
            </Route>

            <Route path="*" element={<Navigate to={isPlpTenant() ? "/phat-long-phuoc" : "/dashboard"} />} />
        </Routes>
    );
}
