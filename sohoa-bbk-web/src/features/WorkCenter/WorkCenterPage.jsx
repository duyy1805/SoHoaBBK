import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Alert, Box, Button, CircularProgress, Menu, MenuItem, Stack, Typography, useMediaQuery
} from "@mui/material";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getWorkCenter } from "../../api/workCenter.api";
import WorkCenterSummaryCards from "./WorkCenterSummaryCards";
import WorkCenterFilters from "./WorkCenterFilters";
import WorkCenterRecordCard from "./WorkCenterRecordCard";
import WorkCenterPreviewDrawer from "./WorkCenterPreviewDrawer";
import {
    exportWorkCenterCsv, getReadableStatus, getWorkBucket, isRepeated, normalizeText,
    recordDateValue, searchableRecordText, sortRecords
} from "./workCenter.utils";
import { decodeToken } from "../../utils/auth";

const RECENT_DAYS = 14;
const filterDefaults = { q: "", work: "action", type: "all", quick: "", department: "all", status: "all", from: "", to: "", sort: "newest", advanced: false };

export default function WorkCenterPage() {
    const navigate = useNavigate();
    const dockedViewport = useMediaQuery("(min-width:1440px)");
    const [searchParams, setSearchParams] = useSearchParams();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [legacyAnchor, setLegacyAnchor] = useState(null);
    const [now, setNow] = useState(() => Date.now());
    const currentUser = useMemo(() => decodeToken() || {}, []);

    const filters = useMemo(() => ({
        q: searchParams.get("q") || "", work: searchParams.get("work") || "action",
        type: searchParams.get("type") || "all", quick: searchParams.get("quick") || "",
        department: searchParams.get("department") || "all", status: searchParams.get("status") || "all",
        from: searchParams.get("from") || "", to: searchParams.get("to") || "",
        sort: searchParams.get("sort") || "newest", advanced: searchParams.get("advanced") === "1"
    }), [searchParams]);
    const previewKey = searchParams.get("preview") || "";

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setError("");
            const response = await getWorkCenter();
            setItems(Array.isArray(response.data?.items) ? response.data.items : []);
        } catch (loadError) {
            setError(loadError?.response?.data?.message || "Không tải được Trung tâm xử lý");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 60000);
        return () => window.clearInterval(timer);
    }, []);
    useEffect(() => {
        if (!searchParams.has("page")) return;
        const next = new URLSearchParams(searchParams);
        next.delete("page");
        setSearchParams(next, { replace: true });
    }, [searchParams, setSearchParams]);

    const updateParam = (key, value) => {
        setSearchParams((current) => {
            const next = new URLSearchParams(current);
            const defaultValue = filterDefaults[key];
            if (value === "" || value === false || value === defaultValue) next.delete(key);
            else next.set(key, key === "advanced" ? "1" : String(value));
            next.delete("page");
            return next;
        }, { replace: key !== "preview" });
    };

    const selectSummary = (key) => {
        setSearchParams((current) => {
            const next = new URLSearchParams(current);
            next.delete("page");
            if (["action", "waiting"].includes(key)) {
                next.set("work", key);
                next.delete("quick");
            } else if (!key) {
                next.set("work", "all");
                next.delete("quick");
            } else {
                next.set("quick", key);
            }
            return next;
        }, { replace: true });
    };

    const recentItems = useMemo(() => {
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        const startAt = today.getTime() - (RECENT_DAYS - 1) * 24 * 60 * 60 * 1000;
        const endAt = today.getTime() + 24 * 60 * 60 * 1000 - 1;
        return items.filter((item) => {
            if (getWorkBucket(item, currentUser) === "action") return true;
            const createdAt = recordDateValue(item);
            return createdAt > 0 && createdAt >= startAt && createdAt <= endAt;
        });
    }, [currentUser, items, now]);

    const departments = useMemo(() => {
        const values = new Map();
        recentItems.forEach((item) => {
            if (item.CreatorBoPhanId) values.set(String(item.CreatorBoPhanId), [item.MaBoPhanTao, item.TenBoPhanTao].filter(Boolean).join(" - "));
            (item.DepartmentProgress || []).forEach((department) => department.departmentId && values.set(String(department.departmentId), [department.code, department.name].filter(Boolean).join(" - ")));
        });
        return [...values].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label, "vi"));
    }, [recentItems]);
    const statuses = useMemo(() => [...new Set(recentItems.map((item) => item.TrangThai).filter(Boolean))]
        .map((value) => ({ value, label: getReadableStatus(value) })).sort((a, b) => a.label.localeCompare(b.label, "vi")), [recentItems]);
    const filteredBeforeWork = useMemo(() => recentItems.filter((item) => {
        if (filters.q && !searchableRecordText(item).includes(normalizeText(filters.q))) return false;
        if (filters.type === "KPH_STANDALONE" && item.recordSource !== "KPH_STANDALONE") return false;
        if (filters.type === "BIEN_BAN" && (item.recordSource !== "BIEN_BAN" || item.recordType === "SXBT")) return false;
        if (!["all", "KPH_STANDALONE", "BIEN_BAN"].includes(filters.type) && item.recordType !== filters.type) return false;
        if (filters.quick === "overdue" && !item.IsOverdue) return false;
        if (filters.quick === "critical" && !item.HasCritical) return false;
        if (filters.quick === "attachments" && !item.ImageCount) return false;
        if (filters.quick === "repeated" && !isRepeated(item)) return false;
        if (filters.department !== "all" && String(item.CreatorBoPhanId) !== filters.department &&
            !(item.DepartmentProgress || []).some((department) => String(department.departmentId) === filters.department)) return false;
        if (filters.status !== "all" && item.TrangThai !== filters.status) return false;
        const date = recordDateValue(item);
        if (filters.from && (!date || date < new Date(`${filters.from}T00:00:00`).getTime())) return false;
        if (filters.to && (!date || date > new Date(`${filters.to}T23:59:59.999`).getTime())) return false;
        return true;
    }), [filters.department, filters.from, filters.q, filters.quick, filters.status, filters.to, filters.type, recentItems]);

    const workCounts = useMemo(() => filteredBeforeWork.reduce((counts, item) => {
        counts[getWorkBucket(item, currentUser)] += 1;
        counts.all += 1;
        return counts;
    }, { action: 0, waiting: 0, done: 0, all: 0 }), [currentUser, filteredBeforeWork]);

    const filtered = useMemo(() => sortRecords(filteredBeforeWork.filter((item) => {
        if (filters.work !== "all" && getWorkBucket(item, currentUser) !== filters.work) return false;
        return true;
    }), filters.sort, now), [currentUser, filteredBeforeWork, filters.sort, filters.work, now]);

    const previewRecord = recentItems.find((item) => item.recordKey === previewKey) || null;
    const docked = Boolean(previewRecord && dockedViewport);
    const activeSummary = filters.quick || (["action", "waiting"].includes(filters.work) ? filters.work : "");

    return (
        <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2} sx={{ mb: 2 }}>
                <Box>
                    <Typography variant="h5" fontWeight={900}>Trung tâm xử lý</Typography>
                    <Typography variant="body2" color="text.secondary">Hiển thị đầy đủ hồ sơ cần bộ phận bạn xử lý; các hồ sơ khác trong 14 ngày gần nhất</Typography>
                </Box>
                <Button size="small" variant="text" color="inherit" startIcon={<HistoryOutlinedIcon />} endIcon={<KeyboardArrowDownIcon />}
                    onClick={(event) => setLegacyAnchor(event.currentTarget)}>Màn hình cũ</Button>
                <Menu anchorEl={legacyAnchor} open={Boolean(legacyAnchor)} onClose={() => setLegacyAnchor(null)}>
                    <MenuItem onClick={() => navigate("/bien-ban")}>Danh sách Biên bản</MenuItem>
                    <MenuItem onClick={() => navigate("/phieu-xu-ly-khong-phu-hop")}>Phiếu xử lý KPH</MenuItem>
                </Menu>
            </Stack>

            {error && <Alert severity="error" action={<Button color="inherit" onClick={load}>Thử lại</Button>} sx={{ mb: 1.5 }}>{error}</Alert>}
            <Box sx={{ display: "grid", gridTemplateColumns: docked ? "minmax(0,1fr) 430px" : "minmax(0,1fr)", gap: 1.5, alignItems: "start", transition: "grid-template-columns .2s" }}>
                <Stack spacing={1.5} minWidth={0}>
                    <WorkCenterSummaryCards items={recentItems} activeKey={activeSummary} onSelect={selectSummary} currentUser={currentUser} />
                    <WorkCenterFilters filters={filters} onChange={updateParam} departments={departments} statuses={statuses} workCounts={workCounts}
                        onExport={() => exportWorkCenterCsv(filtered)} resultCount={filtered.length} />
                    {loading ? <Stack alignItems="center" sx={{ py: 8 }}><CircularProgress /><Typography color="text.secondary" sx={{ mt: 1 }}>Đang tải hồ sơ...</Typography></Stack> : filtered.length ? (
                        <Stack spacing={0.75}>{filtered.map((item) => (
                            <WorkCenterRecordCard key={item.recordKey} item={item} now={now} compact={docked} selected={item.recordKey === previewKey}
                                onOpen={(record) => updateParam("preview", record.recordKey)} onOpenDetail={(record) => navigate(record.detailRoute)} />
                        ))}</Stack>
                    ) : <Alert severity="info">Không có hồ sơ phù hợp trong 14 ngày gần nhất.</Alert>}
                </Stack>
                {docked && <WorkCenterPreviewDrawer record={previewRecord} now={now} docked onClose={() => updateParam("preview", "")} onListChanged={load} />}
            </Box>
            {!docked && <WorkCenterPreviewDrawer record={previewRecord} now={now} onClose={() => updateParam("preview", "")} onListChanged={load} />}
        </Box>
    );
}
