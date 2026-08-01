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
    updateCongDoanPlan,
    uploadInspectionImages
} from "../../../api/phieuKiem.api";
import InspectionImagePicker from "./InspectionImagePicker";
import ResponsiveInspectionDialog from "./ResponsiveInspectionDialog";
import DefectPickerDialog from "./DefectPickerDialog";

const lotKey = (lot) => lot?.id ? `id:${lot.id}` : lot?.clientKey || null;
const defectLotKey = (defect) => defect?.lotId ? `id:${defect.lotId}` : defect?.lotClientKey || null;
const parseImages = (value) => {
    if (Array.isArray(value)) return value;
    try { return JSON.parse(value || "[]"); } catch { return []; }
};

const mapPlan = (plan) => ({
    ...plan,
    soLuongThucTe: plan.SoLuongThucTe == null ? "" : String(plan.SoLuongThucTe),
    ghiChu: plan.GhiChu || "",
    soLoiBuiBan: String(plan.SoLoiBuiBan || ""),
    soLoiConTrung: String(plan.SoLoiConTrung || ""),
    lots: (plan.Lots || []).map((lot, index) => ({
        id: lot.Id || null,
        clientKey: lot.Id ? `id:${lot.Id}` : `lot-${index + 1}`,
        rowVersion: lot.RowVersion || null,
        lot: lot.Lot || "",
        lenhXuatVatTu: lot.LenhXuatVatTu || "",
        soLuong: String(lot.SoLuong ?? ""),
        soLoiBuiBan: String(lot.SoLoiBuiBan || ""),
        soLoiConTrung: String(lot.SoLoiConTrung || "")
    })),
    defects: (plan.Defects || []).map((defect, index) => ({
        localId: defect.Id || `defect-${index}`,
        defectId: Number(defect.DefectId),
        maLoi: defect.MaLoi || "",
        tenLoi: defect.TenLoi || "",
        lotId: defect.PlanLotId || null,
        lotClientKey: defect.PlanLotId ? `id:${defect.PlanLotId}` : null,
        tenCongNhan: defect.TenCongNhan || "",
        soLuong: String(defect.SoLuong ?? ""),
        soLuongDatSauSua: defect.SoLuongDatSauSua == null ? "" : String(defect.SoLuongDatSauSua),
        soLuongKhongDatSauSua: defect.SoLuongKhongDatSauSua == null ? "" : String(defect.SoLuongKhongDatSauSua),
        ghiChu: defect.GhiChu || "",
        savedUrls: parseImages(defect.ImageUrls),
        files: []
    }))
});

