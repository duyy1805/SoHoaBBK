import { useEffect, useMemo, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Checkbox,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    IconButton,
    MenuItem,
    Stack,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { getDefectList } from "../../../api/lookup.api";
import { saveSxbtData } from "../../../api/phieuKiem.api";
import ResponsiveInspectionDialog from "./ResponsiveInspectionDialog";
import DefectPickerDialog from "./DefectPickerDialog";

const normalizeRows = (item) => {
    const source = Array.isArray(item.LotRows) && item.LotRows.length
        ? item.LotRows
        : [{
            BtpItemId: item.Id,
            DauTuanGS1: item.DauTuanGS1 || "",
            ThuTu: item.ThuTu || "",
            LxvtLot: item.LxvtLot || "",
            SoLotSX: item.SoLotSX || "",
            SoLuongNhap: item.SoLuongNhap ?? "",
            SoLuongKhoXacNhan: item.SoLuongKhoXacNhan ?? "",
            SortOrder: 1
        }];
    return source.map((row, index) => ({
        ...row,
        BtpItemId: row.BtpItemId || item.Id,
        DauTuanGS1: row.DauTuanGS1 || "",
        ThuTu: row.ThuTu || "",
        LxvtLot: row.LxvtLot || "",
        SoLotSX: row.SoLotSX || "",
        SoLuongNhap: row.SoLuongNhap ?? "",
        SortOrder: row.SortOrder || index + 1
    }));
};

export default function SxbtDraftEditor({
    open,
    phieu,
    sourceBtpItems = [],
    sourceSummary,
    sourceDefects = [],
    dynamicFields = [],
    onClose,
    onSaved
}) {
    const [conditions, setConditions] = useState({ thung: "DAT", ngoaiQuan: "DAT" });
    const [btpItems, setBtpItems] = useState([]);
    const [sampleType, setSampleType] = useState("LAN_1_2");
    const [sampleRate, setSampleRate] = useState("100");
    const [sampleQuantity, setSampleQuantity] = useState("");
    const [conclusion, setConclusion] = useState("DAT");
    const [defects, setDefects] = useState([]);
    const [catalog, setCatalog] = useState([]);
    const [target, setTarget] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!open) return;
        const fieldValue = (name) => dynamicFields.find((field) => field.FieldName === name)?.FieldValue;
        setConditions({
            thung: fieldValue("DKVC_THUNG_SAN_XE") || "DAT",
            ngoaiQuan: fieldValue("DKVC_NGOAI_QUAN") || "DAT"
        });
        setBtpItems(sourceBtpItems.map((item) => ({ ...item, LotRows: normalizeRows(item) })));
        setSampleType(sourceSummary?.LoaiMau || "LAN_1_2");
        setSampleRate(sourceSummary?.TyLe == null ? "100" : String(sourceSummary.TyLe));
        setSampleQuantity(sourceSummary?.SoLuongMau == null ? String(phieu?.SoLuong || "") : String(sourceSummary.SoLuongMau));
        setConclusion(phieu?.KetLuan || "DAT");
        setDefects(sourceDefects.filter((defect) => Number(defect.SoLuong) > 0).map((defect, index) => ({
            localId: defect.Id || `defect-${index}`,
            DefectId: Number(defect.DefectId),
            TenLoi: defect.TenLoi || "",
            DefectType: defect.DefectType || "",
            SoLuong: Number(defect.SoLuong || 0),
            IsLapLai: Boolean(defect.IsLapLai),
            BtpItemId: defect.BtpItemId || null,
            BtpLotRowId: defect.BtpLotRowId || null,
            BtpTenSanPham: defect.BtpTenSanPham || "",
            BtpSoLotSX: defect.BtpSoLotSX || "",
            SourceID_KeHoachSanXuat: defect.SourceID_KeHoachSanXuat || null
        })));
        setTarget("");
        setError("");
        getDefectList({ phanHe: "SXBT" }).then((response) => setCatalog(response.data || []))
            .catch(() => setError("Không tải được ngân hàng lỗi SXBT."));
    }, [dynamicFields, open, phieu, sourceBtpItems, sourceDefects, sourceSummary]);

    const lotTargets = useMemo(() => btpItems.flatMap((item) =>
        item.LotRows.filter((row) => row.Id).map((row, index) => ({
            key: `${item.Id}:${row.Id || index}`,
            item,
            row,
            label: `${item.TenSanPham || "BTP"} · Lot ${row.SoLotSX || index + 1} · SL ${row.SoLuongNhap || 0}`
        }))
    ), [btpItems]);
    const totalSamples = Number(sampleQuantity || 0);
    const totalDefects = defects.reduce((sum, defect) => sum + Number(defect.SoLuong || 0), 0);
    const criticalDefects = defects.filter((defect) => ["Nghiêm trọng", "CRITICAL"].includes(defect.DefectType))
        .reduce((sum, defect) => sum + Number(defect.SoLuong || 0), 0);
    const rate = Number(sampleRate || 0);

    const updateLot = (itemId, rowIndex, patch) => setBtpItems((current) => current.map((item) =>
        Number(item.Id) !== Number(itemId) ? item : {
            ...item,
            LotRows: item.LotRows.map((row, index) => index === rowIndex ? { ...row, ...patch } : row)
        }
    ));

    const addDefect = (defect) => {
        const selectedTarget = lotTargets.find((item) => item.key === target);
        if (!defect || !selectedTarget) return;
        const existingIndex = defects.findIndex((item) =>
            item.DefectId === Number(defect.Id)
            && Number(item.BtpLotRowId) === Number(selectedTarget.row.Id)
        );
        if (existingIndex >= 0) {
            setDefects((current) => current.map((item, index) => index === existingIndex
                ? { ...item, SoLuong: Number(item.SoLuong || 0) + 1 }
                : item));
        } else {
            setDefects((current) => [...current, {
                localId: `defect-${Date.now()}-${defect.Id}`,
                DefectId: Number(defect.Id),
                TenLoi: defect.TenLoi || "",
                DefectType: defect.DefectType || "",
                SoLuong: 1,
                IsLapLai: false,
                BtpItemId: selectedTarget.item.Id,
                BtpLotRowId: selectedTarget.row.Id || null,
                BtpTenSanPham: selectedTarget.item.TenSanPham || "",
                BtpSoLotSX: selectedTarget.row.SoLotSX || "",
                SourceID_KeHoachSanXuat: selectedTarget.item.SourceID_KeHoachSanXuat || null
            }]);
        }
    };

    const handleSave = async () => {
        if (!Number.isInteger(totalSamples) || totalSamples < 0 || Number.isNaN(rate) || rate < 0) {
            setError("Số lượng mẫu và tỷ lệ mẫu không hợp lệ.");
            return;
        }
        if (defects.some((defect) => !Number.isInteger(Number(defect.SoLuong)) || Number(defect.SoLuong) <= 0)) {
            setError("Số lượng lỗi phải là số nguyên dương.");
            return;
        }
        try {
            setSaving(true);
            setError("");
            const tyLeDat = totalSamples > 0 ? 100 - totalDefects * 100 / totalSamples : 0;
            await saveSxbtData({
                phieuKiemId: phieu.Id,
                dynamicFields: [
                    { FieldCode: "DKVC_THUNG_SAN_XE", Value: conditions.thung },
                    { FieldCode: "DKVC_NGOAI_QUAN", Value: conditions.ngoaiQuan }
                ],
                btpItems: btpItems.map((item) => {
                    const first = item.LotRows[0] || {};
                    return {
                        ...item,
                        LotRows: item.LotRows,
                        SoLuongNhap: first.SoLuongNhap ?? null,
                        DauTuanGS1: first.DauTuanGS1 || null,
                        ThuTu: first.ThuTu || null,
                        LxvtLot: first.LxvtLot || null,
                        SoLotSX: first.SoLotSX || null
                    };
                }),
                summary: {
                    LoaiMau: sampleType,
                    SoLuongMau: totalSamples,
                    TyLe: rate,
                    TyLeDat: tyLeDat,
                    TyLeLoiNghiemTrong: totalSamples > 0 ? criticalDefects * 100 / totalSamples : 0,
                    TyLeLoiNangNhe: totalSamples > 0 ? (totalDefects - criticalDefects) * 100 / totalSamples : 0
                },
                defects
            });
            await onSaved?.({ conclusion });
            onClose?.();
        } catch (saveError) {
            setError(saveError.response?.data?.message || "Không thể lưu nháp SXBT.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <ResponsiveInspectionDialog open={open} onClose={saving ? undefined : onClose} maxWidth="lg">
            <DialogTitle>Nhập kết quả kiểm SXBT</DialogTitle>
            <DialogContent dividers sx={{ pb: { xs: 12, sm: 2 } }}>
                <Stack spacing={2}>
                    {error && <Alert severity="error">{error}</Alert>}
                    <Typography variant="h6">I. Điều kiện vận chuyển</Typography>
                    <Condition label="Thùng/sàn xe" value={conditions.thung} onChange={(value) => setConditions((current) => ({ ...current, thung: value }))} />
                    <Condition label="Ngoại quan sản phẩm" value={conditions.ngoaiQuan} onChange={(value) => setConditions((current) => ({ ...current, ngoaiQuan: value }))} />
                    <Typography variant="h6">II. Chi tiết BTP/Lot</Typography>
                    {btpItems.map((item) => (
                        <Box key={item.Id} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 1.5 }}>
                            <Typography fontWeight={800}>{item.TenSanPham || "BTP"}</Typography>
                            <Typography variant="body2" color="text.secondary">KH #{item.SourceID_KeHoachSanXuat || "—"} · {item.MaDonHang || "Không có đơn hàng"}</Typography>
                            <Stack spacing={1.5} sx={{ mt: 1.5 }}>
                                {item.LotRows.map((row, rowIndex) => (
                                    <Box key={row.Id || rowIndex} sx={{ bgcolor: "grey.50", p: 1.5, borderRadius: 2 }}>
                                        <Typography variant="subtitle2">Dòng Lot {rowIndex + 1} · SL nhập {row.SoLuongNhap || 0} · Lot SX {row.SoLotSX || "—"}</Typography>
                                        <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mt: 1 }}>
                                            <TextField label="Dấu tuần/GS1" value={row.DauTuanGS1} onChange={(event) => updateLot(item.Id, rowIndex, { DauTuanGS1: event.target.value })} />
                                            <TextField label="Thứ tự" value={row.ThuTu} onChange={(event) => updateLot(item.Id, rowIndex, { ThuTu: event.target.value })} />
                                            <TextField label="LXVT/LOT" value={row.LxvtLot} onChange={(event) => updateLot(item.Id, rowIndex, { LxvtLot: event.target.value })} />
                                        </Stack>
                                    </Box>
                                ))}
                            </Stack>
                        </Box>
                    ))}
                    <Typography variant="h6">III. Tỷ lệ kiểm</Typography>
                    <TextField select label="Loại mẫu" value={sampleType} onChange={(event) => setSampleType(event.target.value)}>
                        <MenuItem value="LAN_1_2">Lần 1, 2</MenuItem>
                        <MenuItem value="LAN_3">Lần 3</MenuItem>
                        <MenuItem value="LO_TRUOC_KHONG_DAT">Lô trước không đạt</MenuItem>
                    </TextField>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                        <TextField fullWidth label="Tỷ lệ mẫu (%)" type="number" value={sampleRate} onChange={(event) => setSampleRate(event.target.value.replace(/[^0-9.]/g, ""))} />
                        <TextField fullWidth label="Số lượng mẫu" type="number" value={sampleQuantity} onChange={(event) => setSampleQuantity(event.target.value.replace(/\D/g, ""))} />
                    </Stack>
                    <Condition label="Kết luận phiếu" value={conclusion} onChange={setConclusion} />
                    <Typography variant="h6">IV. Ghi nhận lỗi</Typography>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                        <TextField select fullWidth label="BTP/Lot nhận lỗi" value={target} onChange={(event) => setTarget(event.target.value)}>
                            {lotTargets.map((item) => <MenuItem key={item.key} value={item.key}>{item.label}</MenuItem>)}
                        </TextField>
                        <DefectPickerDialog
                            defects={catalog}
                            onSelect={addDefect}
                            disabled={saving || !target}
                            buttonLabel={!target ? "Chọn BTP/Lot trước" : "Chọn lỗi"}
                            fullWidth
                        />
                    </Stack>
                    {defects.map((defect, index) => (
                        <Box key={defect.localId} sx={{ bgcolor: "grey.50", borderRadius: 2, p: 1.5 }}>
                            <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }} spacing={1}>
                                <Box sx={{ flex: 1 }}>
                                    <Typography fontWeight={700}>{defect.TenLoi}</Typography>
                                    <Typography variant="caption" color="text.secondary">{defect.BtpTenSanPham} · Lot {defect.BtpSoLotSX || "—"}</Typography>
                                </Box>
                                <TextField label="Số lỗi" type="number" value={defect.SoLuong} onChange={(event) => setDefects((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, SoLuong: Number(event.target.value.replace(/\D/g, "") || 0) } : item))} />
                                <FormControlLabel control={<Checkbox checked={defect.IsLapLai} onChange={(event) => setDefects((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, IsLapLai: event.target.checked } : item))} />} label="Lặp lại" />
                                <IconButton color="error" onClick={() => setDefects((current) => current.filter((_, itemIndex) => itemIndex !== index))}><DeleteOutlineIcon /></IconButton>
                            </Stack>
                        </Box>
                    ))}
                </Stack>
            </DialogContent>
            <DialogActions sx={{
                position: { xs: "fixed", sm: "static" }, left: 0, right: 0, bottom: 0,
                bgcolor: "background.paper", borderTop: { xs: "1px solid", sm: 0 }, borderColor: "divider",
                pb: { xs: "calc(12px + env(safe-area-inset-bottom))", sm: 1.5 }
            }}>
                <Button onClick={onClose} disabled={saving}>Hủy</Button>
                <Button variant="contained" disabled={saving} onClick={handleSave}>{saving ? "Đang lưu..." : "Lưu nháp"}</Button>
            </DialogActions>
        </ResponsiveInspectionDialog>
    );
}

function Condition({ label, value, onChange }) {
    return (
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1}>
            <Typography fontWeight={700}>{label}</Typography>
            <ToggleButtonGroup exclusive value={value} onChange={(_, next) => next && onChange(next)} size="small">
                <ToggleButton value="DAT" color="success">Đạt</ToggleButton>
                <ToggleButton value="KHONG_DAT" color="error">Không đạt</ToggleButton>
            </ToggleButtonGroup>
        </Stack>
    );
}
