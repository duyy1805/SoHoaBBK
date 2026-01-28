import { useEffect, useState } from 'react';
import {
    Box,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    Chip,
    IconButton,
    CircularProgress
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useNavigate } from 'react-router-dom';
import { getPhieuKiemList } from '../../api/phieuKiem.api';

const renderStatus = (ketLuan) => {
    if (ketLuan === 'Đạt') return <Chip label="Đạt" color="success" size="small" />;
    if (ketLuan === 'Không đạt') return <Chip label="Không đạt" color="error" size="small" />;
    return <Chip label="Chưa kết luận" size="small" />;
};

export default function PhieuKiemList() {
    const navigate = useNavigate();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const res = await getPhieuKiemList();
            console.log('PhieuKiemList -> loadData -> res', res);
            setData(res.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Box textAlign="center" mt={5}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            <Typography variant="h5" mb={2}>
                Danh sách Phiếu kiểm
            </Typography>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Số phiếu</TableCell>
                            <TableCell>Loại kiểm</TableCell>
                            <TableCell>Chủng loại</TableCell>
                            <TableCell>Lot</TableCell>
                            <TableCell>Đối tượng</TableCell>
                            <TableCell>Người kiểm</TableCell>
                            <TableCell>Thời gian</TableCell>
                            <TableCell>Kết luận</TableCell>
                            <TableCell align="center">Thao tác</TableCell>
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {data.map(row => (
                            <TableRow key={row.Id} hover>
                                <TableCell>{row.SoPhieu}</TableCell>
                                <TableCell>{row.LoaiKiem}</TableCell>
                                <TableCell>{row.TenChungLoai}</TableCell>
                                <TableCell>{row.Lot}</TableCell>
                                <TableCell>{row.DoiTuong}</TableCell>
                                <TableCell>{row.TenNguoiKiem}</TableCell>
                                <TableCell>
                                    {new Date(row.ThoiGianKiem).toLocaleString()}
                                </TableCell>
                                <TableCell>{renderStatus(row.KetLuan)}</TableCell>
                                <TableCell align="center">
                                    <IconButton
                                        color="primary"
                                        onClick={() => navigate(`/phieu-kiem/${row.Id}`)}
                                    >
                                        <VisibilityIcon />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}

                        {data.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} align="center">
                                    Không có dữ liệu
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}
