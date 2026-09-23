import { Box, Paper, Tab, Tabs, Typography } from '@mui/material';
import { useState } from 'react';
import PhieuKiemList from './PhieuKiemList';
import CongDoanList from './CongDoanList';

const panels = [
    { label: 'Trên chuyền', typeId: 6, typeCode: 'KIEM_TREN_CHUYEN' },
    { label: 'Cuối chuyền', typeId: 3, typeCode: 'CUOI_CHUYEN' },
    { label: 'Công đoạn', process: true }
];

export default function PhatLongPhuocWorkspace() {
    const [tab, setTab] = useState(0);
    const selected = panels[tab];
    return (
        <Box>
            <Paper sx={{ px: 2, pt: 2, mb: 2 }}>
                <Typography variant="h5" fontWeight={800}>Kiểm tra chất lượng – Phát Long Phước</Typography>
                <Typography color="text.secondary">Dữ liệu nghiệp vụ độc lập trên hệ thống PLP</Typography>
                <Tabs value={tab} onChange={(_event, value) => setTab(value)} sx={{ mt: 1 }}>
                    {panels.map((panel) => <Tab key={panel.label} label={panel.label} />)}
                </Tabs>
            </Paper>
            {selected.process ? <CongDoanList /> : (
                <PhieuKiemList
                    fixedTypeId={selected.typeId}
                    createType={selected.typeCode}
                    title={`Phiếu kiểm ${selected.label.toLowerCase()} – Phát Long Phước`}
                />
            )}
        </Box>
    );
}
