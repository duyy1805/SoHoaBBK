import { useEffect, useMemo, useState } from "react";
import { Alert, Box, CircularProgress, Stack, Typography } from "@mui/material";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { downloadBienBanAttachment, getBienBanAttachments } from "../../../api/bienBan.api";

const imageExtensions = new Set(["jpg", "jpeg", "png", "gif", "webp"]);
const extensionOf = (name) => String(name || "").split(".").pop()?.toLowerCase() || "";

const printableTypeOf = (attachment) => {
    const extension = extensionOf(attachment?.originalName);
    const mimeType = String(attachment?.mimeType || "").toLowerCase();
    if (mimeType === "application/pdf" || extension === "pdf") return "pdf";
    if (mimeType.startsWith("image/") || imageExtensions.has(extension)) return "image";
    return null;
};

const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("Không đọc được ảnh"));
    reader.readAsDataURL(blob);
});

const renderPdf = async (blob) => {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const document = await pdfjsLib.getDocument({ data: bytes }).promise;
    const pages = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
        const page = await document.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1.6 });
        const canvas = window.document.createElement("canvas");
        const context = canvas.getContext("2d", { alpha: false });
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        await page.render({ canvasContext: context, viewport }).promise;
        pages.push(canvas.toDataURL("image/jpeg", 0.94));
        canvas.width = 1;
        canvas.height = 1;
    }
    await document.destroy();
    return pages;
};

export default function PrintableBienBanAttachments({ bienBanId, onStatusChange }) {
    const [loading, setLoading] = useState(true);
    const [documents, setDocuments] = useState([]);
    const [unsupported, setUnsupported] = useState([]);
    const [failed, setFailed] = useState([]);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            setDocuments([]);
            setUnsupported([]);
            setFailed([]);
            try {
                const listResponse = await getBienBanAttachments(bienBanId);
                const attachments = Array.isArray(listResponse.data) ? listResponse.data : [];
                const skipped = attachments.filter((item) => !printableTypeOf(item));
                const printable = attachments.filter((item) => printableTypeOf(item));
                const loaded = [];
                const errors = [];
                for (const attachment of printable) {
                    try {
                        const response = await downloadBienBanAttachment(bienBanId, attachment.id, { inline: true });
                        const type = printableTypeOf(attachment);
                        const pages = type === "pdf"
                            ? await renderPdf(response.data)
                            : [await blobToDataUrl(response.data)];
                        loaded.push({ attachment, pages });
                    } catch {
                        errors.push(attachment.originalName || `File #${attachment.id}`);
                    }
                    if (cancelled) return;
                }
                if (!cancelled) {
                    setDocuments(loaded);
                    setUnsupported(skipped.map((item) => item.originalName || `File #${item.id}`));
                    setFailed(errors);
                }
            } catch {
                if (!cancelled) setFailed(["Không tải được danh sách tệp đính kèm"]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        if (bienBanId) load();
        return () => { cancelled = true; };
    }, [bienBanId]);

    const status = useMemo(() => ({ loading, unsupported, failed, printableCount: documents.length }),
        [documents.length, failed, loading, unsupported]);
    useEffect(() => { onStatusChange?.(status); }, [onStatusChange, status]);

    return (
        <Box>
            <Box className="bien-ban-attachment-notices" sx={{ mt: 2, "@media print": { display: "none" } }}>
                {loading && (
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ p: 1 }}>
                        <CircularProgress size={18} />
                        <Typography variant="body2">Đang chuẩn bị tệp đính kèm để in...</Typography>
                    </Stack>
                )}
                {unsupported.length > 0 && (
                    <Alert severity="warning" sx={{ mb: 1 }}>
                        Không hỗ trợ ghép khi in: {unsupported.join(", ")}. Các tệp này sẽ được bỏ qua.
                    </Alert>
                )}
                {failed.length > 0 && (
                    <Alert severity="warning" sx={{ mb: 1 }}>
                        Không thể chuẩn bị để in: {failed.join(", ")}. Các nội dung in được vẫn sẽ được in.
                    </Alert>
                )}
            </Box>
            {!loading && documents.map(({ attachment, pages }) => pages.map((pageUrl, index) => (
                <Box key={`${attachment.id}-${index}`} className="bien-ban-attachment-page" sx={{
                    bgcolor: "white", boxSizing: "border-box", width: "210mm", minHeight: "297mm",
                    mx: "auto", p: "10mm", display: "flex", flexDirection: "column",
                    breakBefore: "page", pageBreakBefore: "always",
                    "@media print": { m: 0, boxShadow: "none" }
                }}>
                    <Typography component="div" sx={{ fontSize: "10pt", fontWeight: 700, mb: 1 }}>
                        Tệp đính kèm: {attachment.originalName}
                        {pages.length > 1 ? ` — Trang ${index + 1}/${pages.length}` : ""}
                    </Typography>
                    <Box component="img" src={pageUrl} alt={attachment.originalName || "Tệp đính kèm"}
                        sx={{ display: "block", width: "100%", flex: 1, minHeight: 0, objectFit: "contain" }} />
                </Box>
            )))}
        </Box>
    );
}
