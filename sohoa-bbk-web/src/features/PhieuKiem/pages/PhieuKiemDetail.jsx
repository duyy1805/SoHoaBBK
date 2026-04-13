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
    CircularProgress,
    Button,
    Fade,
    alpha,
    TextField,
    MenuItem,
    Paper,
    Container
} from "@mui/material";
import { PhieuKiemPrintTemplate } from "../components/PhieuKiemPrintTemplate";
import { PhieuGiamDinhPrintTemplate } from "../components/PhieuGiamDinhPrintTemplate"
import PrintIcon from "@mui/icons-material/Print";
import { useReactToPrint } from "react-to-print";
import { Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import { useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AssignmentIcon from "@mui/icons-material/Assignment";

import {
    getPhieuKiemDetail,
    createAllSection,
    saveCustomFields
} from "../../../api/phieuKiem.api";

import { getSanPhamNhomKiem, getInspectionLevels } from "../../../api/lookup.api"

import { hasPermission } from "../../../utils/auth";

export default function PhieuKiemDetail() {

    const { id } = useParams();
    const navigate = useNavigate();

    const [phieu, setPhieu] = useState(null);
    const [sections, setSections] = useState([]);
    const [checkItems, setCheckItems] = useState([]);
    const [defects, setDefects] = useState([]);
    const [dynamicFields, setDynamicFields] = useState([]);
    const [nhomConfigs, setNhomConfigs] = useState([]);
    const [levels, setLevels] = useState([]);

    const [loading, setLoading] = useState(true);
    const [creatingSection, setCreatingSection] = useState(false);
    const componentRef = useRef();
    const [openPrintModal, setOpenPrintModal] = useState(false);

    // Đổi tên hàm của thư viện thành triggerPrint
    const triggerPrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: phieu ? `PhieuKiem_${phieu.SoPhieu}` : 'PhieuKiem',
    });

    const handlePrint = async () => {
        try {
            // 1. Gom dữ liệu từ các thẻ input có className="custom-field"
            const inputs = document.querySelectorAll('.custom-field');
            const fieldsData = {};

            inputs.forEach(input => {
                if (input.name) {
                    fieldsData[input.name] = input.value;
                }
            });

            // 2. Gọi API lưu dữ liệu qua axiosClient
            await saveCustomFields({
                phieuKiemId: phieu.Id,
                fields: fieldsData
            });

            // 3. API chạy thành công thì mới mở popup In của trình duyệt
            triggerPrint();

        } catch (error) {
            console.error("Lỗi khi lưu dữ liệu in:", error);
            // Có thể thay bằng thư viện toast của bạn (ví dụ: toast.error(...))
            alert("Lưu thông tin thất bại. Vui lòng thử lại!");
        }
    };

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        try {
            const res = await getPhieuKiemDetail(id);
            const data = res.data;
            setPhieu(data.phieu);
            setSections(data.sections);
            setCheckItems(data.checkItems);
            setDefects(data.defects);
            setDynamicFields(data.dynamicFields);
            if (data.phieu?.SanPhamId && data.phieu.TrangThai === "TAO_MOI") {

                const nhomRes = await getSanPhamNhomKiem(data.phieu.SanPhamId);

                const configs = nhomRes.data.map(n => ({
                    nhomKiemId: n.NhomKiemId,
                    tenNhom: n.TenNhom,
                    lotSize: data.phieu.SoLuong,
                    inspectionLevel: "II"
                }));
                console.log(configs)
                setNhomConfigs(configs);

                const levelsRes = await getInspectionLevels();
                setLevels(levelsRes.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };


    const updateConfig = (index, field, value) => {

        const newConfigs = [...nhomConfigs];
        newConfigs[index][field] = value;
        setNhomConfigs(newConfigs);

    };

    const handleCreateSection = async () => {

        try {

            setCreatingSection(true);

            const payload = {

                phieuKiemId: id,

                sections: nhomConfigs.map(n => ({
                    nhomKiemId: n.nhomKiemId,
                    lotSize: Number(n.lotSize),
                    inspectionLevel: n.inspectionLevel
                }))

            };

            await createAllSection(payload);

            await loadData();

        } catch (err) {

            console.error(err);

        } finally {

            setCreatingSection(false);

        }

    };

    if (loading) {

        return (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
                <CircularProgress />
            </Box>
        );

    }

    const renderKetLuanChip = (value) => {

        if (value === "DAT")
            return <Chip label="Đạt" color="success" size="small" />;

        if (value === "KHONG_DAT")
            return <Chip label="Không đạt" color="error" size="small" />;

        return <Chip label="Chưa kết luận" size="small" />;

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

    return (
        <Fade in timeout={300}>
            <Box>

                {/* HEADER */}

                <Paper elevation={0} sx={{ p: 2, mb: 3, borderBottom: '1px solid #e0e0e0', position: 'sticky', top: 0, zIndex: 10 }}>
                    <Container maxWidth="xl">
                        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" spacing={2}>
                            <Button
                                startIcon={<ArrowBackIcon />}
                                onClick={() => navigate(-1)}
                                color="inherit"
                            >
                                Danh sách phiếu kiểm
                            </Button>
                            <Stack direction="row" spacing={2}>
                                {phieu?.BienBanId && (
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        startIcon={<AssignmentIcon />}
                                        onClick={() => navigate(`/bien-ban/${phieu.BienBanId}`)}
                                    >
                                        Xem biên bản KPH
                                    </Button>
                                )}
                                <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => setOpenPrintModal(true)}>
                                    In phiếu kiểm
                                </Button>
                            </Stack>
                        </Stack>
                    </Container>
                </Paper>
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
                                <Typography variant="subtitle2">Người kiểm</Typography>
                                <Typography fontWeight={600}>{phieu?.TenNguoiKiem}</Typography>
                            </Grid>
                            <Grid size={{ xs: 3 }}>
                                <Typography variant="subtitle2">Trạng thái</Typography>
                                {renderTrangThaiChip(phieu?.TrangThai)}
                            </Grid>
                            <Grid size={{ xs: 3 }}>
                                <Typography variant="subtitle2">Kết luận</Typography>
                                {renderKetLuanChip(phieu?.KetLuan)}
                            </Grid>
                        </Grid>

                    </CardContent>
                </Card>

                {/* CẤU HÌNH AQL */}

                {phieu?.TrangThai === "TAO_MOI" &&
                    hasPermission("PHAN_BO_KIEM") && (

                        <Card sx={{ mb: 4, p: 3 }}>

                            <Typography variant="h6" sx={{ mb: 3 }}>
                                Cấu hình AQL theo nhóm kiểm
                            </Typography>

                            {nhomConfigs.map((n, index) => (

                                <Grid container spacing={2} key={n.nhomKiemId} sx={{ mb: 2 }}>

                                    <Grid size={{ xs: 4 }}>
                                        <Typography sx={{ mt: 1 }}>
                                            {n.tenNhom}
                                        </Typography>
                                    </Grid>

                                    <Grid size={{ xs: 4 }}>
                                        <TextField
                                            label="Lot Size"
                                            type="number"
                                            fullWidth
                                            value={n.lotSize}
                                            onChange={(e) =>
                                                updateConfig(index, "lotSize", e.target.value)
                                            }
                                        />
                                    </Grid>

                                    <Grid size={{ xs: 4 }}>
                                        <TextField
                                            select
                                            label="Inspection Level"
                                            fullWidth
                                            value={n.inspectionLevel || ""}
                                            onChange={(e) =>
                                                updateConfig(index, "inspectionLevel", e.target.value)
                                            }
                                        >
                                            {levels.map((lv) => (
                                                <MenuItem
                                                    key={lv.InspectionLevel}
                                                    value={lv.InspectionLevel}
                                                >
                                                    {lv.InspectionLevel}
                                                </MenuItem>
                                            ))}
                                        </TextField>
                                    </Grid>

                                </Grid>

                            ))}

                            <Button
                                variant="contained"
                                onClick={handleCreateSection}
                                disabled={creatingSection}
                            >
                                {creatingSection ? "Đang tạo..." : "Tạo Section"}
                            </Button>

                        </Card>

                    )}

                {/* SECTION */}

                {sections.map(section => {

                    const sectionItems = checkItems.filter(
                        c => c.SectionId === section.Id
                    );

                    return (

                        <Accordion defaultExpanded key={section.Id} sx={{ mb: 3 }}>

                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>

                                <Stack direction="row" spacing={2} alignItems="center">

                                    <AssignmentIcon color="primary" />

                                    <Typography fontWeight={600}>
                                        {section.TenNhom}
                                    </Typography>

                                    <Chip
                                        label={`Mẫu: ${section.SoLuongKiem}`}
                                        size="small"
                                    />

                                </Stack>

                            </AccordionSummary>

                            <AccordionDetails>

                                {sectionItems.map(item => {

                                    // const itemDefects = defects.filter(
                                    //     d => d.CheckItemId === item.Id
                                    // );

                                    const totalLoi = item.SoLuongLoi || 0;

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
                                                    totalLoi > 0
                                                        ? "error.light"
                                                        : "success.light",
                                                bgcolor:
                                                    totalLoi > 0
                                                        ? alpha("#ef4444", 0.05)
                                                        : alpha("#22c55e", 0.05)
                                            }}
                                        >

                                            <Grid container alignItems="center">

                                                <Grid size={{ xs: 6 }}>
                                                    <Typography fontWeight={500}>
                                                        {item.TenMucKiem}
                                                    </Typography>
                                                </Grid>

                                                <Grid size={{ xs: 3 }}>
                                                    <Chip
                                                        label={`Tổng lỗi: ${totalLoi}`}
                                                        size="small"
                                                    />
                                                </Grid>

                                                <Grid size={{ xs: 3 }}>

                                                    {!item.KetQua &&
                                                        <Chip label="Chưa kiểm tra" size="small" />}

                                                    {item.KetQua === "DAT" &&
                                                        <Chip label="Đạt" color="success" size="small" />}

                                                    {item.KetQua === "KHONG_DAT" &&
                                                        <Chip label="Có lỗi" color="error" size="small" />}

                                                </Grid>

                                            </Grid>

                                        </Card>

                                    );

                                })}

                            </AccordionDetails>

                        </Accordion>

                    );

                })}
                {/* Print Preview Modal */}
                <Dialog open={openPrintModal} onClose={() => setOpenPrintModal(false)} maxWidth="lg" fullWidth>
                    <DialogTitle>Xem trước bản in</DialogTitle>
                    <DialogContent dividers sx={{ bgcolor: '#f0f0f0', p: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                            {phieu.LoaiKiemId === 1 ? (
                                <PhieuGiamDinhPrintTemplate
                                    ref={componentRef}
                                    phieu={phieu}
                                    sections={sections}
                                    checkItems={checkItems}
                                    defects={defects}
                                    dynamicFields={dynamicFields}
                                />
                            ) : (
                                <PhieuKiemPrintTemplate
                                    ref={componentRef}
                                    phieu={phieu}
                                    sections={sections}
                                    checkItems={checkItems}
                                    defects={defects}
                                    dynamicFields={dynamicFields}
                                />
                            )}
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setOpenPrintModal(false)}>Hủy</Button>
                        <Button startIcon={<PrintIcon />} onClick={handlePrint} variant="contained" color="primary">
                            In / Lưu PDF
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </Fade>
    );

}