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
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { getDefectList } from "../../../api/lookup.api";
import {
    deleteTrenChuyenEntry,
    saveTrenChuyenData,
    uploadInspectionImages
} from "../../../api/phieuKiem.api";
import { getCurrentUser } from "../../../utils/auth";
import InspectionImagePicker from "./InspectionImagePicker";
import ResponsiveInspectionDialog from "./ResponsiveInspectionDialog";
import DefectPickerDialog from "./DefectPickerDialog";

const TREN_CHUYEN_HOURS = ["07:30", "08:30", "09:30", "10:30", "11:30", "12:30", "13:30", "14:30", "15:30", "16:30"];

const parseImages = (value) => {
    if (Array.isArray(value)) return value;
    try { return JSON.parse(value || "[]"); } catch { return []; }
};

const mapSlot = (slot, slotIndex) => ({
    id: slot.Id,
    gioKiem: slot.GioKiem,
    sortOrder: slot.SortOrder || slotIndex + 1,
    entries: (slot.Entries || []).map((entry, entryIndex) => ({
        id: entry.Id,
        localId: entry.Id || `entry-${slotIndex}-${entryIndex}`,
        congDoan: entry.CongDoan || "",
        tenCongNhanGayLoi: entry.TenCongNhanGayLoi || "",
        nguoiGhiNhanId: entry.NguoiGhiNhanId || null,
        tenNguoiGhiNhan: entry.TenNguoiGhiNhan || "",
        ghiChu: entry.GhiChu || "",
        sortOrder: entry.SortOrder || entryIndex + 1,
        defects: (entry.Defects || []).map((defect, defectIndex) => ({
            localId: defect.Id || `defect-${entryIndex}-${defectIndex}`,
            defectId: Number(defect.DefectId),
            maLoi: defect.MaLoi || "",
            tenLoi: defect.TenLoi || "",
            soLuong: defect.SoLuong == null ? "" : String(defect.SoLuong),
            soLuongDatSauSua: defect.SoLuongDatSauSua == null ? "" : String(defect.SoLuongDatSauSua),
            soLuongKhongDatSauSua: defect.SoLuongKhongDatSauSua == null ? "" : String(defect.SoLuongKhongDatSauSua),
            ghiChu: defect.GhiChu || "",
            savedUrls: parseImages(defect.ImageUrls),
            files: []
        }))
    }))
});

const newEntry = (index, user) => ({
    localId: `entry-${Date.now()}-${index}`,
    congDoan: "",
    tenCongNhanGayLoi: "",
    nguoiGhiNhanId: user?.id || user?.userId || null,
    tenNguoiGhiNhan: user?.fullName || user?.FullName || "",
    ghiChu: "",
    sortOrder: index + 1,
    defects: []
});

