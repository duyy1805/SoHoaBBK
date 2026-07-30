import { useMemo, useState } from "react";
import {
    Alert, AlertTitle, Button, Card, CardContent, Chip, MenuItem, Stack, Table,
    TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography
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

    const isDepartmentLead = roles.some((role) =>
        String(role || "").toUpperCase().startsWith("TP_")
    );
    const canFollowUp = permissions.includes("THEO_DOI_KPH") ||
        permissions.includes("KET_LUAN") ||
        permissions.includes("QUAN_TRI_DM");
    const ownPendingOpinions = useMemo(
        () => opinions.filter((item) =>
            Number(item.BoPhanId) === Number(currentUserBoPhanId) && !item.HasResponded
        ),
        [opinions, currentUserBoPhanId]
    );

    const submitOpinion = async (opinion) => {
        try {
            setSaving(true);
            await respondSpecialistOpinion(bienBanId, opinion.Id, {
                noiDung: String(responses[opinion.Id] || "").trim()
            });
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
                    {Boolean(info.OpinionDepartmentsConfirmed) &&
                        (isAdmin || (isDepartmentLead && ownPendingOpinions.length > 0)) &&
                        !info.CreatorConfirmedAt && (
                        <Alert severity="info" sx={{ mb: 2 }}>
                            <AlertTitle sx={{ fontWeight: 700 }}>Dành cho Trưởng bộ phận</AlertTitle>
                            Kiểm tra nội dung mục 5, 6, 7 và nhập một ý kiến chung của phòng ban trước khi xác nhận.
                        </Alert>
                    )}

                    {opinions.length === 0 ? (
                        <Typography color="text.secondary">
                            Bộ phận tạo phiếu chưa xác nhận danh sách cần lấy ý kiến.
                        </Typography>
                    ) : (
                        <TableContainer sx={{ border: "1px solid #e5e7eb", borderRadius: 2 }}>
                            <Table size="small" sx={{ minWidth: 760 }}>
                                <TableHead sx={{ bgcolor: "#f8fafc" }}>
                                    <TableRow>
                                        <TableCell>Bộ phận</TableCell>
                                        <TableCell>Nội dung ý kiến</TableCell>
                                        <TableCell>Người xác nhận</TableCell>
                                        <TableCell>Thời gian</TableCell>
                                        <TableCell align="center">Trạng thái / thao tác</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {opinions.map((opinion) => {
                                        const canRespond = Boolean(info.OpinionDepartmentsConfirmed) &&
                                            !info.CreatorConfirmedAt &&
                                            (isAdmin || (isDepartmentLead &&
                                                Number(opinion.BoPhanId) === Number(currentUserBoPhanId))) &&
                                            !opinion.HasResponded;
                                        return (
                                            <TableRow key={opinion.Id} hover>
                                                <TableCell sx={{ fontWeight: 700 }}>
                                                    {opinion.TenBoPhan || opinion.MaBoPhan}
                                                </TableCell>
                                                <TableCell sx={{ minWidth: 280 }}>
                                                    {canRespond ? (
                                                        <TextField
                                                            fullWidth
                                                            multiline
                                                            minRows={2}
                                                            size="small"
                                                            placeholder="Nhập nội dung nếu có ý kiến"
                                                            value={responses[opinion.Id] || ""}
                                                            onChange={(event) => setResponses((prev) => ({
                                                                ...prev,
                                                                [opinion.Id]: event.target.value
                                                            }))}
                                                        />
                                                    ) : (
                                                        <Typography sx={{ whiteSpace: "pre-wrap" }}>
                                                            {opinion.NoiDung || "—"}
                                                        </Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell>{opinion.NguoiTraLoi || "—"}</TableCell>
                                                <TableCell sx={{ whiteSpace: "nowrap" }}>
                                                    {opinion.ThoiGian
                                                        ? new Date(opinion.ThoiGian).toLocaleString("vi-VN")
                                                        : "—"}
                                                </TableCell>
                                                <TableCell align="center">
                                                    {opinion.HasResponded ? (
                                                        <Chip size="small" color="success" label="Đã xác nhận" />
                                                    ) : canRespond ? (
                                                        <Button
                                                            variant="contained"
                                                            size="small"
                                                            disabled={saving}
                                                            onClick={() => submitOpinion(opinion)}
                                                        >
                                                            Xác nhận
                                                        </Button>
                                                    ) : (
                                                        <Chip size="small" color="warning" label="Chờ ý kiến" />
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </CardContent>
            </Card>

            <Card elevation={0} sx={{ border: "1px solid #e0e0e0", borderRadius: 2 }}>
                <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>Theo dõi đánh giá</Typography>
                    {evaluation ? (
                        <Stack spacing={1}>
                            <Chip
                                sx={{ alignSelf: "flex-start" }}
                                color={evaluation.KetQua === "THOA_MAN" ? "success" : "error"}
                                label={evaluation.KetQua === "THOA_MAN" ? "Thỏa mãn" : "Không thỏa mãn"}
                            />
                            {evaluation.PhieuKphMoiSo && (
                                <Typography>Phiếu KPH mới: <strong>{evaluation.PhieuKphMoiSo}</strong></Typography>
                            )}
                            <Typography sx={{ whiteSpace: "pre-wrap" }}>
                                {evaluation.GhiChu || "Không có ghi chú"}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {evaluation.NguoiTheoDoi} · {new Date(evaluation.ThoiGian).toLocaleString("vi-VN")}
                            </Typography>
                        </Stack>
                    ) : info.TrangThai === "CHO_THEO_DOI" && canFollowUp ? (
                        <Stack spacing={2}>
                            <TextField
                                select
                                size="small"
                                label="Kết quả"
                                value={followUp.ketQua}
                                onChange={(event) => setFollowUp((prev) => ({
                                    ...prev,
                                    ketQua: event.target.value
                                }))}
                            >
                                <MenuItem value="THOA_MAN">Thỏa mãn</MenuItem>
                                <MenuItem value="KHONG_THOA_MAN">Không thỏa mãn</MenuItem>
                            </TextField>
                            {followUp.ketQua === "KHONG_THOA_MAN" && (
                                <TextField
                                    size="small"
                                    label="Số phiếu KPH mới"
                                    value={followUp.phieuKphMoiSo}
                                    onChange={(event) => setFollowUp((prev) => ({
                                        ...prev,
                                        phieuKphMoiSo: event.target.value
                                    }))}
                                />
                            )}
                            <TextField
                                multiline
                                minRows={3}
                                label="Ghi chú"
                                value={followUp.ghiChu}
                                onChange={(event) => setFollowUp((prev) => ({
                                    ...prev,
                                    ghiChu: event.target.value
                                }))}
                            />
                            <Button
                                variant="contained"
                                color="success"
                                disabled={saving}
                                onClick={submitFollowUp}
                            >
                                Hoàn tất đánh giá
                            </Button>
                        </Stack>
                    ) : (
                        <Typography color="text.secondary">
                            Phiếu chưa chuyển sang bước theo dõi đánh giá.
                        </Typography>
                    )}
                </CardContent>
            </Card>
        </Stack>
    );
}
