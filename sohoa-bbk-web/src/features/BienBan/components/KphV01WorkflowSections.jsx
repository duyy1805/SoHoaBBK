import { useState } from "react";
import {
    Alert, Box, Button, Card, CardContent, Chip, Dialog, DialogActions,
    DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography
} from "@mui/material";
import {
    confirmSpecialistOpinion, returnSpecialistOpinion, saveFollowUpEvaluation,
    saveSpecialistOpinionDraft
} from "../../../api/bienBan.api";
import { getCurrentUser } from "../../../utils/auth";
import ResponsiveDataList from "./ResponsiveDataList";

export default function KphV01WorkflowSections({
    bienBanId,
    info,
    opinions = [],
    evaluation,
    currentUserBoPhanId,
    roles = [],
    permissions = [],
    isAdmin = false,
    onPatchOpinion,
    onReturned,
    reload,
    showToast,
    canManageDepartments = false,
    onManageDepartments
}) {
    const [responses, setResponses] = useState({});
    const [returnDialog, setReturnDialog] = useState({ open: false, opinion: null, reason: "" });
    const [followUp, setFollowUp] = useState({ ketQua: "", phieuKphMoiSo: "", ghiChu: "" });
    const [savingId, setSavingId] = useState(null);
    const currentUser = getCurrentUser() || {};
    const managedDepartmentIds = new Set(
        (currentUser.managedBoPhanIds || [currentUser.boPhanId, currentUserBoPhanId]).map(Number)
    );
    const isDepartmentLead = roles.some((role) => String(role || "").toUpperCase().startsWith("TP_"));
    const canFollowUp = isAdmin || permissions.includes("THEO_DOI_KPH") ||
        permissions.includes("KET_LUAN") || permissions.includes("QUAN_TRI_DM");

    const opinionValue = (opinion) => responses[opinion.Id] ?? opinion.NoiDung ?? "";

    const submitOpinion = async (opinion) => {
        const noiDung = String(opinionValue(opinion)).trim();
        if (!noiDung) {
            showToast("Vui lòng nhập nội dung ý kiến. Nếu không có góp ý, nhập “Không có ý kiến”.", "warning");
            return;
        }
        try {
            setSavingId(opinion.Id);
            const response = await saveSpecialistOpinionDraft(bienBanId, opinion.Id, { noiDung });
            const ownsDepartment = managedDepartmentIds.has(Number(opinion.BoPhanId));
            onPatchOpinion?.(opinion.Id, {
                NoiDung: noiDung,
                NguoiTraLoi: currentUser.fullName || currentUser.username || "Người dùng hiện tại",
                OpinionSavedByName: currentUser.fullName || currentUser.username || "Người dùng hiện tại",
                OpinionSavedAt: new Date().toISOString(),
                ThoiGian: new Date().toISOString(),
                HasOpinion: true,
                HasResponded: false,
                TrangThai: "CHO_TBP_XAC_NHAN",
                CanConfirmOpinion: isAdmin || (ownsDepartment && isDepartmentLead),
                CanReturn: isAdmin || (ownsDepartment && isDepartmentLead)
            });
            showToast(response.data?.message || "Đã lưu ý kiến", "success");
        } catch (error) {
            showToast(error?.response?.data?.message || "Không thể lưu ý kiến", "error");
        } finally {
            setSavingId(null);
        }
    };

    const confirmOpinion = async (opinion) => {
        try {
            setSavingId(opinion.Id);
            const response = await confirmSpecialistOpinion(bienBanId, opinion.Id);
            onPatchOpinion?.(opinion.Id, {
                HasConfirmed: true,
                HasResponded: true,
                TrangThai: "DA_XAC_NHAN",
                ConfirmedByName: currentUser.fullName || currentUser.username || "Trưởng bộ phận",
                ConfirmedAt: new Date().toISOString(),
                CanSaveOpinion: false,
                CanConfirmOpinion: false,
                CanReturn: false
            });
            showToast(response.data?.message || "Đã xác nhận ý kiến", "success");
        } catch (error) {
            showToast(error?.response?.data?.message || "Không thể xác nhận ý kiến", "error");
        } finally {
            setSavingId(null);
        }
    };

    const returnOpinion = async () => {
        const { opinion, reason } = returnDialog;
        if (!reason.trim()) {
            showToast("Vui lòng nhập lý do trả lại", "warning");
            return;
        }
        try {
            setSavingId(opinion.Id);
            const response = await returnSpecialistOpinion(bienBanId, opinion.Id, reason.trim());
            onReturned?.({
                opinion,
                reason: reason.trim(),
                returnedByName: currentUser.fullName || currentUser.username || "Trưởng bộ phận",
                returnedAt: new Date().toISOString()
            });
            setReturnDialog({ open: false, opinion: null, reason: "" });
            showToast(response.data?.message || "Đã trả lại biên bản", "success");
        } catch (error) {
            showToast(error?.response?.data?.message || "Không thể trả lại biên bản", "error");
        } finally {
            setSavingId(null);
        }
    };

    const submitFollowUp = async () => {
        try {
            setSavingId("follow-up");
            await saveFollowUpEvaluation(bienBanId, followUp);
            showToast("Đã hoàn tất theo dõi đánh giá", "success");
            await reload();
        } catch (error) {
            showToast(error?.response?.data?.message || "Không thể lưu đánh giá", "error");
        } finally {
            setSavingId(null);
        }
    };

    if (info?.MauPhieuVersion !== "V01") return null;

    return (
        <Stack spacing={2}>
            <Card id="bien-ban-y-kien-chuyen-mon" elevation={0} sx={{ border: "1px solid #e0e0e0", borderRadius: 2, scrollMarginTop: 86 }}>
                <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} spacing={1} sx={{ mb: 1.5 }}>
                        <Typography variant="h6">Ý kiến phòng ban chuyên môn</Typography>
                        {canManageDepartments && onManageDepartments && (
                            <Button size="small" variant="outlined" onClick={onManageDepartments}>
                                {opinions.length ? "Bổ sung / cập nhật bộ phận" : "Chọn bộ phận"}
                            </Button>
                        )}
                    </Stack>
                    {Boolean(info.OpinionDepartmentsConfirmed) && !info.CreatorConfirmedAt && (
                        <Alert severity="info" sx={{ mb: 1.5, py: 0.25, alignItems: "center" }}>
                            <Typography variant="body2">
                                <strong>Quy trình:</strong> Nhân viên lưu ý kiến chung, sau đó TBP xác nhận hoặc trả lại.
                            </Typography>
                        </Alert>
                    )}

                    {opinions.length === 0 ? (
                        <Typography color="text.secondary">Bộ phận tạo phiếu chưa gửi danh sách cần lấy ý kiến.</Typography>
                    ) : (
                        <ResponsiveDataList
                            rows={opinions}
                            getRowKey={(opinion) => opinion.Id}
                            columns={[
                                {
                                    key: "department",
                                    label: "Bộ phận",
                                    cellSx: { width: 170, verticalAlign: "top" },
                                    render: (opinion) => (
                                        <Stack spacing={0.25}>
                                            <Typography variant="body2" fontWeight={800}>{opinion.TenBoPhan || opinion.MaBoPhan || "—"}</Typography>
                                            {opinion.MaBoPhan && opinion.MaBoPhan !== opinion.TenBoPhan && (
                                                <Typography variant="caption" color="text.secondary">{opinion.MaBoPhan}</Typography>
                                            )}
                                            {opinion.SuggestedUserName && (
                                                <Typography variant="caption" color="info.main">
                                                    Phụ trách: <strong>{opinion.SuggestedUserName}</strong>
                                                </Typography>
                                            )}
                                        </Stack>
                                    )
                                },
                                {
                                    key: "opinion",
                                    label: "Nội dung ý kiến",
                                    cellSx: { minWidth: 260, verticalAlign: "top" },
                                    render: (opinion) => opinion.CanSaveOpinion ? (
                                        <TextField fullWidth multiline minRows={2} size="small"
                                            placeholder="Nếu không có góp ý, nhập “Không có ý kiến”"
                                            value={opinionValue(opinion)}
                                            onChange={(event) => setResponses((prev) => ({ ...prev, [opinion.Id]: event.target.value }))}
                                        />
                                    ) : (
                                        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{opinion.NoiDung || "—"}</Typography>
                                    )
                                },
                                {
                                    key: "people",
                                    label: "Người thực hiện",
                                    cellSx: { width: 210, verticalAlign: "top" },
                                    render: (opinion) => {
                                        const savedBy = opinion.OpinionSavedByName || opinion.NguoiTraLoi;
                                        const savedAt = opinion.OpinionSavedAt || opinion.ThoiGian;
                                        return (
                                            <Stack spacing={0.5}>
                                                <PersonTime label="Nhập" name={savedBy} time={savedAt} />
                                                <PersonTime label="Xác nhận" name={opinion.ConfirmedByName} time={opinion.ConfirmedAt} color="success.main" />
                                            </Stack>
                                        );
                                    }
                                },
                                {
                                    key: "status",
                                    label: "Trạng thái",
                                    cellSx: { width: 145, verticalAlign: "top" },
                                    render: (opinion) => {
                                        const status = opinion.HasConfirmed
                                            ? { label: "Đã xác nhận", color: "success" }
                                            : opinion.HasOpinion
                                                ? { label: "Chờ TBP xác nhận", color: "warning" }
                                                : { label: "Chờ nhập ý kiến", color: "default" };
                                        return <Chip size="small" color={status.color} label={status.label} />;
                                    }
                                },
                                {
                                    key: "actions",
                                    label: "Thao tác",
                                    align: "right",
                                    cellSx: { width: 170, verticalAlign: "top" },
                                    render: (opinion) => {
                                        const busy = savingId === opinion.Id;
                                        const canLeadAct = Boolean(opinion.CanConfirmOpinion || opinion.CanReturn);
                                        if (!opinion.CanSaveOpinion && !canLeadAct) return "—";
                                        return (
                                            <Stack spacing={0.75} alignItems={{ xs: "stretch", md: "flex-end" }}>
                                                {opinion.CanSaveOpinion && (
                                                    <Button variant="outlined" size="small" disabled={busy} onClick={() => submitOpinion(opinion)}>
                                                        {busy ? "Đang lưu…" : (opinion.HasOpinion ? "Cập nhật" : "Lưu ý kiến")}
                                                    </Button>
                                                )}
                                                {canLeadAct && (
                                                    <Stack direction="row" spacing={0.75}>
                                                        <Button size="small" variant="text" color="error" disabled={busy}
                                                            onClick={() => setReturnDialog({ open: true, opinion, reason: "" })}>Trả lại</Button>
                                                        <Button size="small" variant="contained" color="success" disabled={busy}
                                                            onClick={() => confirmOpinion(opinion)}>Xác nhận</Button>
                                                    </Stack>
                                                )}
                                            </Stack>
                                        );
                                    }
                                }
                            ]}
                        />
                    )}
                </CardContent>
            </Card>

            <Card id="bien-ban-theo-doi" elevation={0} sx={{ border: "1px solid #e0e0e0", borderRadius: 2, scrollMarginTop: 86 }}>
                <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>Theo dõi đánh giá</Typography>
                    {evaluation ? (
                        <Stack spacing={1}>
                            <Chip sx={{ alignSelf: "flex-start" }} color={evaluation.KetQua === "THOA_MAN" ? "success" : "error"}
                                label={evaluation.KetQua === "THOA_MAN" ? "Thỏa mãn" : "Không thỏa mãn"} />
                            {evaluation.PhieuKphMoiSo && <Typography>Phiếu KPH mới: <strong>{evaluation.PhieuKphMoiSo}</strong></Typography>}
                            <Typography sx={{ whiteSpace: "pre-wrap" }}>{evaluation.GhiChu || "Không có ghi chú"}</Typography>
                            <Typography variant="caption" color="text.secondary">{evaluation.NguoiTheoDoi} · {new Date(evaluation.ThoiGian).toLocaleString("vi-VN")}</Typography>
                        </Stack>
                    ) : info.TrangThai === "CHO_THEO_DOI" && canFollowUp ? (
                        <Stack spacing={2}>
                            <TextField select size="small" label="Kết quả" value={followUp.ketQua}
                                onChange={(event) => setFollowUp((prev) => ({ ...prev, ketQua: event.target.value }))}>
                                <MenuItem value="THOA_MAN">Thỏa mãn</MenuItem>
                                <MenuItem value="KHONG_THOA_MAN">Không thỏa mãn</MenuItem>
                            </TextField>
                            {followUp.ketQua === "KHONG_THOA_MAN" && <TextField size="small" label="Số phiếu KPH mới"
                                value={followUp.phieuKphMoiSo} onChange={(event) => setFollowUp((prev) => ({ ...prev, phieuKphMoiSo: event.target.value }))} />}
                            <TextField multiline minRows={3} label="Ghi chú" value={followUp.ghiChu}
                                onChange={(event) => setFollowUp((prev) => ({ ...prev, ghiChu: event.target.value }))} />
                            <Button variant="contained" color="success" disabled={savingId === "follow-up"} onClick={submitFollowUp}>Hoàn tất đánh giá</Button>
                        </Stack>
                    ) : <Typography color="text.secondary">Phiếu chưa chuyển sang bước theo dõi đánh giá.</Typography>}
                </CardContent>
            </Card>

            <Dialog open={returnDialog.open} onClose={() => savingId ? null : setReturnDialog({ open: false, opinion: null, reason: "" })} maxWidth="sm" fullWidth>
                <DialogTitle>Trả lại biên bản</DialogTitle>
                <DialogContent dividers>
                    <Alert severity="warning" sx={{ mb: 2 }}>Toàn bộ xác nhận trong vòng hiện tại sẽ mất hiệu lực và các bộ phận phải xác nhận lại sau khi gửi lại.</Alert>
                    <TextField autoFocus fullWidth required multiline minRows={3} label="Lý do trả lại"
                        value={returnDialog.reason} onChange={(event) => setReturnDialog((prev) => ({ ...prev, reason: event.target.value }))} />
                </DialogContent>
                <DialogActions>
                    <Button disabled={Boolean(savingId)} onClick={() => setReturnDialog({ open: false, opinion: null, reason: "" })}>Hủy</Button>
                    <Button disabled={Boolean(savingId)} color="error" variant="contained" onClick={returnOpinion}>Trả lại</Button>
                </DialogActions>
            </Dialog>
        </Stack>
    );
}

function PersonTime({ label, name, time, color = "text.secondary" }) {
    if (!name) return <Typography variant="caption" color="text.disabled">{label}: —</Typography>;
    return (
        <Box>
            <Typography variant="caption" color={color} display="block">{label}: <strong>{name}</strong></Typography>
            {time && <Typography variant="caption" color="text.secondary">{new Date(time).toLocaleString("vi-VN")}</Typography>}
        </Box>
    );
}