export default function TrenChuyenSlotEditor({ open, phieuId, gioKiem, slots = [], onClose, onSaved }) {
    const user = useMemo(() => getCurrentUser(), []);
    const [allSlots, setAllSlots] = useState([]);
    const [slot, setSlot] = useState(null);
    const [catalog, setCatalog] = useState([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!open) return;
        const mapped = slots.map(mapSlot);
        const selectedHour = gioKiem || TREN_CHUYEN_HOURS.find((hour) => !mapped.some((item) => item.gioKiem === hour)) || TREN_CHUYEN_HOURS[0];
        setAllSlots(mapped);
        setSlot(mapped.find((item) => item.gioKiem === selectedHour) || {
            gioKiem: selectedHour,
            sortOrder: TREN_CHUYEN_HOURS.indexOf(selectedHour) + 1,
            entries: []
        });
        setError("");
        getDefectList().then((response) => setCatalog(response.data || []))
            .catch(() => setError("Không tải được ngân hàng lỗi."));
    }, [gioKiem, open, slots]);

    const setEntry = (index, patch) => {
        setSlot((current) => ({
            ...current,
            entries: current.entries.map((entry, entryIndex) => entryIndex === index ? { ...entry, ...patch } : entry)
        }));
    };

    const setDefect = (entryIndex, defectIndex, patch) => {
        setSlot((current) => ({
            ...current,
            entries: current.entries.map((entry, currentEntry) => currentEntry !== entryIndex ? entry : {
                ...entry,
                defects: entry.defects.map((defect, currentDefect) => currentDefect === defectIndex ? { ...defect, ...patch } : defect)
            })
        }));
    };

    const addDefect = (entryIndex, defect) => {
        if (!defect || entryIndex < 0) return;
        const entry = slot.entries[entryIndex];
        if (entry.defects.some((item) => item.defectId === Number(defect.Id))) {
            setError("Lỗi này đã được thêm trong công đoạn.");
            return;
        }
        setEntry(entryIndex, {
            defects: [...entry.defects, {
                localId: `defect-${Date.now()}-${defect.Id}`,
                defectId: Number(defect.Id),
                maLoi: defect.MaLoi || "",
                tenLoi: defect.TenLoi || "",
                soLuong: "1",
                soLuongDatSauSua: "",
                soLuongKhongDatSauSua: "",
                ghiChu: "",
                savedUrls: [],
                files: []
            }]
        });
    };

    const removeEntry = async (entryIndex) => {
        const entry = slot.entries[entryIndex];
        if (!window.confirm("Xóa công đoạn và toàn bộ lỗi thuộc công đoạn này?")) return;
        try {
            if (entry.id) await deleteTrenChuyenEntry(entry.id);
            setSlot((current) => ({
                ...current,
                entries: current.entries.filter((_, index) => index !== entryIndex)
            }));
        } catch (deleteError) {
            setError(deleteError.response?.data?.message || "Không thể xóa công đoạn.");
        }
    };

    const validate = () => {
        if (!TREN_CHUYEN_HOURS.includes(slot.gioKiem)) return "Khung giờ không hợp lệ.";
        const entriesWithDefects = slot.entries.filter((entry) => entry.defects.some((defect) => Number(defect.soLuong) > 0));
        if (!entriesWithDefects.length) return "Cần ít nhất một công đoạn có lỗi để lưu.";
        for (const entry of entriesWithDefects) {
            if (!entry.congDoan.trim()) return "Có công đoạn chưa nhập tên.";
            if (!entry.tenCongNhanGayLoi.trim()) return "Có công đoạn chưa nhập công nhân gây lỗi.";
        }
        return "";
    };

    const handleSave = async () => {
        const message = validate();
        if (message) {
            setError(message);
            return;
        }
        try {
            setSaving(true);
            setError("");
            const readySlot = {
                ...slot,
                entries: slot.entries.map((entry) => ({
                    ...entry,
                    defects: entry.defects.map((defect) => ({ ...defect }))
                }))
            };
            for (const entry of readySlot.entries) {
                for (const defect of entry.defects) {
                    if (defect.files.length) {
                        const uploadResponse = await uploadInspectionImages(defect.files);
                        defect.savedUrls = [...defect.savedUrls, ...(uploadResponse.data?.filePaths || [])];
                    }
                }
            }
            const merged = [...allSlots.filter((item) => item.gioKiem !== readySlot.gioKiem), readySlot]
                .sort((a, b) => a.sortOrder - b.sortOrder);
            await saveTrenChuyenData({
                phieuKiemId: phieuId,
                slots: merged.map((item, slotIndex) => ({
                    gioKiem: item.gioKiem,
                    sortOrder: item.sortOrder || slotIndex + 1,
                    entries: item.entries.map((entry, entryIndex) => ({
                        congDoan: entry.congDoan.trim(),
                        tenCongNhanGayLoi: entry.tenCongNhanGayLoi.trim(),
                        nguoiGhiNhanId: entry.nguoiGhiNhanId || user?.id || user?.userId || null,
                        ghiChu: entry.ghiChu.trim(),
                        sortOrder: entry.sortOrder || entryIndex + 1,
                        defects: entry.defects
                            .filter((defect) => Number(defect.defectId) > 0 && Number(defect.soLuong) > 0)
                            .map((defect, defectIndex) => ({
                                defectId: defect.defectId,
                                soLuong: Number(defect.soLuong),
                                soLuongDatSauSua: defect.soLuongDatSauSua === "" ? null : Number(defect.soLuongDatSauSua),
                                soLuongKhongDatSauSua: defect.soLuongKhongDatSauSua === "" ? null : Number(defect.soLuongKhongDatSauSua),
                                ghiChu: defect.ghiChu.trim(),
                                imageUrls: defect.savedUrls,
                                sortOrder: defectIndex + 1
                            }))
                    }))
                }))
            });
            await onSaved?.();
            onClose?.();
        } catch (saveError) {
            setError(saveError.response?.data?.message || "Không thể lưu khung giờ.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <ResponsiveInspectionDialog open={open} onClose={saving ? undefined : onClose}>
            <DialogTitle>Ghi nhận theo khung giờ</DialogTitle>
            <DialogContent dividers sx={{ pb: { xs: 12, sm: 2 } }}>
                {!slot ? null : (
                    <Stack spacing={2}>
                        {error && <Alert severity="error">{error}</Alert>}
                        <TextField
                            select
                            label="Khung giờ"
                            value={slot.gioKiem}
                            disabled={Boolean(gioKiem)}
                            onChange={(event) => setSlot((current) => ({
                                ...current,
                                gioKiem: event.target.value,
                                sortOrder: TREN_CHUYEN_HOURS.indexOf(event.target.value) + 1
                            }))}
                        >
                            {TREN_CHUYEN_HOURS.map((hour) => (
                                <MenuItem key={hour} value={hour} disabled={allSlots.some((item) => item.gioKiem === hour && hour !== slot.gioKiem)}>
                                    {hour}
                                </MenuItem>
                            ))}
                        </TextField>
                        {slot.entries.map((entry, entryIndex) => (
                            <Box key={entry.localId} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 1.5 }}>
                                <Stack spacing={1.5}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Typography fontWeight={800}>Công đoạn {entryIndex + 1}</Typography>
                                        <IconButton color="error" onClick={() => removeEntry(entryIndex)}><DeleteOutlineIcon /></IconButton>
                                    </Stack>
                                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                                        <TextField fullWidth label="Tên công đoạn" value={entry.congDoan} onChange={(event) => setEntry(entryIndex, { congDoan: event.target.value })} />
                                        <TextField fullWidth label="Công nhân gây lỗi" value={entry.tenCongNhanGayLoi} onChange={(event) => setEntry(entryIndex, { tenCongNhanGayLoi: event.target.value })} />
                                    </Stack>
                                    <TextField label="Ghi chú công đoạn" multiline minRows={2} value={entry.ghiChu} onChange={(event) => setEntry(entryIndex, { ghiChu: event.target.value })} />
                                    <DefectPickerDialog
                                        defects={catalog.filter((defect) => !entry.defects.some((item) => item.defectId === Number(defect.Id)))}
                                        onSelect={(defect) => addDefect(entryIndex, defect)}
                                        disabled={saving}
                                        fullWidth
                                    />
                                    {entry.defects.map((defect, defectIndex) => (
                                        <Box key={defect.localId} sx={{ bgcolor: "grey.50", borderRadius: 2, p: 1.5 }}>
                                            <Stack spacing={1}>
                                                <Stack direction="row" justifyContent="space-between">
                                                    <Typography fontWeight={700}>{defect.maLoi} - {defect.tenLoi}</Typography>
                                                    <IconButton color="error" onClick={() => setEntry(entryIndex, {
                                                        defects: entry.defects.filter((_, index) => index !== defectIndex)
                                                    })}><DeleteOutlineIcon /></IconButton>
                                                </Stack>
                                                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                                                    <TextField label="Số lỗi" type="number" value={defect.soLuong} onChange={(event) => setDefect(entryIndex, defectIndex, { soLuong: event.target.value.replace(/\D/g, "") })} />
                                                    <TextField label="Sửa đạt" type="number" value={defect.soLuongDatSauSua} onChange={(event) => setDefect(entryIndex, defectIndex, { soLuongDatSauSua: event.target.value.replace(/\D/g, "") })} />
                                                    <TextField label="Sửa không đạt" type="number" value={defect.soLuongKhongDatSauSua} onChange={(event) => setDefect(entryIndex, defectIndex, { soLuongKhongDatSauSua: event.target.value.replace(/\D/g, "") })} />
                                                </Stack>
                                                <TextField label="Ghi chú lỗi" value={defect.ghiChu} onChange={(event) => setDefect(entryIndex, defectIndex, { ghiChu: event.target.value })} />
                                                <InspectionImagePicker
                                                    savedUrls={defect.savedUrls}
                                                    files={defect.files}
                                                    onSavedUrlsChange={(savedUrls) => setDefect(entryIndex, defectIndex, { savedUrls })}
                                                    onFilesChange={(files) => setDefect(entryIndex, defectIndex, { files })}
                                                    disabled={saving}
                                                />
                                            </Stack>
                                        </Box>
                                    ))}
                                </Stack>
                            </Box>
                        ))}
                        <Button
                            startIcon={<AddIcon />}
                            variant="outlined"
                            onClick={() => setSlot((current) => ({
                                ...current,
                                entries: [...current.entries, newEntry(current.entries.length, user)]
                            }))}
                        >
                            Thêm công đoạn
                        </Button>
                    </Stack>
                )}
            </DialogContent>
            <DialogActions sx={{
                position: { xs: "fixed", sm: "static" },
                left: 0, right: 0, bottom: 0,
                bgcolor: "background.paper",
                borderTop: { xs: "1px solid", sm: 0 },
                borderColor: "divider",
                pb: { xs: "calc(12px + env(safe-area-inset-bottom))", sm: 1.5 }
            }}>
                <Button onClick={onClose} disabled={saving}>Hủy</Button>
                <Button variant="contained" onClick={handleSave} disabled={saving || !slot}>
                    {saving ? "Đang lưu..." : "Lưu nháp"}
                </Button>
            </DialogActions>
        </ResponsiveInspectionDialog>
    );
}
