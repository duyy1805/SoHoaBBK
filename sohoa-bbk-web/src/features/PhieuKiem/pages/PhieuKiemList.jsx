// src/features/phieuKiem/pages/PhieuKiemList.jsx

import { useEffect, useState, useMemo } from "react";
import {
    Box,
    Typography,
    Card,
    Chip,
    CircularProgress,
    Stack,
    Button,
    Fade,
    TextField,
    MenuItem,
    InputAdornment,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    IconButton,
    Tooltip
} from "@mui/material";
import {
    Add as AddIcon,
    Search as SearchIcon,
    Visibility as VisibilityIcon
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { getPhieuKiem } from "../../../api/phieuKiem.api";
import { hasPermission } from "../../../utils/auth";

export default function PhieuKiemList() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filter & Pagination states
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
            const res = await getPhieuKiem();
            setData(res.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const renderKetLuanChip = (ketLuan) => {
        if (ketLuan === "DAT")
            return <Chip label="Đạt" color="success" size="small" />;
        if (ketLuan === "KHONG_DAT")
            return <Chip label="Không đạt" color="error" size="small" />;
        return <Chip label="Chưa kết luận" size="small" sx={{ color: "text.secondary" }} />;
    };

    const renderTrangThaiChip = (trangThai) => {
        switch (trangThai) {
            case "DA_TAO_SECTION":
                return <Chip label="Chưa kiểm" size="small" />;
            case "DANG_KIEM":
                return <Chip label="Đang kiểm" color="warning" size="small" />;
            case "CHO_XUONG_XAC_NHAN":
                return <Chip label="Chờ PX xác nhận" color="info" size="small" />;
            case "CHO_KIEM_NGHIEM":
                return <Chip label="Chờ kiểm nghiệm" color="secondary" size="small" />;
            case "HOAN_TAT":
                return <Chip label="Hoàn tất" color="success" size="small" />;
            default:
                return <Chip label={trangThai} size="small" />;
        }
    };

    // Xử lý bộ lọc đa trường bằng useMemo
    const filteredData = useMemo(() => {
        return data.filter((item) => {
            // Lọc theo trạng thái
            if (filterStatus && item.TrangThai !== filterStatus) return false;

            // Lọc theo keyword (tìm trên Số phiếu, Lot, Người kiểm, Tên Sản Phẩm)
            if (searchText) {
                const searchLower = searchText.toLowerCase();
                const matchSoPhieu = item.SoPhieu?.toLowerCase().includes(searchLower);
                const matchLot = item.Lot?.toLowerCase().includes(searchLower);
                const matchNguoiKiem = item.TenNguoiKiem?.toLowerCase().includes(searchLower);
                const matchSanPham = item.TenSanPham?.toLowerCase().includes(searchLower); // Đã thêm lọc theo sản phẩm

                if (!matchSoPhieu && !matchLot && !matchNguoiKiem && !matchSanPham) {
                    return false;
                }
            }

            return true;
        });
    }, [data, filterStatus, searchText]);

    // Xử lý dữ liệu phân trang
    const paginatedData = useMemo(() => {
        const start = page * rowsPerPage;
        return filteredData.slice(start, start + rowsPerPage);
    }, [filteredData, page, rowsPerPage]);

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

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
                {/* Header Section */}
                <Stack
                    direction={{ xs: "column", md: "row" }}
                    justifyContent="space-between"
                    alignItems={{ xs: "stretch", md: "center" }}
                    spacing={2}
                    sx={{ mb: 4 }}
                >
                    <Typography
                        variant="h4"
                        sx={{
                            fontWeight: 700,
                            background: "linear-gradient(135deg, #1e293b 0%, #475569 100%)",
                            backgroundClip: "text",
                            WebkitTextFillColor: "transparent"
                        }}
                    >
                        Danh sách Phiếu kiểm
                    </Typography>

                    {hasPermission("PHAN_BO_KIEM") && (
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => navigate("/phieu-kiem/create")}
                            sx={{ boxShadow: "0 4px 14px rgba(99, 102, 241, 0.3)" }}
                        >
                            Phân bổ kiểm
                        </Button>
                    )}
                </Stack>

                {/* Filters Section */}
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 3 }}>
                    <TextField
                        size="small"
                        placeholder="Tìm Số phiếu, Sản phẩm, Lot..."
                        value={searchText}
                        onChange={(e) => {
                            setSearchText(e.target.value);
                            setPage(0); // Reset page khi tìm kiếm
                        }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon fontSize="small" />
                                </InputAdornment>
                            ),
                        }}
                        sx={{ minWidth: { xs: "100%", sm: 300 }, bgcolor: "background.paper", borderRadius: 1 }}
                    />
                    <TextField
                        select
                        size="small"
                        label="Lọc theo trạng thái"
                        value={filterStatus}
                        onChange={(e) => {
                            setFilterStatus(e.target.value);
                            setPage(0); // Reset page khi tìm kiếm
                        }}
                        sx={{ minWidth: { xs: "100%", sm: 200 }, bgcolor: "background.paper", borderRadius: 1 }}
                    >
                        <MenuItem value="">Tất cả</MenuItem>
                        <MenuItem value="DA_TAO_SECTION">Chưa kiểm</MenuItem>
                        <MenuItem value="DANG_KIEM">Đang kiểm</MenuItem>
                        <MenuItem value="CHO_XUONG_XAC_NHAN">Chờ PX xác nhận</MenuItem>
                        <MenuItem value="CHO_KIEM_NGHIEM">Chờ kiểm nghiệm</MenuItem>
                        <MenuItem value="HOAN_TAT">Hoàn tất</MenuItem>
                    </TextField>
                </Stack>

                {/* Table Data Section */}
                <Card sx={{ borderRadius: 2, boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
                    <TableContainer sx={{ maxHeight: 'calc(100vh - 280px)' }}>
                        <Table stickyHeader >
                            <TableHead>
                                <TableRow hover>
                                    <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>Số phiếu</TableCell>
                                    <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>Mã CT Nhập</TableCell>
                                    <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>Sản phẩm</TableCell>
                                    <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>LOT</TableCell>
                                    <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }} align="right">SL Kế hoạch</TableCell>
                                    <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>Người kiểm</TableCell>
                                    <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }} align="center">Kết luận</TableCell>
                                    <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }} align="center">Trạng thái</TableCell>
                                    <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }} align="center">Thao tác</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                                            <Typography color="text.secondary">
                                                Không tìm thấy phiếu kiểm nào.
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedData.map((item) => (
                                        <TableRow
                                            key={item.Id}
                                            hover
                                            onClick={() => navigate(`/phieu-kiem/${item.Id}`)}
                                            sx={{ cursor: "pointer", transition: "0.2s" }}
                                        >
                                            <TableCell sx={{ fontWeight: 600, color: 'primary.main' }}>
                                                {item.SoPhieu}
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 500 }}>
                                                {item.ID_ChungTuNhap || "—"}
                                            </TableCell>
                                            <TableCell>
                                                {/* Hiển thị Tên Sản Phẩm */}
                                                <Typography variant="body2" fontWeight={500}>{item.TenSanPham || "—"}</Typography>
                                                <Typography variant="caption" color="text.secondary">{item.MaSanPham}</Typography>
                                            </TableCell>
                                            <TableCell>{item.Lot || "—"}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 500 }}>
                                                {/* Hiển thị Số Lượng */}
                                                {item.SoLuong ? item.SoLuong.toLocaleString('vi-VN') : "—"}
                                            </TableCell>
                                            <TableCell>{item.TenNguoiKiem || "—"}</TableCell>
                                            <TableCell align="center">
                                                {item.TrangThai === "HOAN_TAT" ? renderKetLuanChip(item.KetLuan) : "—"}
                                            </TableCell>
                                            <TableCell align="center">
                                                {renderTrangThaiChip(item.TrangThai)}
                                            </TableCell>
                                            <TableCell align="center">
                                                <Tooltip title="Xem chi tiết">
                                                    <IconButton
                                                        color="primary"
                                                        size="small"
                                                        onClick={(e) => {
                                                            e.stopPropagation(); // Ngăn sự kiện click bubble lên TableRow
                                                            navigate(`/phieu-kiem/${item.Id}`);
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

                    {/* Pagination */}
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