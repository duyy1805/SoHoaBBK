import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Box,
    Typography,
    Card,
    CardContent,
    CircularProgress,
    Stack,
    Fade,
    TextField,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Button,
    Chip,
    Paper,
    InputAdornment,
    Tabs,
    Tab
} from "@mui/material";
import { Add as AddIcon, Search as SearchIcon, ArrowForward as ArrowForwardIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { createStandaloneBienBan, getStandaloneBienBanList } from "../../api/bienBan.api";
import { decodeToken } from "../../utils/auth";
import { getBienBanStatusMeta } from "./components/bienBanWorkflow";

const renderTrangThaiChip = (trangThai) => {
    const status = getBienBanStatusMeta(trangThai);
    return <Chip label={status.label} color={status.color} size="small" sx={{ fontWeight: 500 }} />;
};

const getWorkBucket = (item, currentUser, isManager) => {
    if (["HOAN_TAT", "HOAN_THANH", "DA_XAC_NHAN"].includes(item.TrangThai)) return "done";
    const explicitMyTurn = item.CanCurrentUserAct === true || item.CanCurrentUserAct === 1 ||
        Number(item.NguoiXuLyId) === Number(currentUser.userId) ||
        Number(item.BoPhanId) === Number(currentUser.boPhanId) ||
        Number(item.BoPhanDangChoId) === Number(currentUser.boPhanId);
    const managerTurn = isManager && ["BB_MOI", "CHO_PHAN_BO_XU_LY", "CHO_PHAN_BO_XY_LY", "CHO_TP_B8"].includes(item.TrangThai);
    return explicitMyTurn || managerTurn ? "action" : "waiting";
};

export default function PhieuXuLyKhongPhuHopList() {
    const navigate = useNavigate();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [searchText, setSearchText] = useState("");
    const [workFilter, setWorkFilter] = useState("all");
    const currentUser = useMemo(() => decodeToken() || {}, []);
    const isManager = (currentUser.permissions || []).some((permission) =>
        ["QUAN_TRI_DM", "XAC_NHAN_NGUOI_XU_LY", "KET_LUAN"].includes(permission)
    );

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const res = await getStandaloneBienBanList();
            const rows = res.data || [];
            setData(rows);
            if (rows.some((item) => getWorkBucket(item, currentUser, isManager) === "action")) {
                setWorkFilter("action");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [currentUser, isManager]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const counts = useMemo(() => data.reduce((result, item) => {
        const bucket = getWorkBucket(item, currentUser, isManager);
        result[bucket] += 1;
        return result;
    }, { action: 0, waiting: 0, done: 0 }), [data, currentUser, isManager]);

    const filteredData = useMemo(() => {
        const keyword = searchText.trim().toLowerCase();
        return data.filter((item) => {
            if (workFilter !== "all" && getWorkBucket(item, currentUser, isManager) !== workFilter) return false;
            if (!keyword) return true;
            return String(item.SoBienBan || "").toLowerCase().includes(keyword) ||
                String(item.MoTaChung || "").toLowerCase().includes(keyword) ||
                String(item.NguoiLap || "").toLowerCase().includes(keyword);
        });
    }, [data, searchText, workFilter, currentUser, isManager]);

    const handleCreate = async () => {
        try {
            setCreating(true);
            const res = await createStandaloneBienBan();
            const bienBanId = res.data?.bienBanId;
            if (bienBanId) {
                navigate(`/phieu-xu-ly-khong-phu-hop/${bienBanId}`);
            }
        } catch (err) {
            console.error(err);
            window.alert(err?.response?.data?.message || "Không thể tạo phiếu xử lý không phù hợp");
        } finally {
            setCreating(false);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Fade in timeout={300}>
            <Box>
                <Stack
                    direction={{ xs: "column", md: "row" }}
                    justifyContent="space-between"
                    alignItems={{ xs: "stretch", md: "center" }}
                    spacing={2}
                    sx={{ mb: 3 }}
                >
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                        Phiếu xử lý không phù hợp
                    </Typography>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                        <TextField
                            size="small"
                            placeholder="Tìm số biên bản, người lập..."
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon fontSize="small" />
                                    </InputAdornment>
                                )
                            }}
                            sx={{ minWidth: { xs: "100%", sm: 280 } }}
                        />
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={handleCreate}
                            disabled={creating}
                        >
                            {creating ? "Đang tạo..." : "Tạo phiếu"}
                        </Button>
                    </Stack>
                </Stack>

                <Paper variant="outlined" sx={{ mb: 2, borderRadius: 2, overflow: "hidden" }}>
                    <Tabs
                        value={workFilter}
                        onChange={(_, value) => setWorkFilter(value)}
                        variant="scrollable"
                        scrollButtons="auto"
                        aria-label="Lọc phiếu theo công việc"
                    >
                        <Tab value="action" label={`Cần tôi xử lý (${counts.action})`} />
                        <Tab value="waiting" label={`Đang chờ (${counts.waiting})`} />
                        <Tab value="done" label={`Hoàn tất (${counts.done})`} />
                        <Tab value="all" label={`Tất cả (${data.length})`} />
                    </Tabs>
                </Paper>

                <Card sx={{ borderRadius: 3 }}>
                    <CardContent sx={{ p: 0 }}>
                        <TableContainer component={Paper} elevation={0}>
                            <Table>
                                <TableHead sx={{ bgcolor: "#f8fafc" }}>
                                    <TableRow>
                                        <TableCell>Số biên bản</TableCell>
                                        <TableCell>Mô tả chung</TableCell>
                                        <TableCell>Người lập</TableCell>
                                        <TableCell>Ngày tạo</TableCell>
                                        <TableCell>Tiến độ</TableCell>
                                        <TableCell>Trạng thái</TableCell>
                                        <TableCell align="center">Thao tác</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredData.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} align="center" sx={{ py: 4, color: "text.secondary" }}>
                                                Chưa có phiếu xử lý không phù hợp
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredData.map((item) => (
                                            <TableRow key={item.BienBanId} hover>
                                                <TableCell sx={{ fontWeight: 600 }}>{item.SoBienBan || `BB#${item.BienBanId}`}</TableCell>
                                                <TableCell>{item.MoTaChung || "---"}</TableCell>
                                                <TableCell>{item.NguoiLap || "---"}</TableCell>
                                                <TableCell>{item.CreatedAt ? new Date(item.CreatedAt).toLocaleString("vi-VN") : "---"}</TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight={600}>
                                                        {item.SoBoPhan > 0 ? `${item.DaCoYKien || 0}/${item.SoBoPhan} bộ phận` : "Chưa phân công"}
                                                    </Typography>
                                                    {item.BoPhanChuaXacNhanText && (
                                                        <Typography variant="caption" color="text.secondary">
                                                            Chờ: {item.BoPhanChuaXacNhanText}
                                                        </Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell>{renderTrangThaiChip(item.TrangThai)}</TableCell>
                                                <TableCell align="center">
                                                    <Button
                                                        size="small"
                                                        variant={getWorkBucket(item, currentUser, isManager) === "action" ? "contained" : "outlined"}
                                                        endIcon={<ArrowForwardIcon />}
                                                        onClick={() => navigate(`/phieu-xu-ly-khong-phu-hop/${item.BienBanId}`)}
                                                        sx={{ whiteSpace: "nowrap" }}
                                                    >
                                                        {getWorkBucket(item, currentUser, isManager) === "action"
                                                            ? "Xử lý ngay"
                                                            : getWorkBucket(item, currentUser, isManager) === "done" ? "Xem kết quả" : "Xem tiến độ"}
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </CardContent>
                </Card>
            </Box>
        </Fade>
    );
}
