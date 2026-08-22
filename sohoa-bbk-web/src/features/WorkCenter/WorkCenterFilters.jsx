import {
    Box, Button, Chip, Collapse, InputAdornment, MenuItem, Paper, Stack, Tab, Tabs, TextField, Typography
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";

const quickFilters = [
    ["overdue", "Quá hạn"], ["critical", "Critical"], ["attachments", "Có ảnh"], ["repeated", "Lỗi lặp lại"]
];

export default function WorkCenterFilters({ filters, onChange, departments, statuses, workCounts, onExport, resultCount }) {
    return (
        <Stack spacing={1.25}>
            <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 1.25, borderColor: "#e5e9f0" }}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "center" }}>
                    <TextField
                        size="small" value={filters.q} onChange={(event) => onChange("q", event.target.value)}
                        placeholder="Tìm theo số phiếu, mô tả lỗi, sản phẩm, người lập..." sx={{ flex: 1, minWidth: 240 }}
                        slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
                    />
                    <Button variant={filters.advanced ? "contained" : "outlined"} startIcon={<FilterListIcon />} onClick={() => onChange("advanced", !filters.advanced)} sx={{ whiteSpace: "nowrap" }}>
                        {filters.advanced ? "Thu gọn" : "Bộ lọc nâng cao"}
                    </Button>
                    <Button variant="outlined" startIcon={<DownloadOutlinedIcon />} onClick={onExport} disabled={!resultCount} sx={{ whiteSpace: "nowrap" }}>Xuất dữ liệu</Button>
                </Stack>

                <Stack direction="row" spacing={0.65} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                    {quickFilters.map(([value, label]) => (
                        <Chip key={value} clickable size="small" label={label} color={filters.quick === value ? "primary" : "default"}
                            variant={filters.quick === value ? "filled" : "outlined"}
                            onClick={() => onChange("quick", filters.quick === value ? "" : value)} />
                    ))}
                </Stack>

                <Collapse in={filters.advanced}>
                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "repeat(4, 1fr)" }, gap: 1, mt: 1.25, pt: 1.25, borderTop: 1, borderColor: "divider" }}>
                        <TextField select size="small" label="Loại hồ sơ" value={filters.type} onChange={(event) => onChange("type", event.target.value)}>
                            <MenuItem value="all">Tất cả hồ sơ</MenuItem>
                            <MenuItem value="BIEN_BAN">Biên bản</MenuItem>
                            <MenuItem value="KPH_STANDALONE">Phiếu KPH độc lập</MenuItem>
                            <MenuItem value="SXBT">SXBT</MenuItem>
                        </TextField>
                        <TextField select size="small" label="Bộ phận" value={filters.department} onChange={(event) => onChange("department", event.target.value)}>
                            <MenuItem value="all">Tất cả bộ phận</MenuItem>
                            {departments.map((department) => <MenuItem key={department.value} value={department.value}>{department.label}</MenuItem>)}
                        </TextField>
                        <TextField select size="small" label="Trạng thái" value={filters.status} onChange={(event) => onChange("status", event.target.value)}>
                            <MenuItem value="all">Tất cả trạng thái</MenuItem>
                            {statuses.map((status) => <MenuItem key={status.value} value={status.value}>{status.label}</MenuItem>)}
                        </TextField>
                        <Stack direction="row" spacing={1}>
                            <TextField fullWidth size="small" label="Từ ngày" type="date" value={filters.from} onChange={(event) => onChange("from", event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
                            <TextField fullWidth size="small" label="Đến ngày" type="date" value={filters.to} onChange={(event) => onChange("to", event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
                        </Stack>
                    </Box>
                </Collapse>
            </Paper>

            <Paper variant="outlined" sx={{ borderRadius: 1.25, borderColor: "#e5e9f0", px: 0.5, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, overflow: "hidden" }}>
                <Tabs value={filters.work} onChange={(_, value) => onChange("work", value)} variant="scrollable" scrollButtons="auto" sx={{ minHeight: 42, "& .MuiTab-root": { minHeight: 42, py: 0.75, minWidth: 112, textTransform: "none", fontWeight: 700 } }}>
                    <Tab value="action" label={`Cần tôi xử lý (${workCounts.action || 0})`} />
                    <Tab value="waiting" label={`Đang chờ (${workCounts.waiting || 0})`} />
                    <Tab value="done" label={`Đã xử lý (${workCounts.done || 0})`} />
                    <Tab value="all" label={`Tất cả (${workCounts.all || 0})`} />
                </Tabs>
                <Stack direction="row" spacing={0.75} alignItems="center" sx={{ pr: 1, display: { xs: "none", md: "flex" } }}>
                    <Typography variant="caption" color="text.secondary" whiteSpace="nowrap">Sắp xếp:</Typography>
                    <TextField select size="small" value={filters.sort} onChange={(event) => onChange("sort", event.target.value)} sx={{ minWidth: 128, "& .MuiOutlinedInput-notchedOutline": { border: 0 } }}>
                        <MenuItem value="newest">Mới nhất</MenuItem>
                        <MenuItem value="oldest">Cũ nhất</MenuItem>
                        <MenuItem value="priority">Cần ưu tiên</MenuItem>
                    </TextField>
                </Stack>
            </Paper>
        </Stack>
    );
}
