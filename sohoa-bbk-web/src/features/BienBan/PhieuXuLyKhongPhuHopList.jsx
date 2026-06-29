import { useEffect, useMemo, useState } from "react";
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
    IconButton
} from "@mui/material";
import { Add as AddIcon, Search as SearchIcon, Visibility as VisibilityIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { createStandaloneBienBan, getStandaloneBienBanList } from "../../api/bienBan.api";

const renderTrangThaiChip = (trangThai) => {
    const statusMap = {
        BB_MOI: { label: "Mới tạo", color: "default" },
        CHO_PHAN_BO_XU_LY: { label: "Chờ phân bổ xử lý", color: "warning" },
        CHO_TP_B8: { label: "Chờ TP B8", color: "secondary" },
        HOAN_THANH: { label: "Hoàn thành", color: "success" }
    };

    const status = statusMap[trangThai] || { label: trangThai || "Mới tạo", color: "default" };
    return <Chip label={status.label} color={status.color} size="small" sx={{ fontWeight: 500 }} />;
};

export default function PhieuXuLyKhongPhuHopList() {
    const navigate = useNavigate();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [searchText, setSearchText] = useState("");

    const loadData = async () => {
        try {
            setLoading(true);
            const res = await getStandaloneBienBanList();
            setData(res.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const filteredData = useMemo(() => {
        const keyword = searchText.trim().toLowerCase();
        if (!keyword) return data;
        return data.filter((item) =>
            String(item.SoBienBan || "").toLowerCase().includes(keyword) ||
            String(item.MoTaChung || "").toLowerCase().includes(keyword) ||
            String(item.NguoiLap || "").toLowerCase().includes(keyword)
        );
    }, [data, searchText]);

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
                                        <TableCell align="center">Chi tiết</TableCell>
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
                                                <TableCell>{`${item.DaCoYKien || 0}/${item.SoBoPhan || 0}`}</TableCell>
                                                <TableCell>{renderTrangThaiChip(item.TrangThai)}</TableCell>
                                                <TableCell align="center">
                                                    <IconButton onClick={() => navigate(`/phieu-xu-ly-khong-phu-hop/${item.BienBanId}`)}>
                                                        <VisibilityIcon fontSize="small" />
                                                    </IconButton>
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
