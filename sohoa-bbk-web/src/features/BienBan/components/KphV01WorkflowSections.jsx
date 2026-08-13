import { useState } from "react";
import {
    Alert, Box, Button, Card, CardContent, Chip, Dialog, DialogActions,
    DialogContent, DialogTitle, Divider, MenuItem, Stack, TextField, Typography
} from "@mui/material";
import {
    confirmSpecialistOpinion, returnSpecialistOpinion, saveFollowUpEvaluation,
    saveSpecialistOpinionDraft
} from "../../../api/bienBan.api";
import { getCurrentUser } from "../../../utils/auth";

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
    showToast
}) {
    const [responses, setResponses] = useState({});
    const [returnDialog, setReturnDialog] = useState({ open: false, opinion: null, reason: "" });
    const [followUp, setFollowUp] = useState({ ketQua: "", phieuKphMoiSo: "", ghiChu: "" });
    const [savingId, setSavingId] = useState(null);
    const currentUser = getCurrentUser() || {};
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
            const ownsDepartment = Number(opinion.BoPhanId) === Number(currentUserBoPhanId);
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
            <Card elevation={0} sx={{ border: "1px solid #e0e0e0", borderRadius: 2 }}>
                <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                    <Typography variant="h6" sx={{ mb: 1.5 }}>Ý kiến phòng ban chuyên môn</Typography>
                    {Boolean(info.OpinionDepartmentsConfirmed) && !info.CreatorConfirmedAt && (
                        <Alert severity="info" sx={{ mb: 2, py: 0.5, alignItems: "center" }}>
                            <Typography variant="body2">
                                <strong>Quy trình:</strong> Nhân viên lưu ý kiến chung, sau đó TBP xác nhận hoặc trả lại.
                            </Typography>
                        </Alert>
                    )}

                    {opinions.length === 0 ? (
                        <Typography color="text.secondary">Bộ phận tạo phiếu chưa gửi danh sách cần lấy ý kiến.</Typography>
                    ) : (
                        <Stack spacing={1.5}>
                            {opinions.map((opinion) => {
                                const busy = savingId === opinion.Id;
                                const canLeadAct = Boolean(opinion.CanConfirmOpinion || opinion.CanReturn);
                                const status = opinion.HasConfirmed
                                    ? { label: "Đã xác nhận", color: "success" }
                                    : opinion.HasOpinion
                                        ? { label: "Chờ TBP xác nhận", color: "warning" }
                                        : { label: "Chờ nhập ý kiến", color: "default" };
                                const savedBy = opinion.OpinionSavedByName || opinion.NguoiTraLoi;
                                const savedAt = opinion.OpinionSavedAt || opinion.ThoiGian;
                                return (
                                    <Box key={opinion.Id} sx={{ border: "1px solid #e2e8f0", borderRadius: 2, overflow: "hidden", bgcolor: "#fff" }}>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}
                                            sx={{ px: { xs: 1.5, md: 2 }, py: 1.25, bgcolor: "#f8fafc" }}>
                                            <Box sx={{ minWidth: 0 }}>
                                                <Typography fontWeight={800}>{opinion.TenBoPhan || opinion.MaBoPhan}</Typography>
                                                {opinion.MaBoPhan && opinion.MaBoPhan !== opinion.TenBoPhan && (
                                                    <Typography variant="caption" color="text.secondary">{opinion.MaBoPhan}</Typography>
                                                )}
                                            </Box>
                                            <Chip size="small" color={status.color} label={status.label} sx={{ flexShrink: 0 }} />
                                        </Stack>
                                        <Divider />

                                        <Stack spacing={1.5} sx={{ p: { xs: 1.5, md: 2 } }}>
                                            {opinion.SuggestedUserName && (
                                                <Box sx={{ px: 1.25, py: 1, borderRadius: 1.5, bgcolor: "info.50", border: "1px solid", borderColor: "info.100" }}>
                                                    <Typography variant="body2">
                                                        Người phụ trách sản phẩm được đề xuất: <strong>{opinion.SuggestedUserName}</strong>
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Bộ phận: {opinion.TenBoPhan || opinion.MaBoPhan || "—"}
                                                        {opinion.ProductResponsibleAddedAt
                                                            ? ` · Được gắn với sản phẩm lúc ${new Date(opinion.ProductResponsibleAddedAt).toLocaleString("vi-VN")}`
                                                            : ""}
                                                    </Typography>
                                                </Box>
                                            )}
                                            {opinion.CanSaveOpinion ? (
                                                <TextField fullWidth multiline minRows={3} size="small"
                                                    label="Nội dung ý kiến"
                                                    placeholder="Nếu không có góp ý, nhập “Không có ý kiến”"
                                                    value={opinionValue(opinion)}
                                                    onChange={(event) => setResponses((prev) => ({ ...prev, [opinion.Id]: event.target.value }))}
                                                />
                                            ) : (
                                                <Box sx={{ p: 1.5, minHeight: 64, borderRadius: 1.5, bgcolor: "#f8fafc" }}>
                                                    <Typography variant="caption" color="text.secondary">Nội dung ý kiến</Typography>
                                                    <Typography sx={{ mt: 0.5, whiteSpace: "pre-wrap" }}>{opinion.NoiDung || "—"}</Typography>
                                                </Box>
                                            )}

                                            {(savedBy || opinion.ConfirmedByName) && (
                                                <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 0.5, sm: 3 }}>
                                                    {savedBy && (
                                                        <Typography variant="caption" color="text.secondary">
                                                            Người nhập: <strong>{savedBy}</strong>
                                                            {savedAt ? ` · ${new Date(savedAt).toLocaleString("vi-VN")}` : ""}
                                                        </Typography>
                                                    )}
                                                    {opinion.ConfirmedByName && (
                                                        <Typography variant="caption" color="success.main">
                                                            Người xác nhận: <strong>{opinion.ConfirmedByName}</strong>
                                                            {opinion.ConfirmedAt ? ` · ${new Date(opinion.ConfirmedAt).toLocaleString("vi-VN")}` : ""}
                                                        </Typography>
                                                    )}
                                                </Stack>
                                            )}

                                            {(opinion.CanSaveOpinion || canLeadAct) && (
                                                <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1}>
                                                    <Box>
                                                        {opinion.CanSaveOpinion && (
                                                            <Button variant="outlined" size="small" disabled={busy} onClick={() => submitOpinion(opinion)}>
                                                                {busy ? "Đang lưu…" : (opinion.HasOpinion ? "Cập nhật ý kiến" : "Lưu ý kiến")}
                                                            </Button>
                                                        )}
                                                    </Box>
                                                    {canLeadAct && (
                                                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                            <Button size="small" variant="outlined" color="error" disabled={busy}
                                                                onClick={() => setReturnDialog({ open: true, opinion, reason: "" })}>Trả lại</Button>
                                                            <Button size="small" variant="contained" color="success" disabled={busy}
                                                                onClick={() => confirmOpinion(opinion)}>TBP xác nhận</Button>
                                                        </Stack>
                                                    )}
                                                </Stack>
                                            )}
                                        </Stack>
                                    </Box>
                                );
                            })}
                        </Stack>
                    )}
                </CardContent>
            </Card>

            <Card elevation={0} sx={{ border: "1px solid #e0e0e0", borderRadius: 2 }}>
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
