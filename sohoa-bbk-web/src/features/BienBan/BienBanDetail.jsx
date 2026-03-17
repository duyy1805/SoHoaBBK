import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PrintIcon from "@mui/icons-material/Print";
import { useReactToPrint } from "react-to-print";

import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Button,
    Chip,
    Stack,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
    Checkbox,
    ListItemText,
    Select,
    FormControl,
    InputLabel,
} from "@mui/material";

import {
    getBienBanDetail,
    completeBienBan,
    confirmAssign,
    confirmUser,
    getAssignableUsers,
    assignUsers,
    addXuLy,
    addChiPhi,
    addHanhDong,
    getDeNghiXuLy,
    getBoPhan
} from "../../api/bienBan.api";

import { getCurrentUser } from "../../utils/auth";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { BienBanPrintTemplate } from "./components/BienBanPrintTemplate";

export default function BienBanDetail() {
    const { id: bienBanId } = useParams();
    const navigate = useNavigate();
    const componentRef = useRef();

    const [info, setInfo] = useState(null);
    const [defects, setDefects] = useState([]);
    const [assigns, setAssigns] = useState([]);
    const [xuLy, setXuLy] = useState([]);
    const [chiPhi, setChiPhi] = useState([]);
    const [xacNhan, setXacNhan] = useState([]);
    const [hanhDong, setHanhDong] = useState([]);

    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState(null);

    // Modals state
    const [openAssignModal, setOpenAssignModal] = useState(false);
    const [openXuLyModal, setOpenXuLyModal] = useState(false);
    const [openChiPhiModal, setOpenChiPhiModal] = useState(false);
    const [openHanhDongModal, setOpenHanhDongModal] = useState(false);
    const [openPrintModal, setOpenPrintModal] = useState(false);

    // Confirm Dialog state
    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        title: '',
        message: '',
        type: 'info',
        onConfirm: null
    });

    useEffect(() => {
        const user = getCurrentUser();
        if (user) {
            setCurrentUserId(user.userId);
        }
        loadData();
    }, [bienBanId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const res = await getBienBanDetail(bienBanId);
            setInfo(res.data.info);
            setDefects(res.data.defects || []);
            setAssigns(res.data.assigns || []);
            setXuLy(res.data.xuLy || []);
            setChiPhi(res.data.chiPhi || []);
            setXacNhan(res.data.xacNhan || []);
            setHanhDong(res.data.hanhDong || []);
        } catch (err) {
            console.error("Lỗi tải biên bản:", err);
        } finally {
            setLoading(false);
        }
    };

    const getDefectColor = (type) => {
        if (!type) return "default";
        const t = type.toLowerCase();
        if (t.includes("critical")) return "error";
        if (t.includes("major")) return "warning";
        if (t.includes("minor")) return "info";
        return "primary";
    };

    // --- Actions ---

    const handleConfirmAssign = () => {
        setConfirmDialog({
            open: true,
            title: 'Xác nhận phân công',
            message: 'Bạn có chắc chắn muốn xác nhận phân công này?',
            type: 'warning',
            onConfirm: async () => {
                try {
                    await confirmAssign(bienBanId);
                    loadData();
                    setConfirmDialog(prev => ({ ...prev, open: false }));
                } catch (err) {
                    alert(err?.response?.data?.message || "Lỗi xác nhận phân công");
                }
            }
        });
    };

    const handleComplete = () => {
        setConfirmDialog({
            open: true,
            title: 'Hoàn thành biên bản',
            message: 'Bạn có chắc chắn muốn hoàn thành biên bản này? Hành động này không thể hoàn tác.',
            type: 'success',
            onConfirm: async () => {
                try {
                    await completeBienBan(bienBanId);
                    navigate(-1);
                } catch (err) {
                    alert(err?.response?.data?.message || "Lỗi hoàn thành biên bản");
                }
            }
        });
    };

    const handleConfirmUser = () => {
        setConfirmDialog({
            open: true,
            title: 'Xác nhận thông tin',
            message: 'Bạn xác nhận các thông tin xử lý là chính xác?',
            type: 'info',
            onConfirm: async () => {
                try {
                    await confirmUser(bienBanId);
                    loadData();
                    setConfirmDialog(prev => ({ ...prev, open: false }));
                } catch (err) {
                    alert(err?.response?.data?.message || "Lỗi xác nhận thông tin");
                }
            }
        });
    };

    const handlePrintPreview = () => {
        setOpenPrintModal(true);
    };

    const handlePrint = useReactToPrint({
        content: () => componentRef.current,
        documentTitle: info ? `BienBan_${info.SoPhieu}` : 'BienBan',
    });

    // --- UI Helpers ---

    const isAssigned = assigns.some(a => a.NguoiXuLyId === currentUserId);
    const hasXuLy = xuLy.some(x => x.NguoiXuLyId === currentUserId);
    const isConfirmed = xacNhan.some(x => x.NguoiXacNhanId === currentUserId);
    const allConfirmed = assigns.length > 0 && assigns.every(a => xacNhan.some(x => x.NguoiXacNhanId === a.NguoiXuLyId));

    const getStatusText = (nguoiXuLyId) =>
        xuLy.some(x => x.NguoiXuLyId === nguoiXuLyId) ? "✓" : "Chờ";

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!info) return <Typography>Không tìm thấy biên bản</Typography>;

    return (
        <Box sx={{ p: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={() => navigate(-1)}
                >
                    Quay lại
                </Button>

                <Button
                    variant="outlined"
                    startIcon={<PrintIcon />}
                    onClick={handlePrintPreview}
                >
                    In biên bản
                </Button>
            </Stack>

            {/* Header Info */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={8}>
                            <Typography variant="h5" fontWeight="bold">{info.SoPhieu}</Typography>
                            <Typography variant="subtitle1" color="text.secondary">{info.TenSanPham}</Typography>
                            <Typography variant="body2">Lot: {info.Lot}</Typography>
                            <Typography variant="body2">Người lập: {info.NguoiLap}</Typography>
                        </Grid>
                        <Grid item xs={12} md={4} sx={{ textAlign: { md: 'right' } }}>
                            <Chip label={info.TrangThai} color="primary" variant="outlined" />
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* Defects Table */}
            <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Danh sách lỗi</Typography>
            <TableContainer component={Paper} sx={{ mb: 3 }}>
                <Table>
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                        <TableRow>
                            <TableCell>Tên lỗi</TableCell>
                            <TableCell align="center">Mức độ</TableCell>
                            <TableCell align="right">SL</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {defects.map((d, i) => (
                            <TableRow key={i}>
                                <TableCell>{d.TenLoi}</TableCell>
                                <TableCell align="center">
                                    <Chip label={d.DefectType} color={getDefectColor(d.DefectType)} size="small" />
                                </TableCell>
                                <TableCell align="right">{d.SoLuong}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Assign Section */}
            <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Người xử lý</Typography>
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    {assigns.map((a, i) => (
                        <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: i < assigns.length - 1 ? '1px solid #eee' : 'none' }}>
                            <Box>
                                <Typography fontWeight="bold">{a.FullName}</Typography>
                                <Typography variant="caption" color="text.secondary">{a.RoleName}</Typography>
                            </Box>
                            <Typography
                                fontWeight="bold"
                                color={getStatusText(a.NguoiXuLyId) === "✓" ? "success.main" : "warning.main"}
                            >
                                {getStatusText(a.NguoiXuLyId)}
                            </Typography>
                        </Box>
                    ))}
                    {!info.AssignConfirmed && (
                        <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                            <Button variant="contained" onClick={() => setOpenAssignModal(true)}>Chọn người xử lý</Button>
                            <Button variant="contained" color="warning" onClick={handleConfirmAssign}>Xác nhận phân công</Button>
                        </Stack>
                    )}
                </CardContent>
            </Card>

            {/* Xu Ly Section */}
            <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Đề xuất xử lý</Typography>
            <TableContainer component={Paper} sx={{ mb: 3 }}>
                <Table>
                    <TableBody>
                        {xuLy.map((x, i) => (
                            <TableRow key={i}>
                                <TableCell>
                                    <Typography fontWeight="bold">{x.NoiDung}</Typography>
                                    <Typography variant="body2" color="text.secondary">Đề nghị: {x.DeNghiXuLy}</Typography>
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2">{x.TenBoPhan}</Typography>
                                    <Typography variant="caption" color="error">{new Date(x.ThoiHan).toLocaleDateString("vi-VN")}</Typography>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Actions for Assigned User */}
            {info.AssignConfirmed && isAssigned && !isConfirmed && (
                <Button variant="contained" color="secondary" onClick={() => setOpenXuLyModal(true)} sx={{ mb: 2 }}>
                    Nhập ý kiến xử lý
                </Button>
            )}


            {/* Chi Phi Section */}
            <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Chi phí phát sinh</Typography>
            {chiPhi.map((c, i) => (
                <Paper key={i} sx={{ p: 2, mb: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography>{c.LoaiChiPhi}</Typography>
                        <Box sx={{ textAlign: 'right' }}>
                            <Typography color="success.main" fontWeight="bold">
                                {c.TenBoPhan}
                            </Typography>
                            <Typography fontWeight="bold">
                                {c.GiaTri?.toLocaleString("vi-VN")} VND
                            </Typography>
                        </Box>
                    </Box>
                </Paper>
            ))}
            {info.AssignConfirmed && isAssigned && !isConfirmed && hasXuLy && (
                <Button variant="outlined" color="success" onClick={() => setOpenChiPhiModal(true)} sx={{ mt: 1 }}>
                    Thêm chi phí
                </Button>
            )}


            {/* Hanh Dong Section */}
            <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Hành động khắc phục</Typography>
            <TableContainer component={Paper} sx={{ mb: 3 }}>
                <Table>
                    <TableBody>
                        {hanhDong.map((h, i) => (
                            <TableRow key={i}>
                                <TableCell>{h.NoiDung}</TableCell>
                                <TableCell>
                                    <Typography variant="body2">{h.TenBoPhan}</Typography>
                                    <Typography variant="caption" color="error">{new Date(h.ThoiHan).toLocaleDateString("vi-VN")}</Typography>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            {info.AssignConfirmed && isAssigned && !isConfirmed && hasXuLy && (
                <Button variant="outlined" color="info" onClick={() => setOpenHanhDongModal(true)} sx={{ mt: 1 }}>
                    Thêm hành động
                </Button>
            )}


            {/* Xac Nhan Section */}
            <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Xác nhận</Typography>
            {xacNhan.map((x, i) => (
                <Paper key={i} sx={{ p: 2, mb: 1, display: 'flex', justifyContent: 'space-between' }}>
                    <Typography>{x.FullName}</Typography>
                    <Typography color="text.secondary">{x.ThoiGian}</Typography>
                </Paper>
            ))}


            {/* Bottom Actions */}
            <Box sx={{ mt: 4, mb: 4, display: 'flex', gap: 2 }}>
                {info.AssignConfirmed && isAssigned && !isConfirmed && hasXuLy && (
                    <Button variant="contained" color="warning" onClick={handleConfirmUser}>
                        Xác nhận thông tin
                    </Button>
                )}
                {allConfirmed && (
                    <Button variant="contained" color="success" size="large" onClick={handleComplete}>
                        Hoàn thành biên bản
                    </Button>
                )}
            </Box>


            {/* Print Preview Modal */}
            <Dialog
                open={openPrintModal}
                onClose={() => setOpenPrintModal(false)}
                maxWidth="lg"
                fullWidth
            >
                <DialogTitle>Xem trước bản in</DialogTitle>
                <DialogContent dividers sx={{ bgcolor: '#f0f0f0', p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <Paper sx={{ width: '210mm', minHeight: '297mm', p: 0, boxShadow: 3 }}>
                            <BienBanPrintTemplate
                                ref={componentRef}
                                info={info}
                                defects={defects}
                                xuLy={xuLy}
                                chiPhi={chiPhi}
                                hanhDong={hanhDong}
                                xacNhan={xacNhan}
                            />
                        </Paper>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenPrintModal(false)}>Hủy</Button>
                    <Button
                        startIcon={<PrintIcon />}
                        onClick={handlePrint}
                        variant="contained"
                        color="primary"
                    >
                        In / Lưu PDF
                    </Button>
                </DialogActions>
            </Dialog>


            {/* --- Modals (Inline for simplicity) --- */}

            <AssignUserDialog
                open={openAssignModal}
                onClose={() => setOpenAssignModal(false)}
                bienBanId={bienBanId}
                reload={loadData}
                assignedIds={assigns.map(a => a.NguoiXuLyId)}
            />

            <XuLyDialog
                open={openXuLyModal}
                onClose={() => setOpenXuLyModal(false)}
                bienBanId={bienBanId}
                reload={loadData}
            />

            <ChiPhiDialog
                open={openChiPhiModal}
                onClose={() => setOpenChiPhiModal(false)}
                bienBanId={bienBanId}
                reload={loadData}
            />

            <HanhDongDialog
                open={openHanhDongModal}
                onClose={() => setOpenHanhDongModal(false)}
                bienBanId={bienBanId}
                reload={loadData}
            />

            {/* Confirm Dialog */}
            <ConfirmDialog
                open={confirmDialog.open}
                onClose={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
                onConfirm={confirmDialog.onConfirm}
                title={confirmDialog.title}
                message={confirmDialog.message}
                type={confirmDialog.type}
            />

        </Box>
    );
}

// --- Sub-components (Dialogs) ---

function AssignUserDialog({ open, onClose, bienBanId, reload, assignedIds }) {
    const [users, setUsers] = useState([]);
    const [selected, setSelected] = useState([]);

    useEffect(() => {
        if (open) {
            getAssignableUsers(bienBanId).then(res => {
                setUsers(res.data);
            });
        }
    }, [open, bienBanId]);

    const handleSubmit = async () => {
        try {
            await assignUsers(bienBanId, selected);
            reload();
            onClose();
        } catch (err) {
            alert("Lỗi phân công");
        }
    };

    const handleChange = (event) => {
        const { target: { value } } = event;
        setSelected(typeof value === 'string' ? value.split(',') : value);
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth>
            <DialogTitle>Chọn người xử lý</DialogTitle>
            <DialogContent>
                <FormControl fullWidth sx={{ mt: 1 }}>
                    <InputLabel>Người xử lý</InputLabel>
                    <Select
                        multiple
                        value={selected}
                        onChange={handleChange}
                        renderValue={(selected) => selected.map(id => users.find(u => u.Id === id)?.FullName).join(', ')}
                    >
                        {users.map((user) => (
                            <MenuItem key={user.Id} value={user.Id}>
                                <Checkbox checked={selected.indexOf(user.Id) > -1} />
                                <ListItemText primary={user.FullName} secondary={user.RoleName} />
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Hủy</Button>
                <Button onClick={handleSubmit} variant="contained">Lưu</Button>
            </DialogActions>
        </Dialog>
    );
}

function XuLyDialog({ open, onClose, bienBanId, reload }) {
    const [form, setForm] = useState({ NoiDung: '', DeNghiXuLy: '', MaBoPhan: '', ThoiHan: '' });
    const [boPhans, setBoPhans] = useState([]);
    const [deNghis, setDeNghis] = useState([]);

    useEffect(() => {
        if (open) {
            getBoPhan().then(res => setBoPhans(res.data));
            getDeNghiXuLy().then(res => setDeNghis(res.data));
        }
    }, [open]);

    const handleSubmit = async () => {
        try {
            await addXuLy({ ...form, BienBanId: bienBanId });
            reload();
            onClose();
        } catch (err) {
            alert("Lỗi thêm xử lý");
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth>
            <DialogTitle>Ý kiến xử lý</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <TextField
                        label="Nội dung"
                        fullWidth
                        multiline
                        rows={3}
                        value={form.NoiDung}
                        onChange={e => setForm({ ...form, NoiDung: e.target.value })}
                    />
                    <FormControl fullWidth>
                        <InputLabel>Đề nghị xử lý</InputLabel>
                        <Select
                            value={form.DeNghiXuLy}
                            label="Đề nghị xử lý"
                            onChange={e => setForm({ ...form, DeNghiXuLy: e.target.value })}
                        >
                            {deNghis.map(d => (
                                <MenuItem key={d.Code} value={d.Name}>{d.Name}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl fullWidth>
                        <InputLabel>Bộ phận chịu trách nhiệm</InputLabel>
                        <Select
                            value={form.MaBoPhan}
                            label="Bộ phận chịu trách nhiệm"
                            onChange={e => setForm({ ...form, MaBoPhan: e.target.value })}
                        >
                            {boPhans.map(b => (
                                <MenuItem key={b.MaBoPhan} value={b.MaBoPhan}>{b.TenBoPhan}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField
                        label="Thời hạn"
                        type="date"
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                        value={form.ThoiHan}
                        onChange={e => setForm({ ...form, ThoiHan: e.target.value })}
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Hủy</Button>
                <Button onClick={handleSubmit} variant="contained">Lưu</Button>
            </DialogActions>
        </Dialog>
    );
}

function ChiPhiDialog({ open, onClose, bienBanId, reload }) {
    const [form, setForm] = useState({ LoaiChiPhi: '', GiaTri: '', MaBoPhan: '' });
    const [boPhans, setBoPhans] = useState([]);

    useEffect(() => {
        if (open) {
            getBoPhan().then(res => setBoPhans(res.data));
        }
    }, [open]);

    const handleSubmit = async () => {
        try {
            await addChiPhi({ ...form, BienBanId: bienBanId });
            reload();
            onClose();
        } catch (err) {
            alert("Lỗi thêm chi phí");
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth>
            <DialogTitle>Thêm chi phí</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <TextField
                        label="Loại chi phí"
                        fullWidth
                        value={form.LoaiChiPhi}
                        onChange={e => setForm({ ...form, LoaiChiPhi: e.target.value })}
                    />
                    <TextField
                        label="Giá trị (VND)"
                        type="number"
                        fullWidth
                        value={form.GiaTri}
                        onChange={e => setForm({ ...form, GiaTri: e.target.value })}
                    />
                    <FormControl fullWidth>
                        <InputLabel>Bộ phận chịu phí</InputLabel>
                        <Select
                            value={form.MaBoPhan}
                            label="Bộ phận chịu phí"
                            onChange={e => setForm({ ...form, MaBoPhan: e.target.value })}
                        >
                            {boPhans.map(b => (
                                <MenuItem key={b.MaBoPhan} value={b.MaBoPhan}>{b.TenBoPhan}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Hủy</Button>
                <Button onClick={handleSubmit} variant="contained">Lưu</Button>
            </DialogActions>
        </Dialog>
    );
}

function HanhDongDialog({ open, onClose, bienBanId, reload }) {
    const [form, setForm] = useState({ NoiDung: '', MaBoPhan: '', ThoiHan: '' });
    const [boPhans, setBoPhans] = useState([]);

    useEffect(() => {
        if (open) {
            getBoPhan().then(res => setBoPhans(res.data));
        }
    }, [open]);

    const handleSubmit = async () => {
        try {
            await addHanhDong({ ...form, BienBanId: bienBanId });
            reload();
            onClose();
        } catch (err) {
            alert("Lỗi thêm hành động");
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth>
            <DialogTitle>Thêm hành động khắc phục</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <TextField
                        label="Nội dung"
                        fullWidth
                        multiline
                        rows={3}
                        value={form.NoiDung}
                        onChange={e => setForm({ ...form, NoiDung: e.target.value })}
                    />
                    <FormControl fullWidth>
                        <InputLabel>Bộ phận thực hiện</InputLabel>
                        <Select
                            value={form.MaBoPhan}
                            label="Bộ phận thực hiện"
                            onChange={e => setForm({ ...form, MaBoPhan: e.target.value })}
                        >
                            {boPhans.map(b => (
                                <MenuItem key={b.MaBoPhan} value={b.MaBoPhan}>{b.TenBoPhan}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField
                        label="Thời hạn"
                        type="date"
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                        value={form.ThoiHan}
                        onChange={e => setForm({ ...form, ThoiHan: e.target.value })}
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Hủy</Button>
                <Button onClick={handleSubmit} variant="contained">Lưu</Button>
            </DialogActions>
        </Dialog>
    );
}
