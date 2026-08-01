import { useEffect, useMemo, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Checkbox,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControlLabel,
    IconButton,
    Stack,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CloseIcon from "@mui/icons-material/Close";
import { getDefectList } from "../../../api/lookup.api";
import {
    saveCheckItem,
    uploadInspectionImages
} from "../../../api/phieuKiem.api";
import InspectionImagePicker from "./InspectionImagePicker";
import ResponsiveInspectionDialog from "./ResponsiveInspectionDialog";
import DefectPickerDialog from "./DefectPickerDialog";

const mapSavedDefect = (defect) => ({
    defectId: Number(defect.DefectId ?? defect.defectId),
    maLoi: defect.MaLoi || "",
    tenLoi: defect.TenLoi || "",
    soLuong: Number(defect.SoLuong ?? defect.soLuong ?? 1),
    savedUrls: Array.isArray(defect.ImageUrls)
        ? defect.ImageUrls
        : (() => {
            try { return JSON.parse(defect.ImageUrls || "[]"); } catch { return []; }
        })(),
    files: []
});

export default function CheckItemEditor({
    open,
    item,
    canEditDiemTrongYeu = false,
    onClose,
    onSaved
}) {
    const [ketQua, setKetQua] = useState("");
    const [giaTriDo, setGiaTriDo] = useState("");
    const [diemTrongYeu, setDiemTrongYeu] = useState(false);
    const [catalog, setCatalog] = useState([]);
    const [rows, setRows] = useState([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!open || !item) return;
        setKetQua(item.KetQua || "");
        setGiaTriDo(item.GiaTriDo == null ? "" : String(item.GiaTriDo));
        setDiemTrongYeu(Boolean(item.DiemTrongYeu));
        setRows((item.Defects || []).map(mapSavedDefect));
        setError("");
        getDefectList().then((response) => setCatalog(response.data || []))
            .catch(() => setError("Không tải được ngân hàng lỗi."));
    }, [open, item]);

    const availableCatalog = useMemo(
        () => catalog.filter((defect) => !rows.some((row) => row.defectId === Number(defect.Id))),
        [catalog, rows]
    );

    const addDefect = (defect) => {
        if (!defect) return;
        setRows((current) => [...current, {
            defectId: Number(defect.Id),
            maLoi: defect.MaLoi || "",
            tenLoi: defect.TenLoi || "",
            soLuong: 1,
            savedUrls: [],
            files: []
        }]);
    };

    const updateRow = (index, patch) => {
        setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row));
    };

    const handleResultChange = (_, value) => {
        if (!value) return;
        setKetQua(value);
        setError("");
        if (value !== "KHONG_DAT") setRows([]);
    };

    const defectsAreValid = rows.every(
        (row) => Number.isInteger(Number(row.soLuong)) && Number(row.soLuong) > 0
    );
    const canSave = Boolean(ketQua)
        && (ketQua !== "KHONG_DAT" || (rows.length > 0 && defectsAreValid));

    const handleSave = async () => {
        if (!ketQua) {
            setError("Vui lòng chọn kết quả kiểm.");
            return;
        }
        if (ketQua === "KHONG_DAT" && rows.length === 0) {
            setError("Kết quả không đạt phải có ít nhất một lỗi.");
            return;
        }
        if (rows.some((row) => !Number.isInteger(Number(row.soLuong)) || Number(row.soLuong) <= 0)) {
            setError("Số lượng lỗi phải là số nguyên dương.");
            return;
        }

        try {
            setSaving(true);
            setError("");
            const uploadedRows = [];
            for (const row of rows) {
                let uploaded = [];
                if (row.files.length) {
                    const uploadResponse = await uploadInspectionImages(row.files);
                    uploaded = uploadResponse.data?.filePaths || [];
                }
                uploadedRows.push({
                    defectId: row.defectId,
                    soLuong: Number(row.soLuong),
                    imageUrls: [...row.savedUrls, ...uploaded]
                });
            }

            await saveCheckItem({
                checkItemId: Number(item.Id),
                ketQua,
                defects: ketQua === "KHONG_DAT" ? uploadedRows : [],
                giaTriDo,
                ...(canEditDiemTrongYeu ? { diemTrongYeu } : {})
            });
            await onSaved?.();
            onClose?.();
        } catch (saveError) {
            setError(saveError.response?.data?.message || "Không thể lưu kết quả kiểm.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <ResponsiveInspectionDialog open={open} onClose={saving ? undefined : onClose}>
            <DialogTitle sx={{ pr: 6 }}>
                {item?.TenMucKiem || "Nhập kết quả kiểm"}
                <IconButton onClick={onClose} disabled={saving} sx={{ position: "absolute", right: 10, top: 8 }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ pb: { xs: 12, sm: 2 } }}>
                <Stack spacing={2}>
                    {error && <Alert severity="error">{error}</Alert>}
                    <Box>
                        <Typography variant="caption" color="text.secondary">Tham chiếu</Typography>
                        <Typography>{item?.ThamChieu || "—"}</Typography>
                    </Box>
                    <Box>
                        <Typography variant="caption" color="text.secondary">Tiêu chuẩn kỹ thuật</Typography>
                        <Typography>{item?.TieuChuan || "—"}</Typography>
                    </Box>
                    <ToggleButtonGroup
                        exclusive
                        fullWidth
                        value={ketQua}
                        onChange={handleResultChange}
                        aria-label="Kết quả kiểm"
                        sx={{
                            "& .MuiToggleButton-root": {
                                minHeight: 44,
                                fontWeight: 700,
                                textTransform: "none"
                            }
                        }}
                    >
                        <ToggleButton
                            value="DAT"
                            sx={{
                                "&.Mui-selected, &.Mui-selected:hover": {
                                    color: "success.dark",
                                    bgcolor: "rgba(34, 197, 94, 0.12)",
                                    borderColor: "success.main"
                                }
                            }}
                        >
                            Đạt
                        </ToggleButton>
                        <ToggleButton
                            value="KHONG_DAT"
                            sx={{
                                "&.Mui-selected, &.Mui-selected:hover": {
                                    color: "error.dark",
                                    bgcolor: "rgba(239, 68, 68, 0.12)",
                                    borderColor: "error.main"
                                }
                            }}
                        >
                            Không đạt
                        </ToggleButton>
                        <ToggleButton
                            value="NA"
                            sx={{
                                "&.Mui-selected, &.Mui-selected:hover": {
                                    color: "text.primary",
                                    bgcolor: "grey.200",
                                    borderColor: "grey.500"
                                }
                            }}
                        >
                            N/A
                        </ToggleButton>
                    </ToggleButtonGroup>
                    <TextField
                        fullWidth
                        label="Giá trị đo (nếu có)"
                        value={giaTriDo}
                        onChange={(event) => setGiaTriDo(event.target.value)}
                    />
                    {canEditDiemTrongYeu && (
                        <FormControlLabel
                            control={<Checkbox checked={diemTrongYeu} onChange={(event) => setDiemTrongYeu(event.target.checked)} />}
                            label="Điểm trọng yếu"
                        />
                    )}
                    {ketQua === "KHONG_DAT" && (
                        <>
                            <Divider />
                            <DefectPickerDialog
                                defects={availableCatalog}
                                onSelect={addDefect}
                                disabled={saving}
                                fullWidth
                            />
                            {rows.length === 0 && (
                                <Alert severity="warning">
                                    Kết quả không đạt cần chọn ít nhất một lỗi.
                                </Alert>
                            )}
                            {rows.map((row, index) => (
                                <Box key={row.defectId} sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                                    <Stack spacing={1.5}>
                                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                            <Box>
                                                <Typography fontWeight={700}>{row.maLoi || `Lỗi #${row.defectId}`}</Typography>
                                                <Typography variant="body2">{row.tenLoi}</Typography>
                                            </Box>
                                            <IconButton color="error" onClick={() => setRows((current) => current.filter((_, rowIndex) => rowIndex !== index))}>
                                                <DeleteOutlineIcon />
                                            </IconButton>
                                        </Stack>
                                        <TextField
                                            label="Số lượng lỗi"
                                            type="number"
                                            value={row.soLuong}
                                            inputProps={{ min: 1, step: 1 }}
                                            error={!Number.isInteger(Number(row.soLuong)) || Number(row.soLuong) <= 0}
                                            helperText={(!Number.isInteger(Number(row.soLuong)) || Number(row.soLuong) <= 0)
                                                ? "Nhập số nguyên dương."
                                                : undefined}
                                            onChange={(event) => updateRow(index, { soLuong: event.target.value.replace(/\D/g, "") })}
                                        />
                                        <InspectionImagePicker
                                            savedUrls={row.savedUrls}
                                            files={row.files}
                                            onSavedUrlsChange={(savedUrls) => updateRow(index, { savedUrls })}
                                            onFilesChange={(files) => updateRow(index, { files })}
                                            disabled={saving}
                                        />
                                    </Stack>
                                </Box>
                            ))}
                        </>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions sx={{
                position: { xs: "fixed", sm: "static" },
                left: 0,
                right: 0,
                bottom: 0,
                bgcolor: "background.paper",
                borderTop: { xs: "1px solid rgba(15, 23, 42, 0.12)", sm: 0 },
                px: { xs: 2, sm: 3 },
                py: { xs: 1.25, sm: 1.5 },
                pb: { xs: "calc(10px + env(safe-area-inset-bottom))", sm: 1.5 },
                gap: 1
            }}>
                <Button onClick={onClose} disabled={saving} sx={{ minHeight: 44 }}>Hủy</Button>
                <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={saving || !canSave}
                    sx={{ minHeight: 48, px: 2.5 }}
                >
                    {saving ? "Đang lưu..." : "Lưu kết quả"}
                </Button>
            </DialogActions>
        </ResponsiveInspectionDialog>
    );
}