export default function CongDoanPlanEditor({ open, phieuId, sourcePlan, onClose, onSaved }) {
    const [plan, setPlan] = useState(null);
    const [catalog, setCatalog] = useState([]);
    const [worker, setWorker] = useState("");
    const [selectedLotKey, setSelectedLotKey] = useState("");
    const [legacySpecialTarget, setLegacySpecialTarget] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!open || !sourcePlan) return;
        setPlan(mapPlan(sourcePlan));
        setWorker("");
        setSelectedLotKey("");
        setLegacySpecialTarget("");
        setError("");
        getDefectList().then((response) => setCatalog(response.data || []))
            .catch(() => setError("Không tải được ngân hàng lỗi."));
    }, [open, sourcePlan]);

    const effective = plan?.soLuongThucTe === "" ? Number(plan?.SoLuongKeHoach || 0) : Number(plan?.soLuongThucTe || 0);
    const allocated = (plan?.lots || []).reduce((sum, lot) => sum + Number(lot.soLuong || 0), 0);
    const targetLots = useMemo(() => (plan?.lots || []).map((lot, index) => ({
        key: lotKey(lot),
        label: `Dòng ${index + 1}: Lot ${lot.lot || "—"} · LXVT ${lot.lenhXuatVatTu || "—"}`
    })), [plan]);

    const updateLot = (index, patch) => setPlan((current) => ({
        ...current,
        lots: current.lots.map((lot, lotIndex) => lotIndex === index ? { ...lot, ...patch } : lot)
    }));
    const updateDefect = (index, patch) => setPlan((current) => ({
        ...current,
        defects: current.defects.map((defect, defectIndex) => defectIndex === index ? { ...defect, ...patch } : defect)
    }));

    const addLot = () => setPlan((current) => ({
        ...current,
        lots: [...current.lots, {
            id: null,
            clientKey: `lot-${Date.now()}-${current.lots.length + 1}`,
            rowVersion: null,
            lot: "",
            lenhXuatVatTu: "",
            soLuong: "",
            soLoiBuiBan: "",
            soLoiConTrung: ""
        }]
    }));

    const removeLot = (index) => {
        const lot = plan.lots[index];
        const key = lotKey(lot);
        if (plan.defects.some((defect) => defectLotKey(defect) === key)
            || Number(lot.soLoiBuiBan || 0) > 0
            || Number(lot.soLoiConTrung || 0) > 0) {
            setError("Không thể xóa Lot đang có lỗi. Hãy xóa hoặc chuyển lỗi trước.");
            return;
        }
        setPlan((current) => ({ ...current, lots: current.lots.filter((_, lotIndex) => lotIndex !== index) }));
    };

    const addDefect = (defect) => {
        if (!defect) return;
        const target = plan.lots.find((lot) => lotKey(lot) === selectedLotKey);
        const duplicate = plan.defects.some((row) =>
            row.defectId === Number(defect.Id)
            && defectLotKey(row) === (target ? lotKey(target) : null)
            && row.tenCongNhan.trim().toLocaleLowerCase("vi") === worker.trim().toLocaleLowerCase("vi")
        );
        if (duplicate) {
            setError("Lỗi này đã được nhập cho cùng công nhân trong Lot đã chọn.");
            return;
        }
        setPlan((current) => ({
            ...current,
            defects: [...current.defects, {
                localId: `defect-${Date.now()}-${defect.Id}`,
                defectId: Number(defect.Id),
                maLoi: defect.MaLoi || "",
                tenLoi: defect.TenLoi || "",
                lotId: target?.id || null,
                lotClientKey: target?.id ? null : target?.clientKey || null,
                tenCongNhan: worker.trim(),
                soLuong: "1",
                soLuongDatSauSua: "",
                soLuongKhongDatSauSua: "",
                ghiChu: "",
                savedUrls: [],
                files: []
            }]
        }));
    };

    const validate = () => {
        if (plan.soLuongThucTe !== "" && (!Number.isInteger(Number(plan.soLuongThucTe)) || Number(plan.soLuongThucTe) < 0)) {
            return "Số lượng thực tế phải là số nguyên không âm hoặc để trống.";
        }
        if (plan.lots.some((lot) => (!lot.lot.trim() && !lot.lenhXuatVatTu.trim())
            || !Number.isInteger(Number(lot.soLuong)) || Number(lot.soLuong) <= 0)) {
            return "Mỗi dòng phải có Lot hoặc Lệnh xuất vật tư và số lượng nguyên dương.";
        }
        if (allocated > effective) return `Phân bổ ${allocated}/${effective}, không được vượt số lượng hiệu lực.`;
        for (const defect of plan.defects) {
            const quantity = Number(defect.soLuong);
            const pass = Number(defect.soLuongDatSauSua || 0);
            const fail = Number(defect.soLuongKhongDatSauSua || 0);
            if (!Number.isInteger(quantity) || quantity <= 0 || pass < 0 || fail < 0 || pass + fail > quantity) {
                return `Lỗi ${defect.maLoi || defect.tenLoi}: báo cáo sửa lỗi không hợp lệ.`;
            }
        }
        for (const lot of plan.lots) {
            const total = plan.defects.filter((defect) => defectLotKey(defect) === lotKey(lot))
                .reduce((sum, defect) => sum + Number(defect.soLuong || 0), 0)
                + Number(lot.soLoiBuiBan || 0) + Number(lot.soLoiConTrung || 0);
            if (total > Number(lot.soLuong || 0)) return `Tổng lỗi của Lot ${lot.lot || lot.lenhXuatVatTu} vượt số lượng Lot.`;
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
            const defects = [];
            for (let index = 0; index < plan.defects.length; index += 1) {
                const defect = plan.defects[index];
                let imageUrls = defect.savedUrls;
                if (defect.files.length) {
                    const uploadResponse = await uploadInspectionImages(defect.files);
                    imageUrls = [...imageUrls, ...(uploadResponse.data?.filePaths || [])];
                }
                defects.push({
                    defectId: defect.defectId,
                    lotId: defect.lotId || null,
                    lotClientKey: defect.lotId ? null : defect.lotClientKey || null,
                    soLuong: Number(defect.soLuong),
                    tenCongNhan: defect.tenCongNhan.trim() || null,
                    soLuongDatSauSua: defect.soLuongDatSauSua === "" ? null : Number(defect.soLuongDatSauSua),
                    soLuongKhongDatSauSua: defect.soLuongKhongDatSauSua === "" ? null : Number(defect.soLuongKhongDatSauSua),
                    ghiChu: defect.ghiChu.trim(),
                    imageUrls,
                    sortOrder: index + 1
                });
            }
            await updateCongDoanPlan(phieuId, plan.Id, {
                soLuongThucTe: plan.soLuongThucTe === "" ? null : Number(plan.soLuongThucTe),
                lots: plan.lots.map((lot, index) => ({
                    id: lot.id,
                    clientKey: lot.clientKey,
                    rowVersion: lot.rowVersion,
                    lot: lot.lot.trim(),
                    lenhXuatVatTu: lot.lenhXuatVatTu.trim(),
                    soLuong: Number(lot.soLuong),
                    soLoiBuiBan: Number(lot.soLoiBuiBan || 0),
                    soLoiConTrung: Number(lot.soLoiConTrung || 0),
                    sortOrder: index + 1
                })),
                ghiChu: plan.ghiChu,
                soLoiBuiBan: Number(plan.soLoiBuiBan || 0),
                soLoiConTrung: Number(plan.soLoiConTrung || 0),
                defects,
                rowVersion: plan.RowVersion
            });
            await onSaved?.();
            onClose?.();
        } catch (saveError) {
            setError(saveError.response?.data?.message || "Không lưu được dữ liệu công đoạn.");
        } finally {
            setSaving(false);
        }
    };

    if (!plan) return null;
    return (
        <ResponsiveInspectionDialog open={open} onClose={saving ? undefined : onClose} maxWidth="lg">
            <DialogTitle>
                Kiểm tra kế hoạch #{plan.ID_KeHoachSanXuat}
                <Typography variant="body2" color="text.secondary">
                    Quy trình: {plan.Ten_QuyTrinhSanXuat || plan.TenQuyTrinhSanXuat || "---"}
                </Typography>
            </DialogTitle>
            <DialogContent dividers sx={{ pb: { xs: 12, sm: 2 } }}>
                <Stack spacing={2}>
                    {error && <Alert severity="error">{error}</Alert>}
                    <Box>
                        <Typography fontWeight={800}>{plan.MaSanPham} - {plan.TenSanPham}</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Kế hoạch {plan.SoLuongKeHoach || 0} · Hiệu lực {effective} · Đã phân bổ {allocated}/{effective}
                        </Typography>
                    </Box>
                    <TextField label="Số lượng thực tế (không bắt buộc)" type="number" value={plan.soLuongThucTe}
                        onChange={(event) => setPlan((current) => ({ ...current, soLuongThucTe: event.target.value.replace(/\D/g, "") }))} />
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6">Phân bổ Lot/Lệnh xuất vật tư</Typography>
                        <Button startIcon={<AddIcon />} variant="outlined" onClick={addLot}>Thêm dòng</Button>
                    </Stack>
                    {plan.lots.map((lot, lotIndex) => {
                        const key = lotKey(lot);
                        const lotDefects = plan.defects.map((defect, defectIndex) => ({ defect, defectIndex }))
                            .filter(({ defect }) => defectLotKey(defect) === key);
                        return (
                            <Box key={key} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 1.5 }}>
                                <Stack spacing={1.5}>
                                    <Stack direction="row" justifyContent="space-between">
                                        <Typography fontWeight={800}>Dòng Lot {lotIndex + 1}</Typography>
                                        <IconButton color="error" onClick={() => removeLot(lotIndex)}><DeleteOutlineIcon /></IconButton>
                                    </Stack>
                                    <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                                        <TextField label="Lot" value={lot.lot} onChange={(event) => updateLot(lotIndex, { lot: event.target.value })} />
                                        <TextField label="Lệnh xuất vật tư" value={lot.lenhXuatVatTu} onChange={(event) => updateLot(lotIndex, { lenhXuatVatTu: event.target.value })} />
                                        <TextField label="Số lượng" type="number" value={lot.soLuong} onChange={(event) => updateLot(lotIndex, { soLuong: event.target.value.replace(/\D/g, "") })} />
                                        <TextField label="Bụi bẩn" type="number" value={lot.soLoiBuiBan} onChange={(event) => updateLot(lotIndex, { soLoiBuiBan: event.target.value.replace(/\D/g, "") })} />
                                        <TextField label="Côn trùng" type="number" value={lot.soLoiConTrung} onChange={(event) => updateLot(lotIndex, { soLoiConTrung: event.target.value.replace(/\D/g, "") })} />
                                    </Stack>
                                    <Button variant="text" startIcon={<AddIcon />} onClick={() => setSelectedLotKey(key)}>Chọn Lot này để thêm lỗi</Button>
                                    {lotDefects.map(({ defect, defectIndex }) => (
                                        <DefectBox key={defect.localId} defect={defect}
                                            update={(patch) => updateDefect(defectIndex, patch)}
                                            remove={() => setPlan((current) => ({ ...current, defects: current.defects.filter((_, index) => index !== defectIndex) }))}
                                            saving={saving} />
                                    ))}
                                </Stack>
                            </Box>
                        );
                    })}
                    {!plan.lots.length && (
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                            <TextField label="Bụi bẩn" type="number" value={plan.soLoiBuiBan} onChange={(event) => setPlan((current) => ({ ...current, soLoiBuiBan: event.target.value.replace(/\D/g, "") }))} />
                            <TextField label="Côn trùng" type="number" value={plan.soLoiConTrung} onChange={(event) => setPlan((current) => ({ ...current, soLoiConTrung: event.target.value.replace(/\D/g, "") }))} />
                        </Stack>
                    )}
                    {plan.lots.length > 0 && plan.defects.some((defect) => !defectLotKey(defect)) && (
                        <Alert severity="warning">
                            Có lỗi chưa xác định Lot. Chọn Lot tại từng dòng lỗi trước khi hoàn tất.
                        </Alert>
                    )}
                    {plan.lots.length > 0
                        && (Number(plan.soLoiBuiBan || 0) > 0 || Number(plan.soLoiConTrung || 0) > 0) && (
                        <Alert severity="warning">
                            <Stack spacing={1}>
                                <Typography variant="body2">
                                    Bụi bẩn/Côn trùng cũ chưa xác định Lot: {Number(plan.soLoiBuiBan || 0)}/{Number(plan.soLoiConTrung || 0)}.
                                </Typography>
                                <TextField select size="small" label="Chuyển vào Lot" value={legacySpecialTarget}
                                    onChange={(event) => setLegacySpecialTarget(event.target.value)}>
                                    {targetLots.map((item) => <MenuItem key={item.key} value={item.key}>{item.label}</MenuItem>)}
                                </TextField>
                                <Button variant="outlined" disabled={!legacySpecialTarget} onClick={() => {
                                    const targetIndex = plan.lots.findIndex((lot) => lotKey(lot) === legacySpecialTarget);
                                    if (targetIndex < 0) return;
                                    setPlan((current) => ({
                                        ...current,
                                        soLoiBuiBan: "",
                                        soLoiConTrung: "",
                                        lots: current.lots.map((lot, index) => index === targetIndex ? {
                                            ...lot,
                                            soLoiBuiBan: String(Number(lot.soLoiBuiBan || 0) + Number(current.soLoiBuiBan || 0)),
                                            soLoiConTrung: String(Number(lot.soLoiConTrung || 0) + Number(current.soLoiConTrung || 0))
                                        } : lot)
                                    }));
                                    setLegacySpecialTarget("");
                                }}>
                                    Chuyển lỗi đặc biệt
                                </Button>
                            </Stack>
                        </Alert>
                    )}
                    {plan.defects.map((defect, defectIndex) => !defectLotKey(defect) && (
                        <Box key={defect.localId}>
                            {plan.lots.length > 0 && (
                                <TextField
                                    select fullWidth label="Phân lỗi vào Lot"
                                    value=""
                                    onChange={(event) => {
                                        const lot = plan.lots.find((item) => lotKey(item) === event.target.value);
                                        updateDefect(defectIndex, {
                                            lotId: lot?.id || null,
                                            lotClientKey: lot?.id ? null : lot?.clientKey || null
                                        });
                                    }}
                                    sx={{ mb: 1 }}
                                >
                                    {targetLots.map((item) => <MenuItem key={item.key} value={item.key}>{item.label}</MenuItem>)}
                                </TextField>
                            )}
                            <DefectBox defect={defect} update={(patch) => updateDefect(defectIndex, patch)}
                                remove={() => setPlan((current) => ({ ...current, defects: current.defects.filter((_, index) => index !== defectIndex) }))}
                                saving={saving} />
                        </Box>
                    ))}
                    <TextField label="Công nhân cho lỗi sắp thêm" value={worker} onChange={(event) => setWorker(event.target.value)} />
                    {plan.lots.length > 0 && (
                        <TextField select label="Lot nhận lỗi" value={selectedLotKey} onChange={(event) => setSelectedLotKey(event.target.value)}>
                            {targetLots.map((item) => <MenuItem key={item.key} value={item.key}>{item.label}</MenuItem>)}
                        </TextField>
                    )}
                    <DefectPickerDialog
                        defects={catalog.filter((defect) => !plan.defects.some((row) =>
                            row.defectId === Number(defect.Id)
                            && defectLotKey(row) === (selectedLotKey || null)
                            && row.tenCongNhan.trim().toLocaleLowerCase("vi") === worker.trim().toLocaleLowerCase("vi")
                        ))}
                        onSelect={addDefect}
                        disabled={saving || (plan.lots.length > 0 && !selectedLotKey)}
                        buttonLabel={plan.lots.length > 0 && !selectedLotKey ? "Chọn Lot trước khi chọn lỗi" : "Chọn lỗi"}
                        fullWidth
                    />
                    <TextField label="Ghi chú chung" multiline minRows={2} value={plan.ghiChu} onChange={(event) => setPlan((current) => ({ ...current, ghiChu: event.target.value }))} />
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

