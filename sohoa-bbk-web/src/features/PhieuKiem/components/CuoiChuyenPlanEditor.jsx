import { useEffect, useMemo, useState } from "react";
import {
    Alert,
    Box,
    Button,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    MenuItem,
    Stack,
    TextField,
    Typography
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { getDefectList } from "../../../api/lookup.api";
import { saveCuoiChuyenTimeSlots, uploadInspectionImages } from "../../../api/phieuKiem.api";
import DefectPickerDialog from "./DefectPickerDialog";
import InspectionImagePicker from "./InspectionImagePicker";
import ResponsiveInspectionDialog from "./ResponsiveInspectionDialog";

const TIME_OPTIONS = ["07:30", "08:30", "09:30", "10:30", "11:30", "12:30", "13:30", "14:30", "15:30", "16:30"];

const parseImages = (value) => {
    if (Array.isArray(value)) return value;
    try { return JSON.parse(value || "[]"); } catch { return []; }
};

const emptySlot = (hour) => ({
    localId: `slot-${hour}`,
    gioKiem: hour,
    soLuongKiem: "",
    soLoiBuiBan: "",
    soLoiConTrung: "",
    ghiChu: "",
    defects: []
});

const mapDefect = (defect, slotId, index) => ({
    localId: defect.Id || `defect-${slotId}-${index}`,
    defectId: Number(defect.DefectId),
    maLoi: defect.MaLoi || "",
    tenLoi: defect.TenLoi || "",
    soLuong: defect.SoLuong == null ? "" : String(defect.SoLuong),
    soLuongDatSauSua: defect.SoLuongDatSauSua == null ? "" : String(defect.SoLuongDatSauSua),
    soLuongKhongDatSauSua: defect.SoLuongKhongDatSauSua == null ? "" : String(defect.SoLuongKhongDatSauSua),
    tenCongNhan: defect.TenCongNhan || "",
    ghiChu: defect.GhiChu || "",
    savedUrls: parseImages(defect.ImageUrls),
    files: []
});

const mapPlan = (plan) => ({
    ...plan,
    soLuongThucTe: plan.SoLuongThucTe == null ? "" : String(plan.SoLuongThucTe),
    maDonHang: plan.MaDonHang || plan.Ma_DonHang || "",
    tenQuyTrinhSanXuat: plan.TenQuyTrinhSanXuat || plan.Ten_QuyTrinhSanXuat || "",
    lot: plan.Lot || "",
    lenhXuatVatTu: plan.LenhXuatVatTu || "",
    legacySlots: (plan.TimeSlots || []).filter((slot) => slot.IsLegacy),
    slots: (plan.TimeSlots || []).filter((slot) => !slot.IsLegacy).map((slot) => ({
        localId: slot.Id || `slot-${slot.GioKiem}`,
        gioKiem: slot.GioKiem,
        soLuongKiem: slot.SoLuongKiem == null ? "" : String(slot.SoLuongKiem),
        soLoiBuiBan: String(slot.SoLoiBuiBan || ""),
        soLoiConTrung: String(slot.SoLoiConTrung || ""),
        ghiChu: slot.GhiChu || "",
        defects: (slot.Defects || []).map((defect, index) => mapDefect(defect, slot.Id, index))
    }))
});

const slotHasData = (slot) =>
    slot.soLuongKiem !== "" || Number(slot.soLoiBuiBan || 0) > 0
    || Number(slot.soLoiConTrung || 0) > 0 || slot.ghiChu.trim() || slot.defects.length > 0;

export default function CuoiChuyenPlanEditor({ open, phieuId, planId, plans = [], onClose, onSaved }) {
    const [plan, setPlan] = useState(null);
    const [selectedHour, setSelectedHour] = useState(TIME_OPTIONS[0]);
    const [catalog, setCatalog] = useState([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!open) return;
        const source = plans.find((item) => Number(item.Id) === Number(planId));
        const mapped = source ? mapPlan(source) : null;
        setPlan(mapped);
        setSelectedHour(mapped?.slots?.[0]?.gioKiem || TIME_OPTIONS[0]);
        setError("");
        getDefectList().then((response) => setCatalog(response.data || []))
            .catch(() => setError("Không tải được ngân hàng lỗi."));
    }, [open, planId, plans]);

    const hasLegacyData = plans.some((item) => (item.TimeSlots || []).some((slot) => slot.IsLegacy) || (!item.HasTimeSlotData && (
        (item.Defects || []).length > 0 || Number(item.SoLoiBuiBan || 0) > 0 || Number(item.SoLoiConTrung || 0) > 0
    )));
    const selectedSlot = useMemo(() => {
        if (!plan) return null;
        return plan.slots.find((slot) => slot.gioKiem === selectedHour) || emptySlot(selectedHour);
    }, [plan, selectedHour]);
    const availableCatalog = useMemo(
        () => catalog.filter((item) => !selectedSlot?.defects.some((row) => row.defectId === Number(item.Id))),
        [catalog, selectedSlot]
    );

    const updateSelectedSlot = (updater) => {
        setPlan((current) => {
            const existing = current.slots.find((slot) => slot.gioKiem === selectedHour) || emptySlot(selectedHour);
            const next = typeof updater === "function" ? updater(existing) : { ...existing, ...updater };
            return {
                ...current,
                slots: [...current.slots.filter((slot) => slot.gioKiem !== selectedHour), next]
                    .sort((a, b) => TIME_OPTIONS.indexOf(a.gioKiem) - TIME_OPTIONS.indexOf(b.gioKiem))
            };
        });
    };

    const updateDefect = (index, patch) => updateSelectedSlot((slot) => ({
        ...slot,
        defects: slot.defects.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row)
    }));

    const addDefect = (defect) => updateSelectedSlot((slot) => ({
        ...slot,
        defects: [...slot.defects, {
            localId: `defect-${selectedHour}-${Date.now()}-${defect.Id}`,
            defectId: Number(defect.Id),
            maLoi: defect.MaLoi || "",
            tenLoi: defect.TenLoi || "",
            soLuong: "1",
            soLuongDatSauSua: "",
            soLuongKhongDatSauSua: "",
            tenCongNhan: "",
            ghiChu: "",
            savedUrls: [],
            files: []
        }]
    }));

    const validate = () => {
        if (plan.soLuongThucTe !== "" && (!Number.isInteger(Number(plan.soLuongThucTe)) || Number(plan.soLuongThucTe) < 0)) {
            return "Số lượng thực tế phải là số nguyên không âm hoặc để trống.";
        }
        const slots = plan.slots.filter(slotHasData);
        if (!slots.length) return "Cần nhập ít nhất một mốc giờ.";
        for (const slot of slots) {
            if (slot.soLuongKiem === "" || !Number.isInteger(Number(slot.soLuongKiem)) || Number(slot.soLuongKiem) < 0) {
                return `Mốc ${slot.gioKiem} chưa có số lượng kiểm hợp lệ.`;
            }
            const totalDefects = slot.defects.reduce((sum, row) => sum + Number(row.soLuong || 0), 0)
                + Number(slot.soLoiBuiBan || 0) + Number(slot.soLoiConTrung || 0);
            if (totalDefects > Number(slot.soLuongKiem)) return `Tổng lỗi tại ${slot.gioKiem} vượt số lượng kiểm.`;
            for (const row of slot.defects) {
                if (!row.tenCongNhan.trim()) return `Lỗi ${row.maLoi || row.tenLoi} tại ${slot.gioKiem} chưa nhập công nhân.`;
                if (!Number.isInteger(Number(row.soLuong)) || Number(row.soLuong) <= 0) return `Số lỗi tại ${slot.gioKiem} không hợp lệ.`;
                if (Number(row.soLuongDatSauSua || 0) + Number(row.soLuongKhongDatSauSua || 0) > Number(row.soLuong)) {
                    return `Kết quả sửa ${row.maLoi || row.tenLoi} tại ${slot.gioKiem} vượt số lỗi.`;
                }
            }
        }
        return "";
    };

    const handleSave = async () => {
        const validationError = validate();
        if (validationError) return setError(validationError);
        try {
            setSaving(true);
            setError("");
            const readySlots = plan.slots.filter(slotHasData).map((slot) => ({
                ...slot,
                defects: slot.defects.map((row) => ({ ...row, savedUrls: [...row.savedUrls], files: [...row.files] }))
            }));
            for (const slot of readySlots) {
                for (const row of slot.defects) {
                    if (row.files.length) {
                        const response = await uploadInspectionImages(row.files);
                        row.savedUrls.push(...(response.data?.filePaths || []));
                    }
                }
            }
            await saveCuoiChuyenTimeSlots({
                phieuKiemId: phieuId,
                planId: plan.Id,
                plan: {
                    soLuongThucTe: plan.soLuongThucTe === "" ? null : Number(plan.soLuongThucTe),
                    maDonHang: plan.maDonHang.trim(),
                    tenQuyTrinhSanXuat: plan.tenQuyTrinhSanXuat.trim(),
                    lot: plan.lot.trim(),
                    lenhXuatVatTu: plan.lenhXuatVatTu.trim()
                },
                slots: readySlots.map((slot) => ({
                    gioKiem: slot.gioKiem,
                    soLuongKiem: Number(slot.soLuongKiem),
                    soLoiBuiBan: Number(slot.soLoiBuiBan || 0),
                    soLoiConTrung: Number(slot.soLoiConTrung || 0),
                    ghiChu: slot.ghiChu.trim(),
                    defects: slot.defects.map((row, index) => ({
                        defectId: row.defectId,
                        soLuong: Number(row.soLuong),
                        soLuongDatSauSua: row.soLuongDatSauSua === "" ? null : Number(row.soLuongDatSauSua),
                        soLuongKhongDatSauSua: row.soLuongKhongDatSauSua === "" ? null : Number(row.soLuongKhongDatSauSua),
                        tenCongNhan: row.tenCongNhan.trim(),
                        ghiChu: row.ghiChu.trim(),
                        imageUrls: row.savedUrls,
                        sortOrder: index + 1
                    }))
                }))
            });
            await onSaved?.();
            onClose?.();
        } catch (saveError) {
            setError(saveError.response?.data?.message || "Không thể lưu dữ liệu theo mốc giờ.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <ResponsiveInspectionDialog open={open} onClose={saving ? undefined : onClose}>
            <DialogTitle>Ghi nhận cuối chuyền theo mốc giờ</DialogTitle>
            <DialogContent dividers sx={{ pb: { xs: 12, sm: 2 } }}>
                {!plan ? <Alert severity="warning">Không tìm thấy kế hoạch.</Alert> : (
                    <Stack spacing={2}>
                        {error && <Alert severity="error">{error}</Alert>}
                        {hasLegacyData && <Alert severity="info">
                            Dữ liệu tổng hợp cũ sẽ được giữ thành dòng không xác định giờ. Bạn có thể nhập tiếp các mốc S/C mới; hệ thống không tự gán dữ liệu cũ sang 07:30.
                        </Alert>}
                        <Box>
                            <Typography fontWeight={800}>{plan.MaSanPham} - {plan.TenSanPham}</Typography>
                            <Typography variant="body2" color="text.secondary">
                                {plan.TenDonVi || "---"} / {plan.TenBoPhan || "---"}
                            </Typography>
                        </Box>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                            <TextField fullWidth label="Số lượng thực tế" type="number" value={plan.soLuongThucTe}
                                inputProps={{ min: 0, step: 1 }}
                                onChange={(event) => setPlan((current) => ({ ...current, soLuongThucTe: event.target.value.replace(/\D/g, "") }))} />
                            <TextField fullWidth label="LOT" value={plan.lot}
                                onChange={(event) => setPlan((current) => ({ ...current, lot: event.target.value }))} />
                            <TextField fullWidth label="Lệnh xuất vật tư" value={plan.lenhXuatVatTu}
                                onChange={(event) => setPlan((current) => ({ ...current, lenhXuatVatTu: event.target.value }))} />
                        </Stack>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                            <TextField fullWidth label="Mã đơn hàng" value={plan.maDonHang}
                                disabled={Boolean(plan.MaDonHang || plan.Ma_DonHang)}
                                onChange={(event) => setPlan((current) => ({ ...current, maDonHang: event.target.value }))} />
                            <TextField fullWidth label="Quy trình" value={plan.tenQuyTrinhSanXuat}
                                disabled={Boolean(plan.TenQuyTrinhSanXuat || plan.Ten_QuyTrinhSanXuat)}
                                onChange={(event) => setPlan((current) => ({ ...current, tenQuyTrinhSanXuat: event.target.value }))} />
                        </Stack>
                        <TextField select label="Mốc giờ ghi nhận" value={selectedHour} onChange={(event) => setSelectedHour(event.target.value)}>
                            {TIME_OPTIONS.map((hour) => (
                                <MenuItem key={hour} value={hour}>
                                    {hour < "12:00" ? "S" : "C"} {hour}{plan.slots.some((slot) => slot.gioKiem === hour && slotHasData(slot)) ? " • Đã nhập" : ""}
                                </MenuItem>
                            ))}
                        </TextField>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                            <TextField fullWidth label="Tổng SL kiểm" type="number" value={selectedSlot.soLuongKiem}
                                onChange={(event) => updateSelectedSlot({ soLuongKiem: event.target.value.replace(/\D/g, "") })} />
                            <TextField fullWidth label="Bụi bẩn" type="number" value={selectedSlot.soLoiBuiBan}
                                onChange={(event) => updateSelectedSlot({ soLoiBuiBan: event.target.value.replace(/\D/g, "") })} />
                            <TextField fullWidth label="Côn trùng" type="number" value={selectedSlot.soLoiConTrung}
                                onChange={(event) => updateSelectedSlot({ soLoiConTrung: event.target.value.replace(/\D/g, "") })} />
                        </Stack>
                        <TextField label="Ghi chú mốc giờ" multiline minRows={2} value={selectedSlot.ghiChu}
                            onChange={(event) => updateSelectedSlot({ ghiChu: event.target.value })} />
                        <DefectPickerDialog defects={availableCatalog} onSelect={addDefect} disabled={saving} fullWidth />
                        {selectedSlot.defects.map((row, index) => (
                            <Box key={row.localId} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 1.5 }}>
                                <Stack spacing={1.5}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Box>
                                            <Typography fontWeight={700}>{row.maLoi || "---"}</Typography>
                                            <Typography variant="body2">{row.tenLoi}</Typography>
                                        </Box>
                                        <IconButton color="error" onClick={() => updateSelectedSlot((slot) => ({
                                            ...slot, defects: slot.defects.filter((_, rowIndex) => rowIndex !== index)
                                        }))}><DeleteOutlineIcon /></IconButton>
                                    </Stack>
                                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                                        <TextField fullWidth label="Công nhân" value={row.tenCongNhan} onChange={(e) => updateDefect(index, { tenCongNhan: e.target.value })} />
                                        <TextField fullWidth label="Số lỗi" type="number" value={row.soLuong} onChange={(e) => updateDefect(index, { soLuong: e.target.value.replace(/\D/g, "") })} />
                                        <TextField fullWidth label="Sửa đạt" type="number" value={row.soLuongDatSauSua} onChange={(e) => updateDefect(index, { soLuongDatSauSua: e.target.value.replace(/\D/g, "") })} />
                                        <TextField fullWidth label="Sửa không đạt" type="number" value={row.soLuongKhongDatSauSua} onChange={(e) => updateDefect(index, { soLuongKhongDatSauSua: e.target.value.replace(/\D/g, "") })} />
                                    </Stack>
                                    <TextField label="Ghi chú lỗi" multiline minRows={2} value={row.ghiChu} onChange={(e) => updateDefect(index, { ghiChu: e.target.value })} />
                                    <InspectionImagePicker savedUrls={row.savedUrls} files={row.files}
                                        onSavedUrlsChange={(savedUrls) => updateDefect(index, { savedUrls })}
                                        onFilesChange={(files) => updateDefect(index, { files })} disabled={saving} />
                                </Stack>
                            </Box>
                        ))}
                        {slotHasData(selectedSlot) && (
                            <Button color="error" onClick={() => setPlan((current) => ({
                                ...current, slots: current.slots.filter((slot) => slot.gioKiem !== selectedHour)
                            }))}>Xóa dữ liệu mốc {selectedHour}</Button>
                        )}
                    </Stack>
                )}
            </DialogContent>
            <DialogActions sx={{ pb: { xs: "calc(12px + env(safe-area-inset-bottom))", sm: 1.5 } }}>
                <Button onClick={onClose} disabled={saving}>Đóng</Button>
                <Button variant="contained" disabled={saving || !plan} onClick={handleSave}>
                    {saving ? "Đang lưu..." : "Lưu nháp"}
                </Button>
            </DialogActions>
        </ResponsiveInspectionDialog>
    );
}
