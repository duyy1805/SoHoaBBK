import { useEffect, useMemo, useRef } from "react";
import {
    Box,
    Button,
    IconButton,
    ImageList,
    ImageListItem,
    Stack,
    Typography
} from "@mui/material";
import AddPhotoAlternateOutlinedIcon from "@mui/icons-material/AddPhotoAlternateOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { getAssetUrl } from "../../../api/phieuKiem.api";

export default function InspectionImagePicker({
    savedUrls = [],
    files = [],
    onSavedUrlsChange,
    onFilesChange,
    disabled = false,
    maxImages = 10
}) {
    const inputRef = useRef(null);
    const localPreviews = useMemo(
        () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
        [files]
    );

    useEffect(() => () => {
        localPreviews.forEach((item) => URL.revokeObjectURL(item.url));
    }, [localPreviews]);

    const remaining = Math.max(0, maxImages - savedUrls.length - files.length);

    const handleSelected = (event) => {
        const selected = Array.from(event.target.files || [])
            .filter((file) => file.type.startsWith("image/"))
            .slice(0, remaining);
        event.target.value = "";
        if (selected.length) onFilesChange?.([...files, ...selected]);
    };

    return (
        <Box>
            <input
                ref={inputRef}
                hidden
                type="file"
                accept="image/*"
                multiple
                onChange={handleSelected}
            />
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                <Typography variant="subtitle2">Hình ảnh ({savedUrls.length + files.length}/{maxImages})</Typography>
                <Button
                    variant="outlined"
                    startIcon={<AddPhotoAlternateOutlinedIcon />}
                    disabled={disabled || remaining === 0}
                    onClick={() => inputRef.current?.click()}
                >
                    Chọn ảnh
                </Button>
            </Stack>
            {(savedUrls.length > 0 || localPreviews.length > 0) && (
                <ImageList cols={4} gap={8} sx={{ mt: 1, mb: 0 }}>
                    {savedUrls.map((url, index) => (
                        <ImageListItem key={`saved-${url}-${index}`} sx={{ position: "relative" }}>
                            <Box
                                component="img"
                                src={getAssetUrl(url)}
                                alt={`Ảnh lỗi ${index + 1}`}
                                loading="lazy"
                                sx={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 1 }}
                            />
                            {!disabled && (
                                <IconButton
                                    color="error"
                                    size="small"
                                    aria-label="Xóa ảnh"
                                    onClick={() => onSavedUrlsChange?.(savedUrls.filter((_, itemIndex) => itemIndex !== index))}
                                    sx={{ position: "absolute", top: 2, right: 2, bgcolor: "background.paper" }}
                                >
                                    <DeleteOutlineIcon fontSize="small" />
                                </IconButton>
                            )}
                        </ImageListItem>
                    ))}
                    {localPreviews.map((item, index) => (
                        <ImageListItem key={`${item.file.name}-${item.file.lastModified}`} sx={{ position: "relative" }}>
                            <Box
                                component="img"
                                src={item.url}
                                alt={item.file.name}
                                sx={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 1 }}
                            />
                            {!disabled && (
                                <IconButton
                                    color="error"
                                    size="small"
                                    aria-label="Bỏ ảnh vừa chọn"
                                    onClick={() => onFilesChange?.(files.filter((_, itemIndex) => itemIndex !== index))}
                                    sx={{ position: "absolute", top: 2, right: 2, bgcolor: "background.paper" }}
                                >
                                    <DeleteOutlineIcon fontSize="small" />
                                </IconButton>
                            )}
                        </ImageListItem>
                    ))}
                </ImageList>
            )}
            {remaining === 0 && (
                <Typography variant="caption" color="text.secondary">Đã đạt số ảnh tối đa.</Typography>
            )}
        </Box>
    );
}