function DefectBox({ defect, update, remove, saving }) {
    return (
        <Box sx={{ bgcolor: "grey.50", borderRadius: 2, p: 1.5 }}>
            <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between">
                    <Typography fontWeight={700}>{defect.maLoi} - {defect.tenLoi}</Typography>
                    <IconButton color="error" onClick={remove}><DeleteOutlineIcon /></IconButton>
                </Stack>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                    <TextField label="Công nhân" value={defect.tenCongNhan} onChange={(event) => update({ tenCongNhan: event.target.value })} />
                    <TextField label="Số lỗi" type="number" value={defect.soLuong} onChange={(event) => update({ soLuong: event.target.value.replace(/\D/g, "") })} />
                    <TextField label="Sửa đạt" type="number" value={defect.soLuongDatSauSua} onChange={(event) => update({ soLuongDatSauSua: event.target.value.replace(/\D/g, "") })} />
                    <TextField label="Sửa không đạt" type="number" value={defect.soLuongKhongDatSauSua} onChange={(event) => update({ soLuongKhongDatSauSua: event.target.value.replace(/\D/g, "") })} />
                </Stack>
                <TextField label="Ghi chú lỗi" value={defect.ghiChu} onChange={(event) => update({ ghiChu: event.target.value })} />
                <InspectionImagePicker savedUrls={defect.savedUrls} files={defect.files}
                    onSavedUrlsChange={(savedUrls) => update({ savedUrls })}
                    onFilesChange={(files) => update({ files })} disabled={saving} />
            </Stack>
        </Box>
    );
}
