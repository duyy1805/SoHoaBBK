import { useEffect, useState, useMemo } from "react";
import {
    Box,
    Typography,
    Card,
    Chip,
    CircularProgress,
    Stack,
    Fade,
    TextField,
    MenuItem,
    LinearProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    InputAdornment,
    IconButton,
    Tooltip
} from "@mui/material";
import {
    Search as SearchIcon,
    Visibility as VisibilityIcon
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { getMyBienBan } from "../../api/bienBan.api"; // Giữ nguyên import của bạn

export default function BienBanList() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters & Pagination state
    const [filterStatus, setFilterStatus] = useState("");
    const [searchText, setSearchText] = useState("");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const navigate = useNavigate();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const res = await getMyBienBan();
            setData(res.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const isSxbtBienBan = (item) =>
        item.LoaiBienBan === "SXBT" ||
        item.LoaiKiemId === 4 ||
        String(item.TrangThai || "").startsWith("BB_SXBT");

    const renderTrangThaiChip = (item) => {
        const { TrangThai: trangThai } = item;
        if (isSxbtBienBan(item)) {
            if (trangThai === "BB_SXBT_HOAN_TAT") {
                return <Chip label="SXBT hoàn tất" color="success" size="small" sx={{ fontWeight: 500 }} />;
            }
            if (trangThai === "BB_SXBT_CHO_XAC_NHAN") {
                const waitingDepartment = item.MaBoPhanDangCho || item.TenBoPhanDangCho;
                return (
                    <Chip
                        label={waitingDepartment ? `Chờ ${waitingDepartment}` : "Đang xử lý SXBT"}
                        color="info"
                        size="small"
                        sx={{ fontWeight: 500 }}
                    />
                );
            }
            if (trangThai === "BB_SXBT_MOI" || trangThai === "BB_SXBT_TP_B8_DRAFT") {
                return <Chip label="Chờ xác nhận mức" color="warning" size="small" sx={{ fontWeight: 500 }} />;
            }
        }

        const statusMap = {
            "BB_MOI": { label: "Mới tạo", color: "default" },
            "CHO_PHAN_BO_XY_LY": { label: "Xin ý kiến", color: "warning" },
            "CHO_TP_B8": { label: "Chờ kết luận TP B8", color: "secondary" },
            "DA_KET_LUAN": { label: "Đã kết luận", color: "primary" },
            "CHO_XAC_NHAN": { label: "Chờ xác nhận", color: "info" },
            "DA_XAC_NHAN": { label: "Đã xác nhận", color: "success" }
        };
        const status = statusMap[trangThai] || { label: trangThai || "Mới tạo", color: "default" };

        return <Chip label={status.label} color={status.color} size="small" sx={{ fontWeight: 500 }} />;
    };

    // Lọc dữ liệu bằng useMemo để tối ưu hiệu năng
    const filteredData = useMemo(() => {
        return data.filter((item) => {
            // Lọc theo trạng thái
            if (filterStatus && item.TrangThai !== filterStatus) return false;

            // Lọc theo text (Tìm kiếm trên nhiều cột)
            if (searchText) {
                const searchLower = searchText.toLowerCase();
                const matchSoPhieu = item.SoPhieu?.toLowerCase().includes(searchLower);
                const matchSanPham = item.TenSanPham?.toLowerCase().includes(searchLower);
                const matchLot = item.Lot?.toLowerCase().includes(searchLower);
                const matchNguoiLap = item.NguoiLap?.toLowerCase().includes(searchLower);

                if (!matchSoPhieu && !matchSanPham && !matchLot && !matchNguoiLap) {
                    return false;
                }
            }
            return true;
        });
    }, [data, filterStatus, searchText]);

    // Xử lý phân trang
    const paginatedData = useMemo(() => {
        const startIndex = page * rowsPerPage;
        return filteredData.slice(startIndex, startIndex + rowsPerPage);
    }, [filteredData, page, rowsPerPage]);

    const handleChangePage = (event, newPage) => setPage(newPage);

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    if (loading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Fade in timeout={400}>
            <Box>
                {/* Header & Filters */}
                <Stack
                    direction={{ xs: "column", md: "row" }}
                    justifyContent="space-between"
                    alignItems={{ xs: "stretch", md: "center" }}
                    spacing={2}
                    sx={{ mb: 4 }}
                >
                    <Typography
                        variant="h5"
                        sx={{
                            fontWeight: 700,
                            background: "linear-gradient(135deg, #1e293b 0%, #475569 100%)",
                            backgroundClip: "text",
                            WebkitTextFillColor: "transparent"
                        }}
                    >
                        Danh sách Biên bản
                    </Typography>

                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                        <TextField
                            size="small"
                            placeholder="Tìm số phiếu, sản phẩm..."
                            value={searchText}
                            onChange={(e) => {
                                setSearchText(e.target.value);
                                setPage(0);
                            }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon fontSize="small" />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{ minWidth: { xs: '100%', sm: 260 } }}
                        />
                        <TextField
                            select
                            size="small"
                            label="Trạng thái"
                            value={filterStatus}
                            onChange={(e) => {
                                setFilterStatus(e.target.value);
                                setPage(0);
                            }}
                            sx={{ minWidth: { xs: '100%', sm: 180 } }}
                        >
                            <MenuItem value="">Tất cả</MenuItem>
                            <MenuItem value="BB_MOI">Mới tạo</MenuItem>
                            <MenuItem value="CHO_PHAN_BO_XY_LY">Xin ý kiến</MenuItem>
                            <MenuItem value="CHO_TP_B8">Chờ kết luận</MenuItem>
                            <MenuItem value="DA_KET_LUAN">Đã kết luận</MenuItem>
                            <MenuItem value="CHO_XAC_NHAN">Chờ xác nhận</MenuItem>
                            <MenuItem value="DA_XAC_NHAN">Đã xác nhận</MenuItem>
                            <MenuItem value="BB_SXBT_MOI">SXBT chờ xác nhận mức</MenuItem>
                            <MenuItem value="BB_SXBT_TP_B8_DRAFT">SXBT chờ xác nhận mức</MenuItem>
                            <MenuItem value="BB_SXBT_CHO_XAC_NHAN">SXBT đang xử lý</MenuItem>
                            <MenuItem value="BB_SXBT_HOAN_TAT">SXBT hoàn tất</MenuItem>
                        </TextField>
                    </Stack>
                </Stack>

                {/* Data Table */}
                <Card sx={{ borderRadius: 2, boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
                    <TableContainer sx={{ maxHeight: 'calc(100vh - 240px)' }}>
                        <Table
                            stickyHeader
                            sx={{
                                "& tbody tr:hover": {
                                    backgroundColor: "#f5f5f5"
                                }
                            }}
                        >
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>Số Phiếu</TableCell>
                                    <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>Sản Phẩm</TableCell>
                                    <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>Lot</TableCell>
                                    <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>Người Lập</TableCell>
                                    <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>Ngày Tạo</TableCell>
                                    <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper', width: 200 }}>Tiến Độ</TableCell>
                                    <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }} align="center">Trạng Thái</TableCell>
                                    <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }} align="center">Thao tác</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                                            <Typography color="text.secondary">
                                                Không tìm thấy biên bản nào phù hợp.
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedData.map((item) => (
                                        <TableRow
                                            key={item.BienBanId}
                                            hover
                                            onClick={() => navigate(
                                                isSxbtBienBan(item)
                                                    ? `/bien-ban/sxbt/${item.BienBanId}`
                                                    : `/bien-ban/${item.BienBanId}`
                                            )}
                                            sx={{ cursor: "pointer", transition: "0.2s" }}
                                        >
                                            <TableCell sx={{ fontWeight: 500, color: 'primary.main' }}>
                                                {item.SoPhieu}
                                            </TableCell>
                                            <TableCell>{item.TenSanPham || "—"}</TableCell>
                                            <TableCell>{item.Lot || "—"}</TableCell>
                                            <TableCell>{item.NguoiLap || "—"}</TableCell>
                                            <TableCell>
                                                {item.CreatedAt ? new Date(item.CreatedAt).toLocaleDateString('vi-VN') : "—"}
                                            </TableCell>
                                            <TableCell onClick={(e) => e.stopPropagation() /* Tránh click bar làm trigger row click */}>
                                                <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {isSxbtBienBan(item)
                                                            ? item.SoBoPhan > 0
                                                                ? `Xác nhận ${item.DaCoYKien}/${item.SoBoPhan} bộ phận`
                                                                : "Chưa mở luồng"
                                                            : `${item.DaCoYKien}/${item.SoBoPhan} bộ phận`}
                                                    </Typography>
                                                    <Typography variant="caption" fontWeight="bold" color="primary">
                                                        {item.ProgressPercent}%
                                                    </Typography>
                                                </Stack>
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={item.ProgressPercent || 0}
                                                    sx={{ height: 6, borderRadius: 3 }}
                                                />
                                            </TableCell>
                                            <TableCell align="center">
                                                {renderTrangThaiChip(item)}
                                            </TableCell>
                                            <TableCell align="center">
                                                <Tooltip title="Xem chi tiết">
                                                    <IconButton
                                                        size="small"
                                                        color="primary"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(
                                                                isSxbtBienBan(item)
                                                                    ? `/bien-ban/sxbt/${item.BienBanId}`
                                                                    : `/bien-ban/${item.BienBanId}`
                                                            );
                                                        }}
                                                    >
                                                        <VisibilityIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <TablePagination
                        component="div"
                        count={filteredData.length}
                        page={page}
                        onPageChange={handleChangePage}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        labelRowsPerPage="Số dòng/trang:"
                        labelDisplayedRows={({ from, to, count }) => `${from}-${to} trên ${count}`}
                        rowsPerPageOptions={[5, 10, 25, 50]}
                    />
                </Card>
            </Box>
        </Fade>
    );
}
