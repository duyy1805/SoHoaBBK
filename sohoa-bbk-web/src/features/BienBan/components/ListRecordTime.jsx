import { Stack, Typography } from "@mui/material";
import { getRecordCreatedDate, getRecordReferenceDate, getRecordTimeMeta } from "./listRecordTime.utils";

export default function ListRecordTime({ item }) {
    const meta = getRecordTimeMeta(item);
    const date = getRecordReferenceDate(item);
    const createdDate = getRecordCreatedDate(item);
    const showCreatedDate = Boolean(createdDate && meta.label !== "Ngày lập");
    return (
        <Stack spacing={0.1}>
            {showCreatedDate && (
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.35 }}>
                    Ngày lập: {createdDate.toLocaleString("vi-VN")}
                </Typography>
            )}
            <Typography
                variant="caption"
                color={meta.color}
                sx={{ display: "block", lineHeight: 1.35, fontWeight: meta.label === "Ngày lập" ? 400 : 700 }}
            >
                {date ? `${meta.label}: ${date.toLocaleString("vi-VN")}` : "Chưa có thời gian"}
            </Typography>
        </Stack>
    );
}
