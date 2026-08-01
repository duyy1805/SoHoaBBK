import { useEffect, useMemo, useState } from "react";
import {
    Alert,
    Button,
    DialogActions,
    DialogContent,
    DialogTitle,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography
} from "@mui/material";
import { saveThongSoKq } from "../../../api/phieuKiem.api";
import ResponsiveInspectionDialog from "./ResponsiveInspectionDialog";

const getStatus = (spec, rawValue) => {
    if (rawValue === "") return null;
    const value = Number(rawValue);
    const match = String(spec.GiaTriChuan ?? "").match(/[-+]?[0-9]*\.?[0-9]+/);
    if (Number.isNaN(value) || !match) return null;
    const standard = Number(match[0]);
    return value >= standard - Number(spec.DungSaiAm || 0)
        && value <= standard + Number(spec.DungSaiDuong || 0)
        ? "DAT"
        : "KHONG_DAT";
};

export default function MeasurementEditor({
    open,
    phieuId,
    specs = [],
    results = [],
    readOnly = false,
    onClose,
    onSaved
}) {
    const sampleCount = useMemo(
        () => Math.max(13, ...results.map((item) => Number(item.ThuTuMau) || 0)),
        [results]
    );
    const [matrix, setMatrix] = useState({});
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!open) return;
        const next = {};
        specs.forEach((spec) => {
            next[spec.Id] = {};
            for (let sample = 1; sample <= sampleCount; sample += 1) {
                next[spec.Id][sample] = { GiaTriDo: "", GhiChu: "" };
            }
        });
        results.forEach((item) => {
            if (!next[item.ThongSoId]) next[item.ThongSoId] = {};
            next[item.ThongSoId][item.ThuTuMau] = {
                GiaTriDo: item.GiaTriDo == null ? "" : String(item.GiaTriDo),
                GhiChu: item.GhiChu || ""
            };
        });
        setMatrix(next);
        setError("");
    }, [open, results, sampleCount, specs]);

    const updateValue = (specId, sample, value) => {
        setMatrix((current) => ({
            ...current,
            [specId]: {
                ...current[specId],
                [sample]: { ...current[specId]?.[sample], GiaTriDo: value }
            }
        }));
    };

    const handleSave = async () => {
        const payload = [];
        Object.entries(matrix).forEach(([specId, samples]) => {
            Object.entries(samples).forEach(([sample, value]) => {
                if (value.GiaTriDo !== "") {
                    payload.push({
                        ThongSoId: Number(specId),
                        ThuTuMau: Number(sample),
                        GiaTriDo: value.GiaTriDo,
                        GhiChu: value.GhiChu || ""
                    });
                }
            });
        });
        try {
            setSaving(true);
            setError("");
            await saveThongSoKq(phieuId, payload);
            await onSaved?.();
            onClose?.();
        } catch (saveError) {
            setError(saveError.response?.data?.message || "Không thể lưu kết quả đo.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <ResponsiveInspectionDialog
            open={open}
            onClose={saving ? undefined : onClose}
            maxWidth="xl"
            paperSx={{ height: { sm: "calc(100dvh - 48px)" } }}
        >
            <DialogTitle>Kết quả kiểm theo cấp độ đặc biệt</DialogTitle>
            <DialogContent
                dividers
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 1.5,
                    overflow: "hidden",
                    p: { xs: 1, sm: 2 },
                    pb: { xs: 10, sm: 2 }
                }}
            >
                {error && <Alert severity="error">{error}</Alert>}
                {!specs.length ? (
                    <Alert severity="info">Sản phẩm chưa được cấu hình thông số đặc biệt.</Alert>
                ) : (
                    <TableContainer
                        component={Paper}
                        variant="outlined"
                        sx={{
                            flex: 1,
                            overflow: "auto",
                            overscrollBehavior: "contain",
                            WebkitOverflowScrolling: "touch"
                        }}
                    >
                        <Table
                            stickyHeader
                            size="small"
                            aria-label="Kết quả kiểm theo cấp độ đặc biệt"
                            sx={{
                                minWidth: 76 + specs.length * 150,
                                tableLayout: "fixed",
                                "& th, & td": {
                                    borderRight: "1px solid",
                                    borderColor: "divider"
                                }
                            }}
                        >
                            <TableHead>
                                <TableRow>
                                    <TableCell
                                        align="center"
                                        sx={{
                                            position: "sticky",
                                            left: 0,
                                            zIndex: 4,
                                            width: 76,
                                            minWidth: 76,
                                            bgcolor: "grey.100",
                                            fontWeight: 800
                                        }}
                                    >
                                        Thứ tự<br />mẫu
                                    </TableCell>
                                    {specs.map((spec) => (
                                        <TableCell
                                            key={spec.Id}
                                            align="center"
                                            sx={{ width: 150, minWidth: 150, bgcolor: "grey.100", py: 1 }}
                                        >
                                            <Typography variant="body2" fontWeight={800} lineHeight={1.2}>
                                                {spec.NhomThongSo || spec.TenThongSo}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" lineHeight={1.2}>
                                                {spec.GiaTriChuan ?? "—"}
                                                {Number(spec.DungSaiAm || 0) === Number(spec.DungSaiDuong || 0)
                                                    ? ` ±${spec.DungSaiAm || 0}`
                                                    : ` (-${spec.DungSaiAm || 0}/+${spec.DungSaiDuong || 0})`}
                                            </Typography>
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {Array.from({ length: sampleCount }, (_, index) => index + 1).map((sample) => (
                                    <TableRow key={sample} hover>
                                        <TableCell
                                            component="th"
                                            scope="row"
                                            align="center"
                                            sx={{
                                                position: "sticky",
                                                left: 0,
                                                zIndex: 2,
                                                width: 76,
                                                minWidth: 76,
                                                bgcolor: "grey.50",
                                                fontWeight: 800
                                            }}
                                        >
                                            {String(sample).padStart(2, "0")}
                                        </TableCell>
                                        {specs.map((spec) => {
                                            const value = matrix[spec.Id]?.[sample]?.GiaTriDo || "";
                                            const status = getStatus(spec, value);
                                            return (
                                                <TableCell key={`${spec.Id}-${sample}`} sx={{ width: 150, minWidth: 150, p: 0.75 }}>
                                                    <TextField
                                                        fullWidth
                                                        type="number"
                                                        size="small"
                                                        placeholder="-"
                                                        value={value}
                                                        disabled={readOnly}
                                                        onChange={(event) => updateValue(spec.Id, sample, event.target.value)}
                                                        inputProps={{
                                                            "aria-label": `${spec.NhomThongSo || spec.TenThongSo}, mẫu ${sample}`,
                                                            step: "any",
                                                            style: { textAlign: "center", fontWeight: status ? 700 : 400 }
                                                        }}
                                                        sx={{
                                                            "& .MuiOutlinedInput-root": {
                                                                bgcolor: readOnly
                                                                    ? "grey.100"
                                                                    : status === "KHONG_DAT"
                                                                        ? "rgba(239, 68, 68, 0.08)"
                                                                        : status === "DAT"
                                                                            ? "rgba(34, 197, 94, 0.08)"
                                                                            : "background.paper",
                                                                color: status === "KHONG_DAT"
                                                                    ? "error.main"
                                                                    : status === "DAT"
                                                                        ? "success.main"
                                                                        : "text.primary",
                                                                "& fieldset": {
                                                                    borderColor: status === "KHONG_DAT"
                                                                        ? "error.main"
                                                                        : status === "DAT"
                                                                            ? "success.main"
                                                                            : "divider"
                                                                }
                                                            }
                                                        }}
                                                    />
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </DialogContent>
            <DialogActions sx={{
                position: { xs: "fixed", sm: "static" },
                left: 0,
                right: 0,
                bottom: 0,
                bgcolor: "background.paper",
                borderTop: { xs: "1px solid", sm: 0 },
                borderColor: "divider",
                pb: { xs: "calc(12px + env(safe-area-inset-bottom))", sm: 1.5 }
            }}>
                <Button onClick={onClose}>Đóng</Button>
                {!readOnly && (
                    <Button variant="contained" disabled={saving} onClick={handleSave}>
                        {saving ? "Đang lưu..." : "Lưu kết quả"}
                    </Button>
                )}
            </DialogActions>
        </ResponsiveInspectionDialog>
    );
}
