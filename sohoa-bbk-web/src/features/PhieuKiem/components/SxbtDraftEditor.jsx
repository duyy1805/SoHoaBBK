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
import AddIcon from "@mui/icons-material/Add";
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
    const normalizedRows = source.map((row, index) => ({
        ...row,
        ClientKey: row.ClientKey || (row.Id ? `db-${row.Id}` : `new-initial-${item.Id}-${index}`),
        BtpItemId: row.BtpItemId || item.Id,
        DauTuanGS1: row.DauTuanGS1 || "",
        ThuTu: row.ThuTu || "",
        LxvtLot: row.LxvtLot || "",
        SoLotSX: row.SoLotSX || "",
        SoLuongNhap: row.SoLuongNhap ?? "",
        SortOrder: row.SortOrder || index + 1
    }));
    return normalizedRows.flatMap((row, rowIndex) => {
        const weekMarks = splitValues(row.DauTuanGS1);
        const materialLots = splitValues(row.LxvtLot);
        const rowCount = Math.max(weekMarks.length, materialLots.length);
        const cannotPair = weekMarks.length > 1
            && materialLots.length > 1
            && weekMarks.length !== materialLots.length;
        if (rowCount <= 1 || cannotPair) return [row];

        return Array.from({ length: rowCount }, (_, splitIndex) => ({
            ...row,
            Id: splitIndex === 0 ? row.Id : undefined,
            ClientKey: splitIndex === 0
                ? row.ClientKey
                : `auto-${item.Id}-${row.Id || rowIndex}-${splitIndex}`,
            DauTuanGS1: weekMarks.length > 1 ? weekMarks[splitIndex] : (weekMarks[0] || ""),
            LxvtLot: materialLots.length > 1 ? materialLots[splitIndex] : (materialLots[0] || ""),
            SoLuongNhap: "",
            SortOrder: rowIndex + splitIndex + 1
        }));
    });
};

let nextLotRowSequence = 0;
const createLotClientKey = (itemId) => `new-${itemId}-${Date.now()}-${nextLotRowSequence++}`;
const splitValues = (value) => [...new Set(String(value || "")
    .split(/[,;\n]+/)
    .map((part) => part.trim())
    .filter(Boolean))];
const allocatedQuantity = (item) => item.LotRows.reduce(
    (sum, row) => sum + (Number.isFinite(Number(row.SoLuongNhap)) ? Number(row.SoLuongNhap) : 0),
    0
);

