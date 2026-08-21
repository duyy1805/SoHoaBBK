import { Typography } from "@mui/material";
import { getRecordReferenceDate, getRecordTimeMeta } from "./listRecordTime.utils";

export default function ListRecordTime({ item }) {
    const meta = getRecordTimeMeta(item);
    const date = getRecordReferenceDate(item);
    return (
        <Typography
            variant="caption"
            color={meta.color}
            sx={{ display: "block", lineHeight: 1.35, fontWeight: meta.label === "Ngày lập" ? 400 : 700 }}
        >
            {date ? `${meta.label}: ${date.toLocaleString("vi-VN")}` : "Chưa có thời gian"}
        </Typography>
    );
}
