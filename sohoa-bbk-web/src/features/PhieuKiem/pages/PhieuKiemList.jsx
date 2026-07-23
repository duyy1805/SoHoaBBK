// src/features/phieuKiem/pages/PhieuKiemList.jsx

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
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
    Tooltip,
    Popover
} from "@mui/material";
import {
    Add as AddIcon,
    FilterList as FilterListIcon,
    Search as SearchIcon,
    Visibility as VisibilityIcon
} from "@mui/icons-material";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { getPhieuKiem } from "../../../api/phieuKiem.api";
import { hasPermission } from "../../../utils/auth";

const VALID_PAGE_SIZES = [5, 10, 25, 50];
const parsePageParam = (value) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed - 1 : 0;
};

export default function PhieuKiemList() {
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filter & Pagination states
    const [filterStatus, setFilterStatus] = useState(() => searchParams.get("status") || "");
    const [filterLoaiKiem, setFilterLoaiKiem] = useState(() => searchParams.get("type") || "");
    const [filterNguoiKiem, setFilterNguoiKiem] = useState(() => searchParams.get("inspector") || "");
    const [filterKetLuan, setFilterKetLuan] = useState(() => searchParams.get("result") || "");
    const [filterPopover, setFilterPopover] = useState({ field: "", anchorEl: null });
    const [searchText, setSearchText] = useState(() => searchParams.get("q") || "");
    const [page, setPage] = useState(() => parsePageParam(searchParams.get("page")));
    const [rowsPerPage, setRowsPerPage] = useState(() => {
        const value = Number(searchParams.get("pageSize"));
        return VALID_PAGE_SIZES.includes(value) ? value : 50;
    });
    const tableContainerRef = useRef(null);
    const restoredScrollKeyRef = useRef("");

    const navigate = useNavigate();
    const listUrl = `${location.pathname}${location.search}`;
    const scrollStorageKey = `phieu-kiem:list-scroll:${listUrl}`;

    const updateQuery = useCallback((updates) => {
        setSearchParams((current) => {
            const next = new URLSearchParams(current);
            Object.entries(updates).forEach(([key, value]) => {
                if (value === "" || value === null || value === undefined) next.delete(key);
                else next.set(key, String(value));
            });
            return next;
        }, { replace: true });
    }, [setSearchParams]);

    useEffect(() => {
        setFilterStatus(searchParams.get("status") || "");
        setFilterLoaiKiem(searchParams.get("type") || "");
        setFilterNguoiKiem(searchParams.get("inspector") || "");
        setFilterKetLuan(searchParams.get("result") || "");
        setSearchText(searchParams.get("q") || "");
        setPage(parsePageParam(searchParams.get("page")));
        const pageSize = Number(searchParams.get("pageSize"));
        setRowsPerPage(VALID_PAGE_SIZES.includes(pageSize) ? pageSize : 50);
    }, [searchParams]);

    const getDetailPath = (item) => {
        if (item.LoaiKiemId === 3) return `/phieu-kiem/cuoi-chuyen/${item.Id}`;
        if (item.LoaiKiemId === 4) return `/phieu-kiem/sxbt/${item.Id}`;
        if (item.LoaiKiemId === 6) return `/phieu-kiem/tren-chuyen/${item.Id}`;
        return `/phieu-kiem/${item.Id}`;
    };

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
            case "TAO_MOI":
                return <Chip label="Chưa kiểm" size="small" />;
            case "DA_TAO_SECTION":
                return <Chip label="Chưa kiểm" size="small" />;
            case "DANG_KIEM":
                return <Chip label="Đang kiểm" color="warning" size="small" />;
            case "CHO_TBP_DUYET":
                return <Chip label="Chờ Trưởng bộ phận" color="secondary" size="small" />;
            case "CHO_XUONG_XAC_NHAN":
                return <Chip label="Chờ Trưởng bộ phận" color="info" size="small" />;
            case "CHO_KHO_XAC_NHAN":
                return <Chip label="Chờ Kho xác nhận" color="info" size="small" />;
            case "CHO_KIEM_NGHIEM":
                return <Chip label="Chờ Trưởng bộ phận" color="info" size="small" />;
            case "HOAN_TAT":
                return <Chip label="Hoàn tất" color="success" size="small" />;
            default:
                return <Chip label={trangThai} size="small" />;
        }
    };

    const normalizeFilterText = (value) => String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

    const getLoaiKiemLabel = (item) => item.TenLoaiKiem || (item.LoaiKiemId ? `Loại ${item.LoaiKiemId}` : "");

    const includesFilter = (value, filter) => {
        const normalizedFilter = normalizeFilterText(filter);
        if (!normalizedFilter) return true;
        return normalizeFilterText(value).includes(normalizedFilter);
    };

    // Xử lý bộ lọc đa trường bằng useMemo
    const filteredData = useMemo(() => {
        return data.filter((item) => {
            if (!includesFilter(getLoaiKiemLabel(item), filterLoaiKiem)) return false;
            if (!includesFilter(item.TenNguoiKiem || "", filterNguoiKiem)) return false;
            if (filterKetLuan && item.KetLuan !== filterKetLuan) return false;

            // Lọc theo trạng thái
            if (filterStatus === "CHO_TRUONG_BO_PHAN") {
                if (!["CHO_TBP_DUYET", "CHO_XUONG_XAC_NHAN"].includes(item.TrangThai)) return false;
            } else if (filterStatus && item.TrangThai !== filterStatus) {
                return false;
            }

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
    }, [data, filterLoaiKiem, filterNguoiKiem, filterKetLuan, filterStatus, searchText]);

    // Xử lý dữ liệu phân trang
    const paginatedData = useMemo(() => {
        const start = page * rowsPerPage;
        return filteredData.slice(start, start + rowsPerPage);
    }, [filteredData, page, rowsPerPage]);

    useEffect(() => {
        if (loading) return;
        const maxPage = Math.max(0, Math.ceil(filteredData.length / rowsPerPage) - 1);
        if (page > maxPage) {
            setPage(maxPage);
            updateQuery({ page: maxPage + 1 });
        }
    }, [filteredData.length, loading, page, rowsPerPage, updateQuery]);

    useEffect(() => {
        if (loading || restoredScrollKeyRef.current === scrollStorageKey) return;
        const savedScrollTop = Number(sessionStorage.getItem(scrollStorageKey));
        const frame = window.requestAnimationFrame(() => {
            if (tableContainerRef.current && Number.isFinite(savedScrollTop)) {
                tableContainerRef.current.scrollTop = savedScrollTop;
            }
            restoredScrollKeyRef.current = scrollStorageKey;
        });
        return () => window.cancelAnimationFrame(frame);
    }, [loading, paginatedData.length, scrollStorageKey]);

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
        updateQuery({ page: newPage + 1 });
    };

    const handleChangeRowsPerPage = (event) => {
        const nextPageSize = parseInt(event.target.value, 10);
        setRowsPerPage(nextPageSize);
        setPage(0);
        updateQuery({ pageSize: nextPageSize, page: 1 });
    };

    const updateFilter = (setter, queryKey, value) => {
        setter(value);
        setPage(0);
        updateQuery({ [queryKey]: value, page: 1 });
    };

    const openDetail = (item) => {
        if (tableContainerRef.current) {
            sessionStorage.setItem(scrollStorageKey, String(tableContainerRef.current.scrollTop));
        }
        navigate(getDetailPath(item), { state: { returnTo: listUrl } });
    };

    const closeFilterPopover = () => {
        setFilterPopover({ field: "", anchorEl: null });
    };

    const renderFilterHeader = ({ field, label, value, onChange, placeholder, options }) => {
        const isOpen = filterPopover.field === field;
        const hasValue = Boolean(value);

        return (
            <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="space-between">
                <span>{label}</span>
                <Tooltip title={`Lọc ${label.toLowerCase()}`}>
                    <IconButton
                        size="small"
                        color={hasValue ? "primary" : "default"}
                        onClick={(e) => {
                            e.stopPropagation();
                            setFilterPopover({ field, anchorEl: e.currentTarget });
                        }}
                        sx={{
                            width: 28,
                            height: 28,
                            bgcolor: hasValue ? "action.selected" : "transparent"
                        }}
                    >
                        <FilterListIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
                <Popover
                    open={isOpen}
                    anchorEl={filterPopover.anchorEl}
                    onClose={closeFilterPopover}
                    anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                    transformOrigin={{ vertical: "top", horizontal: "left" }}
                    PaperProps={{
                        sx: {
                            mt: 0.5,
                            borderRadius: 2,
                            boxShadow: "0 12px 32px rgba(15, 23, 42, 0.18)"
                        }
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <Box sx={{ p: 2, width: 280 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                            {label}
                        </Typography>
                        <TextField
                            autoFocus
                            select={Boolean(options)}
                            fullWidth
                            size="small"
                            placeholder={placeholder}
                            value={value}
                            onChange={(e) => {
                                onChange(e.target.value);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Escape") closeFilterPopover();
                            }}
                        >
                            {options?.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                </MenuItem>
                            ))}
                        </TextField>
                        <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mt: 2 }}>
                            <Button
                                variant="outlined"
                                size="small"
                                onClick={() => {
                                    onChange("");
                                }}
                            >
                                Bỏ lọc
                            </Button>
                            <Button variant="contained" size="small" onClick={closeFilterPopover}>
                                Đóng
                            </Button>
                        </Stack>
                    </Box>
                </Popover>
            </Stack>
        );
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
                            updateFilter(setSearchText, "q", e.target.value);
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
                            updateFilter(setFilterStatus, "status", e.target.value);
                        }}
                        sx={{ minWidth: { xs: "100%", sm: 200 }, bgcolor: "background.paper", borderRadius: 1 }}
                    >
                        <MenuItem value="">Tất cả</MenuItem>
                        <MenuItem value="DA_TAO_SECTION">Chưa kiểm</MenuItem>
                        <MenuItem value="DANG_KIEM">Đang kiểm</MenuItem>
                        <MenuItem value="CHO_TRUONG_BO_PHAN">Chờ Trưởng bộ phận</MenuItem>
                        <MenuItem value="CHO_KHO_XAC_NHAN">Chờ Kho xác nhận</MenuItem>
                        <MenuItem value="HOAN_TAT">Hoàn tất</MenuItem>
                    </TextField>
                </Stack>

                {/* Table Data Section */}
                <Card sx={{ borderRadius: 2, boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
                    <TableContainer ref={tableContainerRef} sx={{ maxHeight: 'calc(100vh - 280px)' }}>
                        <Table stickyHeader >
                            <TableHead>
                                <TableRow hover>
                                    <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>Số phiếu</TableCell>
                                    <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper', minWidth: 170 }}>
                                        {renderFilterHeader({
                                            field: "loaiKiem",
                                            label: "Loại kiểm",
                                            value: filterLoaiKiem,
                                            onChange: (value) => updateFilter(setFilterLoaiKiem, "type", value),
                                            placeholder: "Nhập loại kiểm"
                                        })}
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>Sản phẩm</TableCell>
                                    <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>LOT</TableCell>
                                    <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }} align="right">SL Kế hoạch</TableCell>
                                    <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper', minWidth: 170 }}>
                                        {renderFilterHeader({
                                            field: "nguoiKiem",
                                            label: "Người kiểm",
                                            value: filterNguoiKiem,
                                            onChange: (value) => updateFilter(setFilterNguoiKiem, "inspector", value),
                                            placeholder: "Nhập người kiểm"
                                        })}
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper', minWidth: 160 }} align="center">
                                        {renderFilterHeader({
                                            field: "ketLuan",
                                            label: "Kết luận",
                                            value: filterKetLuan,
                                            onChange: (value) => updateFilter(setFilterKetLuan, "result", value),
                                            placeholder: "Chọn kết luận",
                                            options: [
                                                { value: "", label: "Tất cả" },
                                                { value: "DAT", label: "Đạt" },
                                                { value: "KHONG_DAT", label: "Không đạt" }
                                            ]
                                        })}
                                    </TableCell>
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
                                            onClick={() => openDetail(item)}
                                            sx={{ cursor: "pointer", transition: "0.2s" }}
                                        >
                                            <TableCell sx={{ fontWeight: 600, color: 'primary.main' }}>
                                                {item.SoPhieu}
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={item.TenLoaiKiem || `Loại ${item.LoaiKiemId || "—"}`}
                                                    size="small"
                                                    variant="outlined"
                                                />
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
                                                {item.KetLuan ? renderKetLuanChip(item.KetLuan) : "—"}
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
                                                            e.stopPropagation();
                                                            openDetail(item);
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
