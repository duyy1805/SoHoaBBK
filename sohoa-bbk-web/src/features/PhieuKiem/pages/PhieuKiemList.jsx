// src/features/phieuKiem/pages/PhieuKiemList.jsx

import { useEffect, useState } from "react";
import {
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Stack,
    Button,
    Fade,
    TextField,
    MenuItem
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import AssignmentIcon from "@mui/icons-material/Assignment";
import { useNavigate } from "react-router-dom";
import { getPhieuKiemList } from "../../../api/phieuKiem.api";
import { hasPermission } from "../../../utils/auth";

export default function PhieuKiemList() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const res = await getPhieuKiemList();
            setData(res.data);
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

    const filteredData = filterStatus
        ? data.filter((d) => d.TrangThai === filterStatus)
        : data;

    if (loading)
        return (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
                <CircularProgress />
            </Box>
        );

    return (
        <Fade in timeout={400}>
            <Box>
                <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ mb: 4 }}
                >
                    <Typography
                        variant="h4"
                        sx={{
                            fontWeight: 700,
                            background:
                                "linear-gradient(135deg, #1e293b 0%, #475569 100%)",
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
                        >
                            Phân bổ kiểm
                        </Button>
                    )}
                </Stack>

                <TextField
                    select
                    label="Lọc theo trạng thái"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    sx={{ mb: 3, width: 260 }}
                >
                    <MenuItem value="">Tất cả</MenuItem>
                    <MenuItem value="DA_TAO_SECTION">Chưa kiểm</MenuItem>
                    <MenuItem value="DANG_KIEM">Đang kiểm</MenuItem>
                    <MenuItem value="CHO_XUONG_XAC_NHAN">Chờ PX xác nhận</MenuItem>
                    <MenuItem value="CHO_KIEM_NGHIEM">Chờ kiểm nghiệm</MenuItem>
                    <MenuItem value="HOAN_TAT">Hoàn tất</MenuItem>
                </TextField>

                <Grid container spacing={3}>
                    {filteredData.map((item) => (
                        <Grid size={{ xs: 12, md: 6, lg: 4 }} key={item.Id}>
                            <Card
                                onClick={() => navigate(`/phieu-kiem/${item.Id}`)}
                                sx={{
                                    borderRadius: 3,
                                    cursor: "pointer",
                                    boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
                                    transition: "0.3s",
                                    "&:hover": {
                                        transform: "translateY(-4px)",
                                        boxShadow: "0 8px 30px rgba(0,0,0,0.1)"
                                    }
                                }}
                            >
                                <CardContent>
                                    <Stack
                                        direction="row"
                                        justifyContent="space-between"
                                        sx={{ mb: 2 }}
                                    >
                                        <AssignmentIcon sx={{ color: "#6366f1" }} />
                                        {renderTrangThaiChip(item.TrangThai)}
                                    </Stack>

                                    <Typography variant="h6" fontWeight={600}>
                                        {item.SoPhieu}
                                    </Typography>

                                    <Typography variant="body2" color="text.secondary">
                                        LOT: {item.Lot || "—"}
                                    </Typography>
                                    {item.TrangThai === "HOAN_TAT" && (
                                        <Box mt={1}>
                                            {renderKetLuanChip(item.KetLuan)}
                                        </Box>
                                    )}
                                    <Typography variant="body2" color="text.secondary">
                                        Người kiểm: {item.TenNguoiKiem}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </Box>
        </Fade>
    );
}