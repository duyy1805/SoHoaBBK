import { useState } from "react";
import { Box, Typography, TextField, MenuItem } from "@mui/material";

import DefectManager from "./components/DefectManager";
import NhomKiemManager from "./components/NhomKiemManager";
import CheckItemManager from "./components/CheckItemManager";
import SanPhamManger from "./components/SanPhamManager";
import InspectionLevelManager from "./components/InspectionLevelManager";
import DoiTraDefectGroupManager from "./components/DoiTraDefectGroupManager";

export default function DanhMucManager() {
    const [type, setType] = useState("DEFECT");

    return (
        <Box>
            <Typography variant="h5" sx={{ mb: 1.5, fontWeight: 800 }}>
                Quản lý Danh mục
            </Typography>

            <TextField
                select
                label="Loại danh mục"
                value={type}
                onChange={(e) => setType(e.target.value)}
                sx={{ mb: 2, width: 300 }}
            >
                <MenuItem value="DEFECT">Danh mục lỗi</MenuItem>
                <MenuItem value="NHOM_KIEM">Nhóm kiểm</MenuItem>
                <MenuItem value="CHECK_ITEM">Mục kiểm</MenuItem>
                <MenuItem value="SAN_PHAM">Sản phẩm, vật tư</MenuItem>
                <MenuItem value="INSPECTION_LEVEL">Inspection Level</MenuItem>
                <MenuItem value="DOI_TRA_DEFECT_GROUP">Nhóm lỗi đổi trả phôi</MenuItem>
            </TextField>

            {type === "DEFECT" && <DefectManager />}
            {type === "NHOM_KIEM" && <NhomKiemManager />}
            {type === "CHECK_ITEM" && <CheckItemManager />}
            {type === "SAN_PHAM" && <SanPhamManger />}
            {type === "INSPECTION_LEVEL" && <InspectionLevelManager />}
            {type === "DOI_TRA_DEFECT_GROUP" && <DoiTraDefectGroupManager />}
        </Box>
    );
}
