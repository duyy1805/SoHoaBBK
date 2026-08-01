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
    const getDepartmentLabel = (item) => {
        const code = item.MaBoPhanTao || item.MaBoPhanNguoiKiem || "";
        const name = item.TenBoPhanTao || item.TenBoPhanNguoiKiem || item.TenBoPhan || "";
        return [code, name].filter(Boolean).join(" - ");
    };

    const includesFilter = (value, filter) => {
        const normalizedFilter = normalizeFilterText(filter);
        if (!normalizedFilter) return true;
        return normalizeFilterText(value).includes(normalizedFilter);
    };

    // Xử lý bộ lọc đa trường bằng useMemo
    const filteredData = useMemo(() => {
        return data.filter((item) => {
            if (!includesFilter(getLoaiKiemLabel(item), filterLoaiKiem)) return false;
            if (!includesFilter(
                `${item.TenNguoiKiem || ""} ${getDepartmentLabel(item)}`,
                filterNguoiKiem
            )) return false;
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
                const matchBoPhan = getDepartmentLabel(item).toLowerCase().includes(searchLower);

                if (!matchSoPhieu && !matchLot && !matchNguoiKiem && !matchSanPham && !matchBoPhan) {
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
                    sx={{ mb: 2.5 }}
                >
                    <Typography
                        variant="h5"
                        sx={{
                            fontWeight: 800,
                            fontSize: { xs: 22, md: 26 },
                            lineHeight: 1.2,
                            background: "linear-gradient(135deg, #1e293b 0%, #475569 100%)",
                            backgroundClip: "text",
                            WebkitTextFillColor: "transparent"
                        }}
                    >
                        Danh sách Phiếu kiểm
                    </Typography>

                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {hasPermission("THUC_HIEN_KIEM") && (
                            <Button size="small" variant="outlined" onClick={() => navigate("/phieu-kiem/cong-doan")}>
                                Phiếu công đoạn
                            </Button>
                        )}
                        {hasPermission("PHAN_BO_KIEM") && (
                            <Button
                                size="small"
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => navigate("/phieu-kiem/create")}
                                sx={{ boxShadow: "0 4px 14px rgba(99, 102, 241, 0.3)" }}
                            >
                                Phân bổ kiểm
                            </Button>
                        )}
                    </Stack>
                </Stack>

                {/* Filters Section */}
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 2 }}>
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
                        sx={{ width: { xs: "100%", sm: 320 }, bgcolor: "background.paper", borderRadius: 1 }}
                    />
                    <TextField
                        select
                        size="small"
                        label="Lọc theo trạng thái"
                        value={filterStatus}
                        onChange={(e) => {
                            updateFilter(setFilterStatus, "status", e.target.value);
                        }}
                        sx={{ width: { xs: "100%", sm: 210 }, bgcolor: "background.paper", borderRadius: 1 }}
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
                <Card
                    variant="outlined"
                    sx={{
                        borderRadius: 2,
                        borderColor: "#e2e8f0",
                        boxShadow: "0 4px 18px rgba(15, 23, 42, 0.04)",
                        overflow: "hidden"
                    }}
                >
                    <Stack spacing={1} sx={{ display: { xs: "flex", sm: "none" }, p: 1 }}>
                        {paginatedData.length === 0 ? (
                            <Typography color="text.secondary" textAlign="center" sx={{ py: 5 }}>Không tìm thấy phiếu kiểm nào.</Typography>
                        ) : paginatedData.map((item) => (
                            <Card
                                key={item.Id}
                                variant="outlined"
                                onClick={() => openDetail(item)}
                                sx={{ p: 1.5, cursor: "pointer", boxShadow: "none" }}
                            >
                                <Stack spacing={1}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                                        <Box sx={{ minWidth: 0 }}>
                                            <Typography color="primary" fontWeight={800}>{item.SoPhieu}</Typography>
                                            <Typography fontWeight={700}>{item.TenSanPham || "—"}</Typography>
                                            <Typography variant="caption" color="text.secondary">{item.MaSanPham || ""}</Typography>
                                        </Box>
                                        {renderTrangThaiChip(item.TrangThai)}
                                    </Stack>
                                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                                        <Chip label={getLoaiKiemLabel(item)} variant="outlined" size="small" />
                                        {item.KetLuan && renderKetLuanChip(item.KetLuan)}
                                    </Stack>
                                    <Typography variant="body2" color="text.secondary">
                                        Lot: {item.Lot || "—"} · HL {Number(item.SoLuongHieuLuc ?? item.SoLuong ?? 0).toLocaleString("vi-VN")}
                                    </Typography>
                                    <Typography variant="body2">
                                        {item.TenNguoiKiem || "Chưa phân công"} · {getDepartmentLabel(item) || "Chưa có bộ phận"}
                                    </Typography>
                                    <Button fullWidth variant="outlined" startIcon={<VisibilityIcon />} onClick={(event) => {
                                        event.stopPropagation();
                                        openDetail(item);
                                    }}>
                                        Mở phiếu
                                    </Button>
                                </Stack>
                            </Card>
                        ))}
                    </Stack>
                    <TableContainer ref={tableContainerRef} sx={{ maxHeight: 'calc(100vh - 235px)', display: { xs: "none", sm: "block" } }}>
                        <Table
                            stickyHeader
                            size="small"
                            sx={{
                                minWidth: 1180,
                                tableLayout: "fixed",
                                "& .MuiTableCell-root": {
                                    px: 1.5,
                                    py: 1.15,
                                    fontSize: 13,
                                    lineHeight: 1.35,
                                    verticalAlign: "middle",
                                    borderColor: "#edf0f4"
                                },
                                "& .MuiTableCell-head": {
                                    py: 1.25,
                                    color: "#334155",
                                    fontSize: 12.5,
                                    fontWeight: 800,
                                    lineHeight: 1.2,
                                    bgcolor: "#f8fafc"
                                },
                                "& .MuiChip-root": {
                                    height: 24,
                                    fontSize: 11.5
                                },
                                "& .MuiTableRow-root:hover": {
                                    bgcolor: "#f8fafc"
                                }
                            }}
                        >
                            <TableHead>
                                <TableRow hover>
                                    <TableCell sx={{ width: 132 }}>Số phiếu</TableCell>
                                    <TableCell sx={{ width: 135 }}>
                                        {renderFilterHeader({
                                            field: "loaiKiem",
                                            label: "Loại kiểm",
                                            value: filterLoaiKiem,
                                            onChange: (value) => updateFilter(setFilterLoaiKiem, "type", value),
                                            placeholder: "Nhập loại kiểm"
                                        })}
                                    </TableCell>
                                    <TableCell sx={{ width: 255 }}>Sản phẩm</TableCell>
                                    <TableCell sx={{ width: 100 }}>LOT</TableCell>
                                    <TableCell sx={{ width: 145 }} align="right">Số lượng</TableCell>
                                    <TableCell sx={{ width: 220 }}>
                                        {renderFilterHeader({
                                            field: "nguoiKiem",
                                            label: "Người kiểm / Bộ phận",
                                            value: filterNguoiKiem,
                                            onChange: (value) => updateFilter(setFilterNguoiKiem, "inspector", value),
                                            placeholder: "Nhập người kiểm hoặc bộ phận"
                                        })}
                                    </TableCell>
                                    <TableCell sx={{ width: 115 }} align="center">
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
                                    <TableCell sx={{ width: 135 }} align="center">Trạng thái</TableCell>
                                    <TableCell sx={{ width: 65 }} align="center">Xem</TableCell>
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
                                            sx={{ cursor: "pointer", transition: "background-color 0.15s ease" }}
                                        >
                                            <TableCell sx={{ color: 'primary.main' }}>
                                                <Typography
                                                    variant="body2"
                                                    fontWeight={800}
                                                    color="primary.main"
                                                    sx={{ fontSize: 12.75, lineHeight: 1.35, overflowWrap: "anywhere" }}
                                                >
                                                    {item.SoPhieu}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={item.TenLoaiKiem || `Loại ${item.LoaiKiemId || "—"}`}
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Tooltip title={item.TenSanPham || ""} placement="top-start">
                                                    <Typography
                                                        variant="body2"
                                                        fontWeight={700}
                                                        sx={{
                                                            fontSize: 13,
                                                            lineHeight: 1.35,
                                                            display: "-webkit-box",
                                                            WebkitLineClamp: 2,
                                                            WebkitBoxOrient: "vertical",
                                                            overflow: "hidden"
                                                        }}
                                                    >
                                                        {item.TenSanPham || "—"}
                                                    </Typography>
                                                </Tooltip>
                                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11.5 }}>
                                                    {item.MaSanPham || ""}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" noWrap sx={{ fontSize: 12.5 }}>
                                                    {item.Lot || "—"}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography variant="body2" fontWeight={800} color="primary.main" sx={{ fontSize: 13 }}>
                                                    HL {Number(item.SoLuongHieuLuc ?? item.SoLuong ?? 0).toLocaleString("vi-VN")}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: 11.25, mt: 0.25 }}>
                                                    KH {Number(item.SoLuongKeHoach ?? item.SoLuong ?? 0).toLocaleString("vi-VN")}
                                                    {" · "}TT {item.SoLuongThucTe == null ? "—" : Number(item.SoLuongThucTe).toLocaleString("vi-VN")}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={700} noWrap sx={{ fontSize: 12.75 }}>
                                                    {item.TenNguoiKiem || "—"}
                                                </Typography>
                                                <Tooltip title={getDepartmentLabel(item) || ""} placement="top-start">
                                                    <Typography
                                                        variant="caption"
                                                        color="text.secondary"
                                                        noWrap
                                                        display="block"
                                                        sx={{ fontSize: 11.5, mt: 0.25 }}
                                                    >
                                                        {getDepartmentLabel(item) || "—"}
                                                    </Typography>
                                                </Tooltip>
                                            </TableCell>
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
