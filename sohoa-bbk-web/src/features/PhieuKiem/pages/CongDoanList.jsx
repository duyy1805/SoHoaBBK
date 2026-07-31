import { useEffect, useMemo, useState } from "react";
import {
    Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
    DialogContent, DialogTitle, MenuItem, Paper, Stack, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, TextField, Typography
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { useNavigate } from "react-router-dom";
import { createCongDoanPhieu, getCongDoanPhieuList } from "../../../api/phieuKiem.api";
import { getBoPhan } from "../../../api/bienBan.api";
import { getCurrentUser } from "../../../utils/auth";

const today = () => {
    const date = new Date();
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
const formatDate = (value) => value ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString("vi-VN") : "---";
const statusMeta = {
    TAO_MOI: ["Mới", "default"], CHUA_KIEM: ["Chưa kiểm", "default"],
    DANG_KIEM: ["Đang kiểm", "warning"], CHO_TBP_DUYET: ["Chờ TBP duyệt", "secondary"],
    HOAN_TAT: ["Hoàn tất", "success"]
};

export default function CongDoanList() {
    const navigate = useNavigate();
    const [rows, setRows] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [form, setForm] = useState({ ngayKiem: today(), toMay: "", phanXuongId: "" });
    const user = getCurrentUser();
    const canCreate = user?.permissions?.includes("THUC_HIEN_KIEM");

    const load = async () => {
        try {
            setLoading(true);
            const response = await getCongDoanPhieuList();
            setRows(response.data || []);
        } catch (error) {
            window.alert(error.response?.data?.message || "Không tải được danh sách phiếu công đoạn.");
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        load();
        getBoPhan().then((response) => setDepartments(
            (response.data || []).filter((item) =>
                String(item.TenBoPhan || item.Ten_BoPhan || "").toLocaleLowerCase("vi").includes("phân xưởng")
            )
        )).catch(() => setDepartments([]));
    }, []);

    const filteredRows = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        if (!keyword) return rows;
        return rows.filter((item) =>
            `${item.SoPhieu || ""} ${item.PhanXuong || ""} ${item.ToMay || ""} ${item.TenNguoiTao || ""}`
                .toLowerCase().includes(keyword)
        );
    }, [rows, search]);

    const create = async () => {
        if (!form.ngayKiem || !Number(form.phanXuongId)) {
            window.alert("Ngày kiểm và phân xưởng sản xuất là bắt buộc.");
            return;
        }
        try {
            setCreating(true);
            const response = await createCongDoanPhieu(form);
            setOpen(false);
            navigate(`/phieu-kiem/cong-doan/${response.data.Id}`);
        } catch (error) {
            window.alert(error.response?.data?.message || "Không tạo được phiếu công đoạn.");
        } finally {
            setCreating(false);
        }
    };

    return (
        <Box>
            <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", md: "center" }} spacing={1.5} sx={{ mb: 2 }}>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: "#0f172a" }}>Theo dõi, kiểm tra nghiệm thu công đoạn</Typography>
                    <Typography color="text.secondary" sx={{ mt: 0.5 }}>Phiếu dùng chung theo kế hoạch sản xuất trong ngày</Typography>
                </Box>
                {canCreate && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>Tạo phiếu</Button>}
            </Stack>
            <TextField size="small" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm số phiếu, phân xưởng, tổ/máy, KCS" sx={{ width: { xs: "100%", md: 420 }, mb: 2 }} />

            <Paper variant="outlined">
                {loading ? (
                    <Box sx={{ py: 8, textAlign: "center" }}><CircularProgress /></Box>
                ) : (
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Số phiếu</TableCell><TableCell>Ngày kiểm</TableCell>
                                    <TableCell>Phân xưởng / tổ máy</TableCell><TableCell>Người tạo</TableCell>
                                    <TableCell align="right">Kế hoạch</TableCell><TableCell align="right">KH / TT / Hiệu lực</TableCell><TableCell align="right">Số lỗi</TableCell>
                                    <TableCell>Trạng thái</TableCell><TableCell width={64} />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredRows.map((item) => {
                                    const meta = statusMeta[item.TrangThai] || [item.TrangThai, "default"];
                                    return (
                                        <TableRow key={item.Id} hover>
                                            <TableCell sx={{ fontWeight: 800, color: "primary.main" }}>{item.SoPhieu}</TableCell>
                                            <TableCell>{formatDate(item.NgayKiem)}</TableCell>
                                            <TableCell>{[item.PhanXuong, item.ToMay].filter(Boolean).join(" · ") || "---"}</TableCell>
                                            <TableCell>{item.TenNguoiTao || "---"}</TableCell>
                                            <TableCell align="right">{item.SoKeHoach || 0}</TableCell>
                                            <TableCell align="right">{item.TongSoLuongKeHoach || 0} / {item.SoKeHoachDaNhapThucTe ? item.TongSoLuongThucTe : "Chưa nhập"} / {item.TongSoLuongHieuLuc || 0}</TableCell>
                                            <TableCell align="right">{item.TongSoLuongLoi || 0}</TableCell>
                                            <TableCell><Chip size="small" label={meta[0]} color={meta[1]} /></TableCell>
                                            <TableCell><Button title="Xem chi tiết" onClick={() => navigate(`/phieu-kiem/cong-doan/${item.Id}`)}><VisibilityIcon /></Button></TableCell>
                                        </TableRow>
                                    );
                                })}
                                {!filteredRows.length && <TableRow><TableCell colSpan={9} align="center" sx={{ py: 7, color: "text.secondary" }}>Chưa có phiếu phù hợp.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>

            <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>Tạo phiếu kiểm công đoạn</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField type="date" label="Ngày kiểm" value={form.ngayKiem} onChange={(event) => setForm({ ...form, ngayKiem: event.target.value })} slotProps={{ inputLabel: { shrink: true } }} required />
                        <TextField select label="Phân xưởng sản xuất" value={form.phanXuongId} onChange={(event) => setForm({ ...form, phanXuongId: event.target.value })} required>
                            {departments.map((item) => <MenuItem key={item.Id || item.ID_BoPhan} value={item.Id || item.ID_BoPhan}>{item.TenBoPhan || item.Ten_BoPhan || `Bộ phận ${item.Id}`}</MenuItem>)}
                        </TextField>
                        <TextField label="Tổ / máy" value={form.toMay} onChange={(event) => setForm({ ...form, toMay: event.target.value })} />
                    </Stack>
                </DialogContent>
                <DialogActions><Button onClick={() => setOpen(false)}>Hủy</Button><Button variant="contained" disabled={creating} onClick={create}>{creating ? "Đang tạo..." : "Tạo phiếu"}</Button></DialogActions>
            </Dialog>
        </Box>
    );
}
