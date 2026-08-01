import { useEffect, useMemo, useState } from "react";
import {
    Alert,
    Box,
    Button,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Stack,
    TextField,
    Typography
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { getDefectList } from "../../../api/lookup.api";
import {
    saveCuoiChuyenData,
    uploadInspectionImages
} from "../../../api/phieuKiem.api";
import InspectionImagePicker from "./InspectionImagePicker";
import ResponsiveInspectionDialog from "./ResponsiveInspectionDialog";
import DefectPickerDialog from "./DefectPickerDialog";

const parseImages = (value) => {
    if (Array.isArray(value)) return value;
    try { return JSON.parse(value || "[]"); } catch { return []; }
};

const mapPlan = (plan, index) => ({
    ...plan,
    localId: plan.Id || `plan-${index}`,
    soLuongThucTe: plan.SoLuongThucTe == null ? "" : String(plan.SoLuongThucTe),
    defects: (plan.Defects || []).map((defect, defectIndex) => ({
        localId: defect.Id || `defect-${plan.Id}-${defectIndex}`,
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
});

export default function CuoiChuyenPlanEditor({ open, phieuId, planId, plans = [], onClose, onSaved }) {
    const [mappedPlans, setMappedPlans] = useState([]);
    const [plan, setPlan] = useState(null);
    const [catalog, setCatalog] = useState([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!open) return;
        const nextPlans = plans.map(mapPlan);
        setMappedPlans(nextPlans);
        setPlan(nextPlans.find((item) => Number(item.Id) === Number(planId)) || null);
        setError("");
        getDefectList().then((response) => setCatalog(response.data || []))
            .catch(() => setError("Không tải được ngân hàng lỗi."));
    }, [open, planId, plans]);

    const availableCatalog = useMemo(
        () => catalog.filter((item) => !plan?.defects?.some((row) => row.defectId === Number(item.Id))),
        [catalog, plan]
    );

    const effectiveQuantity = plan?.soLuongThucTe === ""
        ? Number(plan?.SoLuongKeHoach || 0)
        : Number(plan?.soLuongThucTe || 0);

    const updateDefect = (index, patch) => {
        setPlan((current) => ({
            ...current,
            defects: current.defects.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row)
        }));
    };

    const addDefect = (defect) => {
        if (!defect) return;
        setPlan((current) => ({
            ...current,
            defects: [...current.defects, {
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
        }));
    };

    const handleSave = async () => {
        if (plan.soLuongThucTe !== "" && (!Number.isInteger(Number(plan.soLuongThucTe)) || Number(plan.soLuongThucTe) < 0)) {
            setError("Số lượng thực tế phải là số nguyên không âm hoặc để trống.");
            return;
        }
        const validRows = plan.defects.filter((row) => Number(row.defectId) > 0 && Number(row.soLuong) > 0);
        if (!validRows.length) {
            setError("Cần có ít nhất một lỗi để lưu kế hoạch.");
            return;
        }
        const totalDefects = validRows.reduce((sum, row) => sum + Number(row.soLuong), 0);
        if (totalDefects > effectiveQuantity) {
            setError(`Tổng lỗi (${totalDefects}) vượt số lượng hiệu lực (${effectiveQuantity}).`);
            return;
        }

        try {
            setSaving(true);
            setError("");
            const readyPlan = { ...plan, defects: plan.defects.map((row) => ({ ...row })) };
            for (let index = 0; index < readyPlan.defects.length; index += 1) {
                const row = readyPlan.defects[index];
                if (row.files.length) {
                    const uploadResponse = await uploadInspectionImages(row.files);
                    row.savedUrls = [...row.savedUrls, ...(uploadResponse.data?.filePaths || [])];
                }
            }
            const merged = mappedPlans.map((item) => Number(item.Id) === Number(planId) ? readyPlan : item);
            await saveCuoiChuyenData({
                phieuKiemId: phieuId,
                plans: merged.map((item, planIndex) => ({
                    planId: item.Id,
                    sortOrder: item.SortOrder || planIndex + 1,
                    soLuongThucTe: item.soLuongThucTe === "" ? null : Number(item.soLuongThucTe),
                    defects: item.defects
                        .filter((row) => Number(row.defectId) > 0 && Number(row.soLuong) > 0)
                        .map((row, defectIndex) => ({
                            defectId: row.defectId,
                            soLuong: Number(row.soLuong),
                            soLuongDatSauSua: row.soLuongDatSauSua === "" ? null : Number(row.soLuongDatSauSua),
                            soLuongKhongDatSauSua: row.soLuongKhongDatSauSua === "" ? null : Number(row.soLuongKhongDatSauSua),
                            ghiChu: row.ghiChu.trim(),
                            imageUrls: row.savedUrls,
                            sortOrder: defectIndex + 1
                        }))
                }))
            });
            await onSaved?.();
            onClose?.();
        } catch (saveError) {
            setError(saveError.response?.data?.message || "Không thể lưu kế hoạch cuối chuyền.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <ResponsiveInspectionDialog open={open} onClose={saving ? undefined : onClose}>
            <DialogTitle>Ghi nhận lỗi theo kế hoạch</DialogTitle>
            <DialogContent dividers sx={{ pb: { xs: 12, sm: 2 } }}>
                {!plan ? <Alert severity="warning">Không tìm thấy kế hoạch.</Alert> : (
                    <Stack spacing={2}>
                        {error && <Alert severity="error">{error}</Alert>}
                        <Box>
                            <Typography fontWeight={800}>{plan.MaSanPham} - {plan.TenSanPham}</Typography>
                            <Typography variant="body2" color="primary.main" fontWeight={600}>
                                Quy trình: {plan.Ten_QuyTrinhSanXuat || plan.TenQuyTrinhSanXuat || "---"}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Kế hoạch: {plan.SoLuongKeHoach ?? 0} · Hiệu lực: {effectiveQuantity}
                            </Typography>
                        </Box>
                        <TextField
                            label="Số lượng thực tế (không bắt buộc)"
                            type="number"
                            value={plan.soLuongThucTe}
                            inputProps={{ min: 0, step: 1 }}
                            onChange={(event) => setPlan((current) => ({ ...current, soLuongThucTe: event.target.value.replace(/\D/g, "") }))}
                        />
                        <DefectPickerDialog
                            defects={availableCatalog}
                            onSelect={addDefect}
                            disabled={saving}
                            fullWidth
                        />
                        {plan.defects.map((row, index) => (
                            <Box key={row.localId} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 1.5 }}>
                                <Stack spacing={1.5}>
                                    <Stack direction="row" justifyContent="space-between">
                                        <Box>
                                            <Typography fontWeight={700}>{row.maLoi}</Typography>
                                            <Typography variant="body2">{row.tenLoi}</Typography>
                                        </Box>
                                        <IconButton color="error" onClick={() => setPlan((current) => ({
                                            ...current,
                                            defects: current.defects.filter((_, rowIndex) => rowIndex !== index)
                                        }))}>
                                            <DeleteOutlineIcon />
                                        </IconButton>
                                    </Stack>
                                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                                        <TextField label="Số lỗi" type="number" value={row.soLuong} onChange={(event) => updateDefect(index, { soLuong: event.target.value.replace(/\D/g, "") })} />
                                        <TextField label="Sửa đạt" type="number" value={row.soLuongDatSauSua} onChange={(event) => updateDefect(index, { soLuongDatSauSua: event.target.value.replace(/\D/g, "") })} />
                                        <TextField label="Sửa không đạt" type="number" value={row.soLuongKhongDatSauSua} onChange={(event) => updateDefect(index, { soLuongKhongDatSauSua: event.target.value.replace(/\D/g, "") })} />
                                    </Stack>
                                    <TextField label="Ghi chú" multiline minRows={2} value={row.ghiChu} onChange={(event) => updateDefect(index, { ghiChu: event.target.value })} />
                                    <InspectionImagePicker
                                        savedUrls={row.savedUrls}
                                        files={row.files}
                                        onSavedUrlsChange={(savedUrls) => updateDefect(index, { savedUrls })}
                                        onFilesChange={(files) => updateDefect(index, { files })}
                                        disabled={saving}
                                    />
                                </Stack>
                            </Box>
                        ))}
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
                <Button variant="contained" disabled={saving || !plan} onClick={handleSave}>
                    {saving ? "Đang lưu..." : "Lưu nháp"}
                </Button>
            </DialogActions>
        </ResponsiveInspectionDialog>
    );
}
