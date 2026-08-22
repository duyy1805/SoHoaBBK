import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Chip, MenuItem, Stack, TextField, Typography } from "@mui/material";
import {
    confirmSpecialistOpinion, returnSpecialistOpinion, saveSpecialistOpinionDraft
} from "../../api/bienBan.api";

const templates = [
    "Không có ý kiến",
    "Đồng ý phương án",
    "Đề nghị kiểm tra lại",
    "Yêu cầu bổ sung thông tin",
    "Không đồng ý"
];

export default function WorkCenterQuickOpinion({ bienBanId, opinions = [], onChanged }) {
    const actionable = useMemo(() => opinions.filter((opinion) =>
        opinion.CanSaveOpinion || opinion.CanConfirmOpinion || opinion.CanReturn
    ), [opinions]);
    const [selectedId, setSelectedId] = useState(null);
    const [values, setValues] = useState({});
    const [savingId, setSavingId] = useState(null);
    const [notice, setNotice] = useState(null);

    useEffect(() => {
        setValues(Object.fromEntries(opinions.map((opinion) => [opinion.Id, opinion.NoiDung || ""])));
        setSelectedId((current) => actionable.some((opinion) => opinion.Id === current)
            ? current : actionable[0]?.Id || null);
        setNotice(null);
    }, [actionable, opinions]);

    if (!opinions.length) return null;
    const selected = actionable.find((opinion) => opinion.Id === selectedId) || actionable[0] || null;

    const run = async (action) => {
        if (!selected) return;
        try {
            setSavingId(selected.Id);
            setNotice(null);
            if (action === "save") {
                const content = String(values[selected.Id] || "").trim();
                if (!content) throw new Error("Vui lòng nhập nội dung ý kiến");
                await saveSpecialistOpinionDraft(bienBanId, selected.Id, { noiDung: content });
            } else if (action === "confirm") {
                await confirmSpecialistOpinion(bienBanId, selected.Id);
            } else {
                const reason = window.prompt("Nhập lý do trả lại biên bản:");
                if (!reason?.trim()) return;
                await returnSpecialistOpinion(bienBanId, selected.Id, reason.trim());
            }
            setNotice({ severity: "success", text: "Đã cập nhật ý kiến bộ phận" });
            await onChanged?.();
        } catch (error) {
            setNotice({ severity: "error", text: error?.response?.data?.message || error.message || "Không thể cập nhật ý kiến" });
        } finally {
            setSavingId(null);
        }
    };

    return (
        <Stack spacing={1.1}>
            <Typography fontWeight={850}>Ý kiến của các bộ phận</Typography>
            <Stack spacing={0.6}>
                {opinions.map((opinion) => (
                    <Stack key={opinion.Id} direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                        <BoxLabel opinion={opinion} />
                        <Chip size="small" color={opinion.HasConfirmed ? "success" : opinion.HasOpinion ? "warning" : "default"}
                            label={opinion.HasConfirmed ? "Đã xác nhận" : opinion.HasOpinion ? "Chờ TBP" : "Chưa phản hồi"} sx={{ height: 22, fontSize: ".66rem" }} />
                    </Stack>
                ))}
            </Stack>

            {notice && <Alert severity={notice.severity} sx={{ py: 0.25 }}>{notice.text}</Alert>}
            {selected && (
                <Stack spacing={0.85} sx={{ pt: 1, borderTop: 1, borderColor: "divider" }}>
                    {actionable.length > 1 && (
                        <TextField select size="small" label="Bộ phận đang thao tác" value={selected.Id} onChange={(event) => setSelectedId(Number(event.target.value))}>
                            {actionable.map((opinion) => <MenuItem key={opinion.Id} value={opinion.Id}>{opinion.TenBoPhan || opinion.MaBoPhan}</MenuItem>)}
                        </TextField>
                    )}
                    {selected.CanSaveOpinion ? (
                        <>
                            <TextField multiline minRows={3} size="small" placeholder="Nhập ý kiến hoặc ghi chú của bạn..."
                                value={values[selected.Id] || ""}
                                onChange={(event) => setValues((current) => ({ ...current, [selected.Id]: event.target.value }))} />
                            <Stack direction="row" spacing={0.55} useFlexGap flexWrap="wrap">
                                {templates.map((template) => (
                                    <Chip key={template} clickable size="small" variant="outlined" label={template}
                                        color={template === "Không đồng ý" ? "error" : "default"}
                                        onClick={() => setValues((current) => ({ ...current, [selected.Id]: template }))} />
                                ))}
                            </Stack>
                        </>
                    ) : <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{selected.NoiDung || "Chưa có ý kiến"}</Typography>}
                    <Stack direction="row" spacing={0.75} justifyContent="flex-end" useFlexGap flexWrap="wrap">
                        {selected.CanReturn && <Button size="small" color="error" disabled={savingId === selected.Id} onClick={() => run("return")}>Trả lại</Button>}
                        {selected.CanSaveOpinion && <Button size="small" variant="contained" disabled={savingId === selected.Id} onClick={() => run("save")}>Gửi ý kiến</Button>}
                        {selected.CanConfirmOpinion && <Button size="small" variant="contained" color="success" disabled={savingId === selected.Id} onClick={() => run("confirm")}>Xác nhận</Button>}
                    </Stack>
                </Stack>
            )}
        </Stack>
    );
}

function BoxLabel({ opinion }) {
    return (
        <Stack minWidth={0}>
            <Typography variant="body2" fontWeight={750} noWrap>{opinion.MaBoPhan || opinion.TenBoPhan || "Bộ phận"}</Typography>
            {opinion.NoiDung && <Typography variant="caption" color="text.secondary" noWrap>{opinion.NoiDung}</Typography>}
        </Stack>
    );
}