export default function SxbtDraftEditor({
    open,
    phieu,
    sourceBtpItems = [],
    sourceSummary,
    sourceDefects = [],
    dynamicFields = [],
    sourceConclusion = "",
    onClose,
    onSaved
}) {
    const [conditions, setConditions] = useState({ thung: "DAT", ngoaiQuan: "DAT" });
    const [btpItems, setBtpItems] = useState([]);
    const [sampleType, setSampleType] = useState("LAN_1_2");
    const [sampleRate, setSampleRate] = useState("100");
    const [sampleQuantity, setSampleQuantity] = useState("");
    const [actualQuantity, setActualQuantity] = useState("");
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
        setActualQuantity(phieu?.SoLuongThucTe == null ? "" : String(phieu.SoLuongThucTe));
        setConclusion(phieu?.KetLuan || sourceConclusion || "DAT");
        setDefects(sourceDefects.filter((defect) => Number(defect.SoLuong) > 0).map((defect, index) => ({
            localId: defect.Id || `defect-${index}`,
            DefectId: Number(defect.DefectId),
            TenLoi: defect.TenLoi || "",
            DefectType: defect.DefectType || "",
            SoLuong: Number(defect.SoLuong || 0),
            IsLapLai: Boolean(defect.IsLapLai),
            BtpItemId: defect.BtpItemId || null,
            BtpLotRowId: defect.BtpLotRowId || null,
            BtpLotClientKey: defect.BtpLotRowId ? `db-${defect.BtpLotRowId}` : null,
            BtpTenSanPham: defect.BtpTenSanPham || "",
            BtpSoLotSX: defect.BtpSoLotSX || "",
            SourceID_KeHoachSanXuat: defect.SourceID_KeHoachSanXuat || null
        })));
        setTarget("");
        setError("");
        getDefectList({ phanHe: "SXBT" }).then((response) => setCatalog(response.data || []))
            .catch(() => setError("Không tải được ngân hàng lỗi SXBT."));
    }, [dynamicFields, open, phieu, sourceBtpItems, sourceConclusion, sourceDefects, sourceSummary]);

    const lotTargets = useMemo(() => btpItems.flatMap((item) =>
        item.LotRows.map((row, index) => ({
            key: row.ClientKey,
            item,
            row,
            label: `${item.TenSanPham || "BTP"} · Lot ${row.SoLotSX || index + 1} · SL ${row.SoLuongNhap || 0}`
        }))
    ), [btpItems]);
    const selectedLotTarget = useMemo(
        () => lotTargets.find((item) => item.key === target) || null,
        [lotTargets, target]
    );
    const totalSamples = Number(sampleQuantity || 0);
    const effectiveQuantity = actualQuantity === ""
        ? Number(phieu?.SoLuong || 0)
        : Number(actualQuantity);
    const totalAllocatedQuantity = btpItems.reduce((sum, item) => sum + allocatedQuantity(item), 0);
    const totalDefects = defects.reduce((sum, defect) => sum + Number(defect.SoLuong || 0), 0);
    const criticalDefects = defects.filter((defect) => ["Nghiêm trọng", "CRITICAL"].includes(defect.DefectType))
        .reduce((sum, defect) => sum + Number(defect.SoLuong || 0), 0);
    const rate = Number(sampleRate || 0);
    const sampleExceedsEffective = effectiveQuantity >= 0 && totalSamples > effectiveQuantity;
    const formatRate = (value) => String(Math.round(Number(value) * 100) / 100);

    const handleActualQuantityChange = (value) => {
        const normalized = value.replace(/\D/g, "");
        setActualQuantity(normalized);
        const nextEffectiveQuantity = normalized === "" ? Number(phieu?.SoLuong || 0) : Number(normalized);
        const lotRowCount = btpItems.reduce((sum, item) => sum + item.LotRows.length, 0);
        if (lotRowCount === 1) {
            setBtpItems((current) => current.map((item) => ({
                ...item,
                LotRows: item.LotRows.map((row) => ({ ...row, SoLuongNhap: String(nextEffectiveQuantity) }))
            })));
        }
        if (nextEffectiveQuantity > 0 && sampleQuantity !== "") {
            setSampleRate(formatRate(Number(sampleQuantity || 0) * 100 / nextEffectiveQuantity));
        }
    };

    const handleSampleRateChange = (value) => {
        const normalized = value.replace(',', '.').replace(/[^0-9.]/g, "");
        setSampleRate(normalized);
        const nextRate = Number(normalized);
        if (!Number.isNaN(nextRate) && effectiveQuantity > 0) {
            setSampleQuantity(String(Math.ceil(effectiveQuantity * nextRate / 100)));
        }
    };

    const handleSampleQuantityChange = (value) => {
        const normalized = value.replace(/\D/g, "");
        setSampleQuantity(normalized);
        if (effectiveQuantity > 0 && normalized !== "") {
            setSampleRate(formatRate(Number(normalized) * 100 / effectiveQuantity));
        }
    };

    const updateLot = (itemId, rowIndex, patch) => setBtpItems((current) => current.map((item) =>
        Number(item.Id) !== Number(itemId) ? item : {
            ...item,
            LotRows: item.LotRows.map((row, index) => index === rowIndex ? { ...row, ...patch } : row)
        }
    ));

    const addLotRow = (itemId) => setBtpItems((current) => current.map((item) => {
        if (Number(item.Id) !== Number(itemId)) return item;
        const previous = item.LotRows[item.LotRows.length - 1] || {};
        return {
            ...item,
            LotRows: [...item.LotRows, {
                ClientKey: createLotClientKey(item.Id),
                BtpItemId: item.Id,
                DauTuanGS1: "",
                ThuTu: previous.ThuTu || "",
                LxvtLot: "",
                SoLotSX: previous.SoLotSX || "",
                SoLuongNhap: "",
                SortOrder: item.LotRows.length + 1
            }]
        };
    }));

    const removeLotRow = (itemId, rowIndex) => {
        const item = btpItems.find((candidate) => Number(candidate.Id) === Number(itemId));
        const row = item?.LotRows[rowIndex];
        if (!item || !row) return;
        if (item.LotRows.length === 1) {
            setError("Mỗi BTP phải có ít nhất một dòng lot.");
            return;
        }
        if (row.SoLuongKhoXacNhan !== null && row.SoLuongKhoXacNhan !== undefined && row.SoLuongKhoXacNhan !== ""
            || row.KhoXacNhanBy || row.KhoXacNhanAt) {
            setError("Không thể xóa dòng lot đã được Kho xác nhận.");
            return;
        }
        if (defects.some((defect) => defect.BtpLotClientKey === row.ClientKey)) {
            setError("Dòng lot đang có lỗi được ghi nhận. Hãy xóa lỗi hoặc chuyển lỗi sang dòng khác trước.");
            return;
        }
        setBtpItems((current) => current.map((candidate) => Number(candidate.Id) !== Number(itemId)
            ? candidate
            : { ...candidate, LotRows: candidate.LotRows.filter((_, index) => index !== rowIndex) }));
        if (target === row.ClientKey) setTarget("");
        setError("");
    };

    const addDefect = (defect) => {
        const selectedTarget = lotTargets.find((item) => item.key === target);
        if (!defect || !selectedTarget) return;
        const existingIndex = defects.findIndex((item) =>
            item.DefectId === Number(defect.Id)
            && item.BtpLotClientKey === selectedTarget.row.ClientKey
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
                BtpLotClientKey: selectedTarget.row.ClientKey,
                BtpTenSanPham: selectedTarget.item.TenSanPham || "",
                BtpSoLotSX: selectedTarget.row.SoLotSX || "",
                SourceID_KeHoachSanXuat: selectedTarget.item.SourceID_KeHoachSanXuat || null
            }]);
        }
    };

    const handleSave = async () => {
        if ((actualQuantity !== "" && (!Number.isInteger(Number(actualQuantity)) || Number(actualQuantity) <= 0))) {
            setError("Số lượng thực tế phải là số nguyên dương hoặc để trống.");
            return;
        }
        if (!Number.isInteger(totalSamples) || totalSamples < 0 || Number.isNaN(rate) || rate < 0) {
            setError("Số lượng mẫu và tỷ lệ mẫu không hợp lệ.");
            return;
        }
        if (sampleExceedsEffective) {
            setError(`Số lượng mẫu không được vượt quá số lượng dùng tính tỷ lệ (${effectiveQuantity}).`);
            return;
        }
        if (defects.some((defect) => !Number.isInteger(Number(defect.SoLuong)) || Number(defect.SoLuong) <= 0)) {
            setError("Số lượng lỗi phải là số nguyên dương.");
            return;
        }
        for (const item of btpItems) {
            if (!item.LotRows.length) {
                setError(`BTP #${item.SourceID_KeHoachSanXuat || item.Id} phải có ít nhất một dòng lot.`);
                return;
            }
            const invalidQuantity = item.LotRows.some((row) => {
                const value = String(row.SoLuongNhap ?? "").trim().replace(',', '.');
                return !/^\d+(?:\.\d{1,2})?$/.test(value) || Number(value) <= 0;
            });
            if (invalidQuantity) {
                setError(`Số lượng từng dòng của KH #${item.SourceID_KeHoachSanXuat || item.Id} phải lớn hơn 0 và tối đa 2 số lẻ.`);
                return;
            }
            if (item.LotRows.some((row) => /[,;\r\n]/.test(String(row.DauTuanGS1 || ""))
                || /[,;\r\n]/.test(String(row.LxvtLot || "")))) {
                setError(`Mỗi dòng của KH #${item.SourceID_KeHoachSanXuat || item.Id} chỉ được nhập một dấu tuần và một LXVT/LOT. Hãy bấm “Tách thêm dòng” trước khi nhập.`);
                return;
            }
        }
        if (Math.abs(totalAllocatedQuantity - effectiveQuantity) > 0.001) {
            setError(`Tổng số lượng các dòng dấu tuần/LXVT phải bằng số lượng thực tế (${effectiveQuantity}). Hiện đã phân bổ ${totalAllocatedQuantity}.`);
            return;
        }
        try {
            setSaving(true);
            setError("");
            const tyLeDat = totalSamples > 0 ? 100 - totalDefects * 100 / totalSamples : 0;
            await saveSxbtData({
                phieuKiemId: phieu.Id,
                soLuongThucTe: actualQuantity === "" ? null : Number(actualQuantity),
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
                    <Alert severity={Math.abs(totalAllocatedQuantity - effectiveQuantity) <= 0.001 ? "success" : "warning"}>
                        Tổng đã phân bổ theo dấu tuần/LXVT: {totalAllocatedQuantity} / {effectiveQuantity} {btpItems[0]?.DonViTinh || ""}
                    </Alert>
                    {btpItems.map((item) => (
                        <Box key={item.Id} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 1.5 }}>
                            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1}>
                                <Box>
                                    <Typography fontWeight={800}>{item.TenSanPham || "BTP"}</Typography>
                                    <Typography variant="body2" color="text.secondary">KH #{item.SourceID_KeHoachSanXuat || "—"} · {item.MaDonHang || "Không có đơn hàng"}</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Đã phân bổ cho kế hoạch này: {allocatedQuantity(item)} {item.DonViTinh || ""}
                                    </Typography>
                                </Box>
                                <Button startIcon={<AddIcon />} onClick={() => addLotRow(item.Id)} sx={{ alignSelf: { sm: "flex-start" } }}>
                                    Tách thêm dòng
                                </Button>
                            </Stack>
                            <Stack spacing={1.5} sx={{ mt: 1.5 }}>
                                {item.LotRows.map((row, rowIndex) => (
                                    <Box key={row.ClientKey} sx={{ bgcolor: "grey.50", p: 1.5, borderRadius: 2 }}>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                                            <Typography variant="subtitle2">Dòng Lot {rowIndex + 1}</Typography>
                                            <Stack direction="row">
                                                <IconButton color="error" aria-label={`Xóa dòng lot ${rowIndex + 1}`} onClick={() => removeLotRow(item.Id, rowIndex)}>
                                                    <DeleteOutlineIcon />
                                                </IconButton>
                                            </Stack>
                                        </Stack>
                                        <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mt: 1 }}>
                                            <TextField fullWidth label="Số lượng thực tế theo dòng" value={row.SoLuongNhap} onChange={(event) => updateLot(item.Id, rowIndex, { SoLuongNhap: event.target.value.replace(',', '.').replace(/[^0-9.]/g, "") })} inputProps={{ inputMode: "decimal" }} required />
                                            <TextField fullWidth label="Lot SX" value={row.SoLotSX} onChange={(event) => updateLot(item.Id, rowIndex, { SoLotSX: event.target.value })} />
                                            <TextField fullWidth label="Dấu tuần/GS1" value={row.DauTuanGS1} onChange={(event) => updateLot(item.Id, rowIndex, { DauTuanGS1: event.target.value })} />
                                            <TextField fullWidth label="Thứ tự" value={row.ThuTu} onChange={(event) => updateLot(item.Id, rowIndex, { ThuTu: event.target.value })} />
                                            <TextField fullWidth label="LXVT/LOT" value={row.LxvtLot} onChange={(event) => updateLot(item.Id, rowIndex, { LxvtLot: event.target.value })} />
                                        </Stack>
                                    </Box>
                                ))}
                            </Stack>
                        </Box>
                    ))}
                    <Typography variant="h6">III. Tỷ lệ kiểm</Typography>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                        <TextField fullWidth label="Số lượng kế hoạch" value={phieu?.SoLuong ?? 0} disabled />
                        <TextField
                            fullWidth
                            label="Số lượng thực tế"
                            type="number"
                            value={actualQuantity}
                            onChange={(event) => handleActualQuantityChange(event.target.value)}
                            inputProps={{ min: 1, step: 1 }}
                            helperText="Để trống sẽ dùng số lượng kế hoạch"
                        />
                        <TextField
                            fullWidth
                            label="Số lượng dùng tính tỷ lệ"
                            value={effectiveQuantity}
                            disabled
                        />
                    </Stack>
                    <TextField select label="Loại mẫu" value={sampleType} onChange={(event) => setSampleType(event.target.value)}>
                        <MenuItem value="LAN_1_2">Lần 1, 2</MenuItem>
                        <MenuItem value="LAN_3">Lần 3</MenuItem>
                        <MenuItem value="LO_TRUOC_KHONG_DAT">Lô trước không đạt</MenuItem>
                    </TextField>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                        <TextField fullWidth label="Tỷ lệ mẫu (%)" type="number" value={sampleRate} onChange={(event) => handleSampleRateChange(event.target.value)} />
                        <TextField
                            fullWidth
                            label="Số lượng mẫu"
                            type="number"
                            value={sampleQuantity}
                            onChange={(event) => handleSampleQuantityChange(event.target.value)}
                            error={sampleExceedsEffective}
                            helperText={sampleExceedsEffective ? `Không được vượt quá ${effectiveQuantity}` : " "}
                        />
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
                            productName={selectedLotTarget?.item?.TenSanPham || ""}
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
