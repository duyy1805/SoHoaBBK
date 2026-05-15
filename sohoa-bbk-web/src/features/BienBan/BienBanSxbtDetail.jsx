import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    Grid,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Stack,
    TextField,
    Typography
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import {
    addBienBanSxbtXuLyRow,
    confirmBienBanSxbtMucDo,
    confirmBienBanSxbtStep,
    getBienBanSxbtDetail,
    getBoPhan,
    saveBienBanSxbtDraft
} from "../../api/bienBan.api";
import { getCurrentUser } from "../../utils/auth";
import { useToast } from "../../components/common/ToastContext";

const LEVEL_OPTIONS = ["B", "C"];

const statusLabel = (status) => {
    if (status === "BB_SXBT_HOAN_TAT") return "SXBT hoàn tất";
    if (status === "BB_SXBT_CHO_XAC_NHAN") return "Đang xử lý";
    if (status === "BB_SXBT_MOI" || status === "BB_SXBT_TP_B8_DRAFT") return "Chờ xác nhận mức";
    return status || "---";
};

export default function BienBanSxbtDetail() {
    const { id: bienBanId } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const currentUser = getCurrentUser();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [info, setInfo] = useState(null);
    const [defects, setDefects] = useState([]);
    const [confirmSteps, setConfirmSteps] = useState([]);
    const [xuLyRows, setXuLyRows] = useState([]);
    const [hanhDongRows, setHanhDongRows] = useState([]);
    const [moTaChung, setMoTaChung] = useState("");
    const [mucDo, setMucDo] = useState("B");
    const [openXuLy, setOpenXuLy] = useState(false);
    const [openHanhDong, setOpenHanhDong] = useState(false);

    useEffect(() => {
        loadData();
    }, [bienBanId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const res = await getBienBanSxbtDetail(bienBanId);
            const data = res.data || {};
            const infoData = data.info || {};
            setInfo(infoData);
            setDefects(data.defects || []);
            setConfirmSteps(data.confirmSteps || []);
            setXuLyRows(data.xuLyRows || []);
            setHanhDongRows(data.hanhDong || []);
            setMoTaChung(infoData.MoTaChung || "");
            setMucDo(infoData.MucDoKhongPhuHop || "B");
        } catch (err) {
            showToast(err?.response?.data?.message || "Không tải được biên bản SXBT", "error");
        } finally {
            setLoading(false);
        }
    };

    const isMucDoConfirmed = info?.MucDoKhongPhuHopConfirmed === true || info?.MucDoKhongPhuHopConfirmed === 1;
    const isCompleted = info?.TrangThai === "BB_SXBT_HOAN_TAT";
    const currentPendingStep = useMemo(
        () => confirmSteps.find((step) => step.TrangThai !== "DA_XAC_NHAN"),
        [confirmSteps]
    );
    const canConfirmCurrentStep = !!currentPendingStep &&
        Number(currentPendingStep.BoPhanId) === Number(currentUser?.boPhanId);
    const canEditBeforeFlow = !isMucDoConfirmed && !isCompleted;
    const canEditCurrentStep = isMucDoConfirmed && !isCompleted && canConfirmCurrentStep;
    const canEditContent = canEditBeforeFlow || canEditCurrentStep;

    const buildDraftPayload = (nextHanhDongRows = hanhDongRows) => ({
        moTaChung,
        mucDoKhongPhuHop: mucDo,
        xuLyRows: xuLyRows.map((row, idx) => ({
            rowCode: row.RowCode || `ROW_${idx + 1}`,
            sortOrder: row.SortOrder || idx + 1,
            chiPhi: row.ChiPhi || null,
            noiDung: row.NoiDung || null,
            nguoiNhapId: row.NguoiNhapId || null,
            boPhanTrachNhiemId: row.BoPhanTrachNhiemId || null,
            thoiHan: row.ThoiHan || null
        })),
        hanhDong: nextHanhDongRows.map((item) => ({
            noiDung: item.NoiDung || null,
            thoiHan: item.ThoiHan || null,
            boPhanId: item.BoPhanId || null,
            nguoiNhapId: item.NguoiNhapId || null
        }))
    });

    const handleConfirmMucDo = async () => {
        if (!moTaChung.trim()) {
            showToast("Vui lòng nhập mô tả chung", "warning");
            return;
        }
        try {
            setSaving(true);
            await saveBienBanSxbtDraft(bienBanId, buildDraftPayload());
            await confirmBienBanSxbtMucDo(bienBanId, mucDo);
            showToast(`Đã xác nhận mức độ ${mucDo}`, "success");
            await loadData();
        } catch (err) {
            showToast(err?.response?.data?.message || "Không thể xác nhận mức độ", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleConfirmStep = async () => {
        try {
            setSaving(true);
            await confirmBienBanSxbtStep(bienBanId);
            showToast("Đã xác nhận bước hiện tại", "success");
            await loadData();
        } catch (err) {
            showToast(err?.response?.data?.message || "Không thể xác nhận bước", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleAddHanhDong = async ({ noiDung, thoiHan, boPhan }) => {
        const nextRows = [
            ...hanhDongRows,
            {
                NoiDung: noiDung,
                ThoiHan: thoiHan || null,
                BoPhanId: boPhan.Id,
                MaBoPhan: boPhan.MaBoPhan,
                TenBoPhan: boPhan.TenBoPhan,
                NguoiNhapId: currentUser?.id || currentUser?.userId || null,
                NguoiNhap: currentUser?.fullName || currentUser?.username || ""
            }
        ];
        await saveBienBanSxbtDraft(bienBanId, buildDraftPayload(nextRows));
        await loadData();
    };

    if (loading) {
        return (
            <Box sx={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ bgcolor: "#f4f6f8", minHeight: "100vh", pb: 4 }}>
            <Paper elevation={0} sx={{ p: 2, mb: 3, borderBottom: "1px solid #e0e0e0" }}>
                <Container maxWidth="xl">
                    <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} color="inherit">
                        Danh sách biên bản
                    </Button>
                </Container>
            </Paper>

            <Container maxWidth="xl">
                <Grid container spacing={3}>
                    <Grid size={{ xs: 12, lg: 4 }}>
                        <Stack spacing={3}>
                            <Card>
                                <CardContent>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Typography variant="h5" color="primary" fontWeight="bold">{info?.SoPhieu || "---"}</Typography>
                                        <Chip label={statusLabel(info?.TrangThai)} color={isCompleted ? "success" : "info"} />
                                    </Stack>
                                    <Divider sx={{ my: 2 }} />
                                    <Typography>{info?.SoBienBan || "Biên bản SXBT"}</Typography>
                                    <Typography color="text.secondary">Người tạo: {info?.NguoiTao || "---"}</Typography>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent>
                                    <Typography variant="h6" mb={2}>Mô tả chung</Typography>
                                    <TextField
                                        fullWidth
                                        multiline
                                        minRows={4}
                                        value={moTaChung}
                                        onChange={(e) => setMoTaChung(e.target.value)}
                                        disabled={!canEditBeforeFlow}
                                    />
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent>
                                    <Typography variant="h6" mb={2}>Chi tiết lỗi</Typography>
                                    {defects.length === 0 ? (
                                        <Typography color="text.secondary">Chưa có dữ liệu lỗi</Typography>
                                    ) : defects.map((item, index) => (
                                        <Box key={`${item.MaLoi}-${index}`} sx={{ py: 1, borderBottom: "1px solid #eee" }}>
                                            <Typography fontWeight="bold">{item.TenLoi || item.MaLoi}</Typography>
                                            <Typography variant="body2" color="text.secondary">{item.MoTa || "---"} · SL {item.SoLuong || 0}</Typography>
                                        </Box>
                                    ))}
                                </CardContent>
                            </Card>
                        </Stack>
                    </Grid>

                    <Grid size={{ xs: 12, lg: 8 }}>
                        <Stack spacing={3}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" mb={2}>Mức không phù hợp</Typography>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        {LEVEL_OPTIONS.map((level) => (
                                            <Button
                                                key={level}
                                                variant={mucDo === level ? "contained" : "outlined"}
                                                onClick={() => setMucDo(level)}
                                                disabled={!canEditBeforeFlow}
                                            >
                                                {level}
                                            </Button>
                                        ))}
                                        {canEditBeforeFlow && (
                                            <Button variant="contained" color="success" disabled={saving} onClick={handleConfirmMucDo}>
                                                Xác nhận mức độ
                                            </Button>
                                        )}
                                        {isMucDoConfirmed && <Chip label={`Đã xác nhận: ${mucDo}`} color="success" />}
                                    </Stack>
                                </CardContent>
                            </Card>

                            {isMucDoConfirmed && (
                                <>
                                    <SxbtXuLySection rows={xuLyRows} canEdit={canEditContent} onAdd={() => setOpenXuLy(true)} />
                                    <SxbtHanhDongSection rows={hanhDongRows} canEdit={canEditContent} onAdd={() => setOpenHanhDong(true)} />
                                </>
                            )}

                            <Card>
                                <CardContent>
                                    <Typography variant="h6" mb={2}>Chuỗi xác nhận</Typography>
                                    {currentPendingStep && (
                                        <Typography color="primary" mb={1}>
                                            Đang chờ: {currentPendingStep.MaBoPhan || currentPendingStep.TenBoPhan}
                                        </Typography>
                                    )}
                                    {confirmSteps.length === 0 ? (
                                        <Typography color="text.secondary">Chưa có chuỗi xác nhận</Typography>
                                    ) : confirmSteps.map((step) => (
                                        <Stack key={step.Id} direction="row" justifyContent="space-between" sx={{ py: 1, borderBottom: "1px solid #eee" }}>
                                            <Typography>Bước {step.StepOrder}: {step.TenBoPhan || step.MaBoPhan}</Typography>
                                            <Chip
                                                size="small"
                                                label={step.TrangThai === "DA_XAC_NHAN" ? "Đã xác nhận" : "Chờ xác nhận"}
                                                color={step.TrangThai === "DA_XAC_NHAN" ? "success" : "warning"}
                                            />
                                        </Stack>
                                    ))}
                                </CardContent>
                            </Card>

                            {canConfirmCurrentStep && !isCompleted && (
                                <Button variant="contained" size="large" startIcon={<CheckCircleIcon />} disabled={saving} onClick={handleConfirmStep}>
                                    Xác nhận bước hiện tại
                                </Button>
                            )}
                            {isCompleted && <Chip label="Biên bản SXBT đã hoàn tất" color="success" />}
                        </Stack>
                    </Grid>
                </Grid>
            </Container>

            <SxbtXuLyDialog open={openXuLy} onClose={() => setOpenXuLy(false)} bienBanId={bienBanId} mucDo={mucDo} reload={loadData} />
            <SxbtHanhDongDialog
                open={openHanhDong}
                onClose={() => setOpenHanhDong(false)}
                onSave={async (payload) => {
                    try {
                        await handleAddHanhDong(payload);
                        setOpenHanhDong(false);
                        showToast("Đã thêm hành động khắc phục", "success");
                    } catch (err) {
                        showToast(err?.response?.data?.message || "Không thể thêm hành động", "error");
                    }
                }}
            />
        </Box>
    );
}

function SxbtXuLySection({ rows, canEdit, onAdd }) {
    return (
        <Card>
            <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">Ý kiến / Đề xuất xử lý</Typography>
                    {canEdit && <Button startIcon={<AddIcon />} onClick={onAdd}>Thêm</Button>}
                </Stack>
                {rows.length === 0 ? <Typography color="text.secondary">Chưa có phương án xử lý</Typography> : rows.map((item, index) => (
                    <Paper key={item.Id || index} variant="outlined" sx={{ p: 2, mb: 1 }}>
                        <Typography fontWeight="bold">Chi phí: {item.ChiPhi || "---"}</Typography>
                        <Typography sx={{ my: 1 }}>{item.NoiDung || "---"}</Typography>
                        <Typography variant="body2" color="text.secondary">Trách nhiệm: {item.TrachNhiem || "---"}</Typography>
                        <Typography variant="body2" color="text.secondary">Người nhập: {item.NguoiNhap || "---"}</Typography>
                    </Paper>
                ))}
            </CardContent>
        </Card>
    );
}

function SxbtHanhDongSection({ rows, canEdit, onAdd }) {
    return (
        <Card>
            <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">Hành động khắc phục</Typography>
                    {canEdit && <Button startIcon={<AddIcon />} onClick={onAdd}>Thêm</Button>}
                </Stack>
                {rows.length === 0 ? <Typography color="text.secondary">Chưa có hành động cụ thể</Typography> : rows.map((item, index) => (
                    <Paper key={item.Id || index} variant="outlined" sx={{ p: 2, mb: 1 }}>
                        <Typography>{item.NoiDung || "---"}</Typography>
                        <Typography variant="body2" color="text.secondary">Bộ phận thực hiện: {item.MaBoPhan && item.TenBoPhan ? `${item.MaBoPhan} - ${item.TenBoPhan}` : "---"}</Typography>
                        <Typography variant="body2" color="text.secondary">Người nhập: {item.NguoiNhap || "---"}</Typography>
                    </Paper>
                ))}
            </CardContent>
        </Card>
    );
}

function SxbtXuLyDialog({ open, onClose, bienBanId, mucDo, reload }) {
    const [departments, setDepartments] = useState([]);
    const [form, setForm] = useState({ chiPhi: "", noiDung: "", boPhanTrachNhiemId: "", thoiHan: "" });

    useEffect(() => {
        if (open) {
            setForm({ chiPhi: "", noiDung: "", boPhanTrachNhiemId: "", thoiHan: "" });
            getBoPhan().then((res) => setDepartments(res.data || []));
        }
    }, [open]);

    const handleSubmit = async () => {
        await addBienBanSxbtXuLyRow(bienBanId, { mucDo, ...form });
        await reload();
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Nhập phương án xử lý</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <TextField label="Chi phí" value={form.chiPhi} onChange={(e) => setForm({ ...form, chiPhi: e.target.value })} />
                    <TextField label="Nội dung" multiline rows={3} value={form.noiDung} onChange={(e) => setForm({ ...form, noiDung: e.target.value })} />
                    <FormControl fullWidth>
                        <InputLabel>Trách nhiệm</InputLabel>
                        <Select label="Trách nhiệm" value={form.boPhanTrachNhiemId} onChange={(e) => setForm({ ...form, boPhanTrachNhiemId: e.target.value })}>
                            {departments.map((item) => <MenuItem key={item.Id} value={item.Id}>{item.MaBoPhan} - {item.TenBoPhan}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <TextField label="Thời hạn" type="date" InputLabelProps={{ shrink: true }} value={form.thoiHan} onChange={(e) => setForm({ ...form, thoiHan: e.target.value })} />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Hủy</Button>
                <Button variant="contained" onClick={handleSubmit} disabled={!form.noiDung || !form.boPhanTrachNhiemId}>Lưu</Button>
            </DialogActions>
        </Dialog>
    );
}

function SxbtHanhDongDialog({ open, onClose, onSave }) {
    const [departments, setDepartments] = useState([]);
    const [form, setForm] = useState({ noiDung: "", thoiHan: "", boPhanId: "" });

    useEffect(() => {
        if (open) {
            setForm({ noiDung: "", thoiHan: "", boPhanId: "" });
            getBoPhan().then((res) => setDepartments(res.data || []));
        }
    }, [open]);

    const handleSubmit = async () => {
        const boPhan = departments.find((item) => item.Id === form.boPhanId);
        await onSave({ ...form, boPhan });
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Thêm hành động khắc phục</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <TextField label="Nội dung hành động" multiline rows={3} value={form.noiDung} onChange={(e) => setForm({ ...form, noiDung: e.target.value })} />
                    <TextField label="Thời hạn hoàn thành" type="date" InputLabelProps={{ shrink: true }} value={form.thoiHan} onChange={(e) => setForm({ ...form, thoiHan: e.target.value })} />
                    <FormControl fullWidth>
                        <InputLabel>Bộ phận thực hiện</InputLabel>
                        <Select label="Bộ phận thực hiện" value={form.boPhanId} onChange={(e) => setForm({ ...form, boPhanId: e.target.value })}>
                            {departments.map((item) => <MenuItem key={item.Id} value={item.Id}>{item.MaBoPhan} - {item.TenBoPhan}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Hủy</Button>
                <Button variant="contained" onClick={handleSubmit} disabled={!form.noiDung || !form.boPhanId}>Lưu</Button>
            </DialogActions>
        </Dialog>
    );
}
