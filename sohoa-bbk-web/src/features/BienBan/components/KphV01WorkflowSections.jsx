import { useMemo, useState } from "react";
import {
    Alert, AlertTitle, Button, Card, CardContent, Chip, MenuItem, Stack, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, TextField, Typography
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
    roles = [],
    permissions = [],
    isAdmin = false,
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

    console.log("[KPH_V01_OPINION_DEBUG]", {
        bienBanId,
        currentUserBoPhanId,
        roles,
        isAdmin,
        assignConfirmed: Boolean(info?.AssignConfirmed),
        opinions: opinions.map((item) => ({
            id: item.Id,
            boPhanId: item.BoPhanId,
            maBoPhan: item.MaBoPhan,
            tenBoPhan: item.TenBoPhan,
            daTraLoi: Boolean(item.NguoiTraLoiId),
            trungBoPhanNguoiDung: Number(item.BoPhanId) === Number(currentUserBoPhanId)
        }))
    });

    const submitOpinion = async (opinion) => {
        const value = responses[opinion.Id] || {};
        const payload = {
            ...value,
            luaChon: "CO"
        };
        try {
            setSaving(true);
            await respondSpecialistOpinion(bienBanId, opinion.Id, payload);
            showToast("Đã xác nhận ý kiến", "success");
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
                    {Boolean(info.AssignConfirmed) && (isAdmin ? opinions.some((item) => !item.NguoiTraLoiId) : ownPendingOpinions.length > 0) && (
                        <Alert severity="info" sx={{ mb: 2, alignItems: "flex-start" }}>
                            <AlertTitle sx={{ fontWeight: 700 }}>Hướng dẫn xác nhận dành cho Trưởng bộ phận</AlertTitle>
                            Kiểm tra nội dung và phương án xử lý của bộ phận trước khi xác nhận. Nếu có ý kiến,
                            nhập nội dung vào ô bên dưới; nếu không có nội dung bổ sung thì có thể để trống.
                            Ý kiến của bộ phận luôn được ghi nhận là “Có”. Sau khi xác nhận ý kiến, bạn mới có thể
                            xác nhận tiến độ xử lý của bộ phận.
                        </Alert>
                    )}
                    {opinions.length === 0 ? (
                        <Typography color="text.secondary">Ý kiến chuyên môn sẽ được tạo theo danh sách bộ phận xử lý.</Typography>
                    ) : (
                        <Stack spacing={2}>
                            {opinions.some((opinion) => opinion.NguoiTraLoiId) && (
                                <TableContainer sx={{ border: "1px solid #e5e7eb", borderRadius: 2 }}>
                                    <Table size="small">
                                        <TableHead sx={{ bgcolor: "#f8fafc" }}>
                                            <TableRow>
                                                <TableCell>Bộ phận</TableCell>
                                                <TableCell>Ý kiến</TableCell>
                                                <TableCell>Nội dung</TableCell>
                                                <TableCell>Người xác nhận</TableCell>
                                                <TableCell>Thời gian</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {opinions.filter((opinion) => opinion.NguoiTraLoiId).map((opinion) => (
                                                <TableRow key={opinion.Id} hover>
                                                    <TableCell sx={{ fontWeight: 700 }}>{opinion.TenBoPhan || opinion.MaBoPhan}</TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            size="small"
                                                            color="success"
                                                            label="Có"
                                                        />
                                                    </TableCell>
                                                    <TableCell sx={{ whiteSpace: "pre-wrap", minWidth: 220 }}>{opinion.NoiDung || "—"}</TableCell>
                                                    <TableCell>{opinion.NguoiTraLoi || "—"}</TableCell>
                                                    <TableCell sx={{ whiteSpace: "nowrap" }}>{opinion.ThoiGian ? new Date(opinion.ThoiGian).toLocaleString("vi-VN") : "—"}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                            {opinions.some((opinion) => !opinion.NguoiTraLoiId) && (
                                <TableContainer sx={{ border: "1px solid #e5e7eb", borderRadius: 2 }}>
                                    <Table size="small" sx={{ minWidth: 760 }}>
                                        <TableHead sx={{ bgcolor: "#f8fafc" }}>
                                            <TableRow>
                                                <TableCell>Bộ phận</TableCell>
                                                <TableCell sx={{ width: 120 }}>Ý kiến</TableCell>
                                                <TableCell>Nội dung</TableCell>
                                                <TableCell sx={{ width: 130 }}>Trạng thái</TableCell>
                                                <TableCell align="center" sx={{ width: 140 }}>Thao tác</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {opinions.filter((opinion) => !opinion.NguoiTraLoiId).map((opinion) => {
                                                const pendingForCurrentUser = Boolean(info.AssignConfirmed) &&
                                                    (isAdmin || ownPendingOpinions.some((item) => item.Id === opinion.Id));
                                                const draft = responses[opinion.Id] || {};
                                                return (
                                                    <TableRow key={opinion.Id} hover>
                                                        <TableCell sx={{ fontWeight: 700 }}>{opinion.TenBoPhan || opinion.MaBoPhan}</TableCell>
                                                        <TableCell>
                                                            {pendingForCurrentUser ? (
                                                                <Chip
                                                                    size="small"
                                                                    color="success"
                                                                    label="Có"
                                                                />
                                                            ) : "—"}
                                                        </TableCell>
                                                        <TableCell sx={{ minWidth: 240 }}>
                                                            {pendingForCurrentUser ? (
                                                                <TextField fullWidth multiline minRows={2} size="small" placeholder="Nhập nội dung nếu có ý kiến" value={draft.noiDung || ""} onChange={(event) => setResponses((prev) => ({ ...prev, [opinion.Id]: { ...draft, noiDung: event.target.value } }))} />
                                                            ) : (
                                                                <Typography variant="body2" color="text.secondary">
                                                                    {info.AssignConfirmed ? "Đang chờ phòng ban phản hồi." : "Đang chờ xác nhận phân công."}
                                                                </Typography>
                                                            )}
                                                        </TableCell>
                                                        <TableCell><Chip size="small" color="warning" label="Chờ ý kiến" /></TableCell>
                                                        <TableCell align="center">
                                                            {pendingForCurrentUser && <Button variant="contained" size="small" disabled={saving} onClick={() => submitOpinion(opinion)}>Xác nhận</Button>}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                        </Stack>
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
