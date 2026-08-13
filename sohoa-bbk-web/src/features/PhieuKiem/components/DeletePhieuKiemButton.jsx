import { useState } from "react";
import { Button } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { deletePhieuKiem } from "../../../api/phieuKiem.api";
import { hasPermission } from "../../../utils/auth";

export default function DeletePhieuKiemButton({ phieuKiemId, soPhieu, onDeleted, size = "small" }) {
    const [deleting, setDeleting] = useState(false);
    if (!hasPermission("XOA_HO_SO_KCS")) return null;

    const handleDelete = async () => {
        const confirmed = window.confirm(
            `Xóa phiếu ${soPhieu || phieuKiemId} cùng toàn bộ dữ liệu kiểm và biên bản liên quan? Hành động này không thể hoàn tác.`
        );
        if (!confirmed) return;
        try {
            setDeleting(true);
            await deletePhieuKiem(phieuKiemId);
            onDeleted?.();
        } catch (error) {
            window.alert(error?.response?.data?.message || "Không thể xóa phiếu kiểm");
        } finally {
            setDeleting(false);
        }
    };

    return (
        <Button variant="outlined" color="error" size={size} startIcon={<DeleteOutlineIcon />}
            disabled={deleting} onClick={handleDelete}>
            {deleting ? "Đang xóa…" : "Xóa phiếu"}
        </Button>
    );
}
