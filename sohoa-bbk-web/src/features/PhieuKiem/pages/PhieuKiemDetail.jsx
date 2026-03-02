// src/features/phieuKiem/pages/PhieuKiemDetail.jsx

import { useEffect, useState } from "react";
import {
    Box,
    Typography,
    Card,
    CardContent,
    Grid,
    Chip,
    Stack,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Divider,
    CircularProgress,
    Button,
    Fade,
    alpha,
    TextField,
    MenuItem
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AssignmentIcon from "@mui/icons-material/Assignment";
import BugReportIcon from "@mui/icons-material/BugReport";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import {
    getPhieuKiemDetail,
    // ketLuanPhieuKiem,
    createAllSection
} from "../../../api/phieuKiem.api";
import { hasPermission } from "../../../utils/auth";

export default function PhieuKiemDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [phieu, setPhieu] = useState(null);
    const [sections, setSections] = useState([]);
    const [checkItems, setCheckItems] = useState([]);
    const [defects, setDefects] = useState([]);
    const [loading, setLoading] = useState(true);

    // Section config state
    const [lotSize, setLotSize] = useState("");
    const [inspectionLevel, setInspectionLevel] = useState("II");
    const [creatingSection, setCreatingSection] = useState(false);

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        try {
            const res = await getPhieuKiemDetail(id);
            setPhieu(res.data.phieu);
            console.log(res.data.phieu)
            setSections(res.data.sections);
            setCheckItems(res.data.checkItems);
            setDefects(res.data.defects);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSection = async () => {
        if (!lotSize || !inspectionLevel) return;

        try {
            setCreatingSection(true);

            await createAllSection({
                phieuKiemId: id,
                lotSize: Number(lotSize),
                inspectionLevel
            });

            await loadData();
        } catch (err) {
            console.error(err);
        } finally {
            setCreatingSection(false);
        }
    };

    // const handleKetLuan = async (ketLuan) => {
    //     await ketLuanPhieuKiem({
    //         phieuKiemId: id,
    //         ketLuan
    //     });
    //     loadData();
    // };

    if (loading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
                <CircularProgress />
            </Box>
        );
    }

    const renderKetLuanChip = (value) => {
        if (value === "DAT")
            return <Chip icon={<CheckCircleIcon />} label="Đạt" color="success" />;
        if (value === "KHONG_DAT")
            return <Chip icon={<CancelIcon />} label="Không đạt" color="error" />;
        return <Chip label="Chưa kết luận" />;
    };

    return (
        <Fade in timeout={300}>
            <Box>
                {/* HEADER */}
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                    <Button
                        startIcon={<ArrowBackIcon />}
                        onClick={() => navigate(-1)}
                    >
                        Quay lại
                    </Button>

                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        Chi tiết Phiếu kiểm
                    </Typography>
                </Stack>

                {/* THÔNG TIN PHIẾU */}
                <Card sx={{ mb: 4, borderRadius: 3 }}>
                    <CardContent>
                        <Grid container spacing={3}>
                            <Grid size={{ xs: 3 }}>
                                <Typography variant="subtitle2">Số phiếu</Typography>
                                <Typography fontWeight={600}>{phieu?.SoPhieu}</Typography>
                            </Grid>

                            <Grid size={{ xs: 3 }}>
                                <Typography variant="subtitle2">Tên sản phẩm</Typography>
                                <Typography fontWeight={600}>{phieu?.TenSanPham}</Typography>
                            </Grid>

                            <Grid size={{ xs: 3 }}>
                                <Typography variant="subtitle2">Itemcode</Typography>
                                <Typography fontWeight={600}>{phieu?.MaSanPham}</Typography>
                            </Grid>

                            <Grid size={{ xs: 3 }}>
                                <Typography variant="subtitle2">LOT</Typography>
                                <Typography fontWeight={600}>{phieu?.Lot}</Typography>
                            </Grid>

                            <Grid size={{ xs: 3 }}>
                                <Typography variant="subtitle2">Số lượng kế hoạch</Typography>
                                <Typography fontWeight={600}>{phieu?.SoLuong}</Typography>
                            </Grid>

                            <Grid size={{ xs: 3 }}>
                                <Typography variant="subtitle2">Số lượng kiểm (AQL)</Typography>
                                <Typography fontWeight={600}>{phieu?.SoLuongKiem}</Typography>
                            </Grid>

                            <Grid size={{ xs: 3 }}>
                                <Typography variant="subtitle2">Người kiểm</Typography>
                                <Typography fontWeight={600}>{phieu?.TenNguoiKiem}</Typography>
                            </Grid>

                            <Grid size={{ xs: 3 }}>
                                <Typography variant="subtitle2">Kết luận</Typography>
                                {renderKetLuanChip(phieu?.KetLuan)}
                            </Grid>
                        </Grid>
                    </CardContent>
                </Card>

                {/* TẠO SECTION (CHỈ TỔ TRƯỞNG) */}
                {phieu?.TrangThai === "TAO_MOI" &&
                    hasPermission("PHAN_BO_KIEM") && (
                        <Card sx={{ mb: 4, p: 3 }}>
                            <Typography variant="h6" sx={{ mb: 2 }}>
                                Cấu hình kiểm
                            </Typography>

                            <Grid container spacing={3}>
                                <Grid size={{ xs: 6 }}>
                                    <TextField
                                        label="Lot Size"
                                        type="number"
                                        fullWidth
                                        value={lotSize}
                                        onChange={(e) => setLotSize(e.target.value)}
                                    />
                                </Grid>

                                <Grid size={{ xs: 6 }}>
                                    <TextField
                                        select
                                        label="Inspection Level"
                                        fullWidth
                                        value={inspectionLevel}
                                        onChange={(e) =>
                                            setInspectionLevel(e.target.value)
                                        }
                                    >
                                        <MenuItem value="I">I</MenuItem>
                                        <MenuItem value="II">II</MenuItem>
                                        <MenuItem value="S-2">S-2</MenuItem>
                                    </TextField>
                                </Grid>

                                <Grid size={{ xs: 12 }}>
                                    <Button
                                        variant="contained"
                                        onClick={handleCreateSection}
                                        disabled={creatingSection}
                                    >
                                        {creatingSection
                                            ? "Đang tạo..."
                                            : "Tạo Section"}
                                    </Button>
                                </Grid>
                            </Grid>
                        </Card>
                    )}

                {/* HIỂN THỊ SECTION */}
                {sections.map((section) => {
                    const sectionCheckItems = checkItems.filter(
                        (ci) => ci.SectionId === section.Id
                    );

                    return (
                        <Accordion defaultExpanded key={section.Id} sx={{ mb: 3 }}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Stack direction="row" spacing={2} alignItems="center">
                                    <AssignmentIcon color="primary" />
                                    <Typography fontWeight={600}>
                                        {section.TenNhom}
                                    </Typography>
                                </Stack>
                            </AccordionSummary>

                            <AccordionDetails>
                                {sectionCheckItems.map((item) => {
                                    const itemDefects = defects.filter(
                                        (d) => d.CheckItemId === item.Id
                                    );

                                    const critical = itemDefects
                                        .filter(d => d.DefectType === "CRITICAL")
                                        .reduce((sum, d) => sum + d.SoLuong, 0);

                                    const major = itemDefects
                                        .filter(d => d.DefectType === "MAJOR")
                                        .reduce((sum, d) => sum + d.SoLuong, 0);

                                    const minor = itemDefects
                                        .filter(d => d.DefectType === "MINOR")
                                        .reduce((sum, d) => sum + d.SoLuong, 0);

                                    const totalLoi = item.SoLuongLoi || 0;

                                    const isChuaKiem = !item.KetQua;
                                    const isDat = item.KetQua === "DAT";
                                    const isKhongDat = item.KetQua === "KHONG_DAT";

                                    return (
                                        <Card
                                            key={item.Id}
                                            sx={{
                                                mb: 1.5,
                                                px: 2,
                                                py: 1.5,
                                                borderRadius: 3,
                                                border: "1px solid",
                                                borderColor:
                                                    totalLoi > 0 ? "error.light" : "success.light",
                                                bgcolor:
                                                    totalLoi > 0
                                                        ? alpha("#ef4444", 0.05)
                                                        : alpha("#22c55e", 0.05)
                                            }}
                                        >
                                            <Grid container alignItems="center">

                                                {/* TÊN MỤC */}
                                                <Grid size={{ xs: 4 }}>
                                                    <Typography fontWeight={500}>
                                                        {item.TenMucKiem}
                                                    </Typography>
                                                </Grid>

                                                {/* TỔNG LỖI */}
                                                <Grid size={{ xs: 2 }}>
                                                    <Chip
                                                        label={`Tổng lỗi: ${totalLoi}`}
                                                        size="small"
                                                    />
                                                </Grid>

                                                {/* CRITICAL */}
                                                <Grid size={{ xs: 1.5 }}>
                                                    <Chip
                                                        label={`Critical: ${critical}`}
                                                        size="small"
                                                        color={critical > 0 ? "error" : "default"}
                                                    />
                                                </Grid>

                                                {/* MAJOR */}
                                                <Grid size={{ xs: 1.5 }}>
                                                    <Chip
                                                        label={`Major: ${major}`}
                                                        size="small"
                                                        color={major > 0 ? "warning" : "default"}
                                                    />
                                                </Grid>

                                                {/* MINOR */}
                                                <Grid size={{ xs: 1.5 }}>
                                                    <Chip
                                                        label={`Minor: ${minor}`}
                                                        size="small"
                                                        color={minor > 0 ? "info" : "default"}
                                                    />
                                                </Grid>

                                                {/* TRẠNG THÁI */}
                                                <Grid size={{ xs: 1.5 }}>
                                                    {isChuaKiem && (
                                                        <Chip label="Chưa kiểm tra" size="small" />
                                                    )}

                                                    {isDat && (
                                                        <Chip label="Đạt" color="success" size="small" />
                                                    )}

                                                    {isKhongDat && (
                                                        <Chip label="Có lỗi" color="error" size="small" />
                                                    )}
                                                </Grid>

                                            </Grid>
                                        </Card>
                                    );
                                })}
                            </AccordionDetails>
                        </Accordion>
                    );
                })}

            </Box>
        </Fade>
    );
}