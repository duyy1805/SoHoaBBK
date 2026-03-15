
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
    Fade,
    TextField,
    MenuItem,
    LinearProgress
} from "@mui/material";
import DescriptionIcon from "@mui/icons-material/Description";
import { useNavigate } from "react-router-dom";
import { getMyBienBan } from "../../api/bienBan.api";

export default function BienBanList() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const res = await getMyBienBan();
            setData(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const renderTrangThaiChip = (trangThai) => {
        switch (trangThai) {
            case "BB_MOI":
                return <Chip label="Mới tạo" size="small" />;
            case "DANG_XU_LY":
                return <Chip label="Đang xử lý" color="warning" size="small" />;
            case "CHO_XAC_NHAN":
                return <Chip label="Chờ xác nhận" color="info" size="small" />;
            case "HOAN_TAT":
                return <Chip label="Hoàn tất" color="success" size="small" />;
            default:
                return <Chip label={trangThai || "Mới tạo"} size="small" />;
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
                        Danh sách Biên bản
                    </Typography>
                </Stack>

                <TextField
                    select
                    label="Lọc theo trạng thái"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    sx={{ mb: 3, width: 260 }}
                >
                    <MenuItem value="">Tất cả</MenuItem>
                    <MenuItem value="BB_MOI">Mới tạo</MenuItem>
                    <MenuItem value="DANG_XU_LY">Đang xử lý</MenuItem>
                    <MenuItem value="CHO_XAC_NHAN">Chờ xác nhận</MenuItem>
                    <MenuItem value="HOAN_TAT">Hoàn tất</MenuItem>
                </TextField>

                <Grid container spacing={3}>
                    {filteredData.length === 0 ? (
                        <Grid item xs={12}>
                            <Typography color="text.secondary" align="center" sx={{ mt: 4 }}>
                                Không có biên bản nào.
                            </Typography>
                        </Grid>
                    ) : (
                        filteredData.map((item) => (
                            <Grid item xs={12} md={6} lg={4} key={item.BienBanId}>
                                <Card
                                    onClick={() => navigate(`/bien-ban/${item.BienBanId}`)}
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
                                            <DescriptionIcon sx={{ color: "#6366f1" }} />
                                            {renderTrangThaiChip(item.TrangThai)}
                                        </Stack>

                                        <Typography variant="h6" fontWeight={600} gutterBottom>
                                            {item.SoPhieu}
                                        </Typography>

                                        <Typography variant="body2" color="text.primary" sx={{ mb: 0.5 }}>
                                            Sản phẩm: {item.TenSanPham || "N/A"}
                                        </Typography>

                                        <Typography variant="body2" color="text.secondary">
                                            Lot: {item.Lot || "—"}
                                        </Typography>

                                        <Typography variant="body2" color="text.secondary">
                                            Ngày tạo: {item.CreatedAt ? new Date(item.CreatedAt).toLocaleDateString('vi-VN') : "—"}
                                        </Typography>

                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                            Người lập: {item.NguoiLap || "—"}
                                        </Typography>

                                        <Box sx={{ mt: 2 }}>
                                            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                                                <Typography variant="caption" color="text.secondary">
                                                    Tiến độ: {item.DaCoYKien}/{item.SoBoPhan} bộ phận
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
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))
                    )}
                </Grid>
            </Box>
        </Fade>
    );
}
