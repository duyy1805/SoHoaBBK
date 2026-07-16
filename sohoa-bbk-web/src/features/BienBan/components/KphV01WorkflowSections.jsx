import { useMemo, useState } from "react";
import {
    Box, Button, Card, CardContent, Chip, Grid, MenuItem, Stack, TextField, Typography
} from "@mui/material";
import {
    respondSpecialistOpinion, saveFollowUpEvaluation
} from "../../../api/bienBan.api";

export default function KphV01WorkflowSections({
    bienBanId,
    info,
    opinions = [],
    evaluation,
    currentUserBoPhanId,
    permissions = [],
    reload,
    showToast
}) {
    const [responses, setResponses] = useState({});
    const [followUp, setFollowUp] = useState({ ketQua: "", phieuKphMoiSo: "", ghiChu: "" });
    const [saving, setSaving] = useState(false);

    const canFollowUp = permissions.includes("THEO_DOI_KPH") || permissions.includes("KET_LUAN") || permissions.includes("QUAN_TRI_DM");
    const ownPendingOpinions = useMemo(
        () => opinions.filter((item) => Number(item.BoPhanId) === Number(currentUserBoPhanId) && !item.NguoiTraLoiId),
        [opinions, currentUserBoPhanId]
    );

    const submitOpinion = async (opinion) => {
        const value = responses[opinion.Id] || {};
        if (!["CO", "KHONG"].includes(value.luaChon)) {
            showToast("Vui lòng chọn Có hoặc Không", "warning");
            return;
        }
        try {
            setSaving(true);
            await respondSpecialistOpinion(bienBanId, opinion.Id, value);
            showToast("Đã ký xác nhận ý kiến", "success");
            await reload();
        } catch (error) {
            showToast(error?.response?.data?.message || "Không thể xác nhận ý kiến", "error");
        } finally {
            setSaving(false);
        }
    };

    const submitFollowUp = async () => {
        try {
            setSaving(true);
            await saveFollowUpEvaluation(bienBanId, followUp);
            showToast("Đã hoàn tất theo dõi đánh giá", "success");
            await reload();
        } catch (error) {
            showToast(error?.response?.data?.message || "Không thể lưu đánh giá", "error");
        } finally {
            setSaving(false);
        }
    };

    if (info?.MauPhieuVersion !== "V01") return null;

    return (
        <Stack spacing={3}>
            <Card elevation={0} sx={{ border: "1px solid #e0e0e0", borderRadius: 2 }}>
                <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>Ý kiến phòng ban chuyên môn</Typography>
                    {opinions.length === 0 ? (
                        <Typography color="text.secondary">Ý kiến chuyên môn sẽ được tạo theo danh sách bộ phận xử lý.</Typography>
                    ) : (
                        <Grid container spacing={2}>
                            {opinions.map((opinion) => {
                                const pendingForCurrentUser = Boolean(info.AssignConfirmed) &&
                                    ownPendingOpinions.some((item) => item.Id === opinion.Id);
                                const draft = responses[opinion.Id] || {};
                                return (
                                    <Grid size={{ xs: 12, md: 6 }} key={opinion.Id}>
                                        <Box sx={{ border: "1px solid #e5e7eb", borderRadius: 2, p: 2 }}>
                                            <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                                                <Typography fontWeight={700}>{opinion.TenBoPhan || opinion.MaBoPhan}</Typography>
                                                <Chip size="small" color={opinion.NguoiTraLoiId ? "success" : "warning"} label={opinion.NguoiTraLoiId ? "Đã ký" : "Chờ ý kiến"} />
                                            </Stack>
                                            {opinion.NguoiTraLoiId ? (
                                                <Stack spacing={0.75}>
                                                    <Typography variant="body2"><strong>{opinion.LuaChon === "CO" ? "Có" : "Không"}</strong> — {opinion.NoiDung || "Không có ghi chú"}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{opinion.NguoiTraLoi} · {new Date(opinion.ThoiGian).toLocaleString("vi-VN")}</Typography>
                                                </Stack>
                                            ) : pendingForCurrentUser ? (
                                                <Stack spacing={1.5}>
                                                    <TextField select size="small" label="Ý kiến" value={draft.luaChon || ""} onChange={(event) => setResponses((prev) => ({ ...prev, [opinion.Id]: { ...draft, luaChon: event.target.value } }))}>
                                                        <MenuItem value="CO">Có</MenuItem><MenuItem value="KHONG">Không</MenuItem>
                                                    </TextField>
                                                    <TextField multiline minRows={2} size="small" label="Nội dung" value={draft.noiDung || ""} onChange={(event) => setResponses((prev) => ({ ...prev, [opinion.Id]: { ...draft, noiDung: event.target.value } }))} />
                                                    <Button variant="contained" disabled={saving} onClick={() => submitOpinion(opinion)}>Ký xác nhận</Button>
                                                </Stack>
                                            ) : (
                                                <Typography variant="body2" color="text.secondary">
                                                    {info.AssignConfirmed ? "Đang chờ phòng ban phản hồi." : "Đang chờ xác nhận phân công."}
                                                </Typography>
                                            )}
                                        </Box>
                                    </Grid>
                                );
                            })}
                        </Grid>
                    )}
                </CardContent>
            </Card>

            <Card elevation={0} sx={{ border: "1px solid #e0e0e0", borderRadius: 2 }}>
                <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>Theo dõi đánh giá</Typography>
                    {evaluation ? (
                        <Stack spacing={1}>
                            <Chip sx={{ alignSelf: "flex-start" }} color={evaluation.KetQua === "THOA_MAN" ? "success" : "error"} label={evaluation.KetQua === "THOA_MAN" ? "Thỏa mãn" : "Không thỏa mãn"} />
                            {evaluation.PhieuKphMoiSo && <Typography>Phiếu KPH mới: <strong>{evaluation.PhieuKphMoiSo}</strong></Typography>}
                            <Typography sx={{ whiteSpace: "pre-wrap" }}>{evaluation.GhiChu || "Không có ghi chú"}</Typography>
                            <Typography variant="caption" color="text.secondary">{evaluation.NguoiTheoDoi} · {new Date(evaluation.ThoiGian).toLocaleString("vi-VN")}</Typography>
                        </Stack>
                    ) : info.TrangThai === "CHO_THEO_DOI" && canFollowUp ? (
                        <Stack spacing={2}>
                            <TextField select size="small" label="Kết quả" value={followUp.ketQua} onChange={(event) => setFollowUp((prev) => ({ ...prev, ketQua: event.target.value }))}>
                                <MenuItem value="THOA_MAN">Thỏa mãn</MenuItem><MenuItem value="KHONG_THOA_MAN">Không thỏa mãn</MenuItem>
                            </TextField>
                            {followUp.ketQua === "KHONG_THOA_MAN" && <TextField size="small" label="Số phiếu KPH mới" value={followUp.phieuKphMoiSo} onChange={(event) => setFollowUp((prev) => ({ ...prev, phieuKphMoiSo: event.target.value }))} />}
                            <TextField multiline minRows={3} label="Ghi chú" value={followUp.ghiChu} onChange={(event) => setFollowUp((prev) => ({ ...prev, ghiChu: event.target.value }))} />
                            <Button variant="contained" color="success" disabled={saving} onClick={submitFollowUp}>Hoàn tất đánh giá</Button>
                        </Stack>
                    ) : (
                        <Typography color="text.secondary">Phiếu chưa chuyển sang bước theo dõi đánh giá.</Typography>
                    )}
                </CardContent>
            </Card>
        </Stack>
    );
}
