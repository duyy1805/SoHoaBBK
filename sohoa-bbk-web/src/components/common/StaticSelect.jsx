import { useEffect, useMemo, useRef, useState } from "react";
import {
    Box,
    ClickAwayListener,
    FormControl,
    FormHelperText,
    InputAdornment,
    InputLabel,
    ListItemText,
    OutlinedInput,
    Paper,
    Popper,
    TextField,
    Typography,
    IconButton
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ClearIcon from "@mui/icons-material/Clear";

export default function StaticSelect({
    options = [],
    onSelect,
    valueField = "value",
    labelField = "label",
    subLabelField = null,
    placeholder = "Chọn một mục...",
    value = null,
    label = "",
    disabled = false,
    clearable = true,
    helperText = ""
}) {
    const anchorRef = useRef(null);
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState(null);

    useEffect(() => {
        if (value !== undefined && value !== null && value !== "") {
            const found = options.find((opt) => String(opt?.[valueField]) === String(value));
            setSelected(found || null);
        } else {
            setSelected(null);
        }
    }, [value, options, valueField]);

    const filteredOptions = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        if (!keyword) return options;
        return options.filter((opt) => {
            const labelValue = String(opt?.[labelField] || "").toLowerCase();
            const subLabelValue = subLabelField ? String(opt?.[subLabelField] || "").toLowerCase() : "";
            return labelValue.includes(keyword) || subLabelValue.includes(keyword);
        });
    }, [options, search, labelField, subLabelField]);

    const handleSelect = (option) => {
        setSelected(option);
        setOpen(false);
        setSearch("");
        onSelect?.(option);
    };

    const handleClear = (event) => {
        event.stopPropagation();
        setSelected(null);
        setSearch("");
        onSelect?.(null);
    };

    return (
        <ClickAwayListener onClickAway={() => setOpen(false)}>
            <Box>
                <FormControl fullWidth disabled={disabled}>
                    {label ? <InputLabel shrink>{label}</InputLabel> : null}
                    <OutlinedInput
                        inputRef={anchorRef}
                        notched
                        label={label}
                        value={selected ? selected[labelField] : ""}
                        onClick={() => !disabled && setOpen((prev) => !prev)}
                        readOnly
                        placeholder={placeholder}
                        endAdornment={
                            <InputAdornment position="end">
                                {clearable && selected ? (
                                    <IconButton size="small" onClick={handleClear} edge="end">
                                        <ClearIcon fontSize="small" />
                                    </IconButton>
                                ) : null}
                                <ExpandMoreIcon
                                    sx={{
                                        color: "text.secondary",
                                        transform: open ? "rotate(180deg)" : "rotate(0deg)",
                                        transition: "transform 0.2s ease"
                                    }}
                                />
                            </InputAdornment>
                        }
                        sx={{
                            cursor: disabled ? "default" : "pointer",
                            "& input": {
                                cursor: disabled ? "default" : "pointer",
                                fontWeight: selected ? 600 : 400,
                                color: selected ? "text.primary" : "text.secondary"
                            }
                        }}
                    />
                    {helperText ? <FormHelperText>{helperText}</FormHelperText> : null}
                </FormControl>

                <Popper
                    open={open && !disabled}
                    anchorEl={anchorRef.current}
                    placement="bottom-start"
                    sx={{ zIndex: 1400, width: anchorRef.current?.clientWidth || undefined }}
                >
                    <Paper
                        elevation={8}
                        sx={{
                            mt: 1,
                            borderRadius: 2,
                            overflow: "hidden",
                            border: "1px solid rgba(15, 23, 42, 0.08)"
                        }}
                    >
                        <Box sx={{ p: 1.5, borderBottom: "1px solid", borderColor: "divider", bgcolor: "grey.50" }}>
                            <TextField
                                fullWidth
                                size="small"
                                autoFocus
                                placeholder="Gõ để lọc..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon fontSize="small" />
                                        </InputAdornment>
                                    )
                                }}
                            />
                        </Box>

                        <Box sx={{ maxHeight: 280, overflowY: "auto" }}>
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((opt, index) => {
                                    const isSelected = String(selected?.[valueField] ?? "") === String(opt?.[valueField] ?? "");
                                    return (
                                        <Box
                                            key={`${opt?.[valueField] ?? index}`}
                                            onClick={() => handleSelect(opt)}
                                            sx={{
                                                px: 2,
                                                py: 1.5,
                                                cursor: "pointer",
                                                borderBottom: "1px solid",
                                                borderColor: "grey.100",
                                                bgcolor: isSelected ? "primary.50" : "#fff",
                                                "&:hover": { bgcolor: isSelected ? "primary.100" : "grey.50" },
                                                "&:last-child": { borderBottom: "none" }
                                            }}
                                        >
                                            <ListItemText
                                                primary={
                                                    <Typography fontSize={14} fontWeight={700} color="text.primary">
                                                        {opt?.[labelField] ?? ""}
                                                    </Typography>
                                                }
                                                secondary={
                                                    subLabelField && opt?.[subLabelField] ? (
                                                        <Typography fontSize={12} color="text.secondary" mt={0.25}>
                                                            {opt[subLabelField]}
                                                        </Typography>
                                                    ) : null
                                                }
                                            />
                                        </Box>
                                    );
                                })
                            ) : (
                                <Box sx={{ p: 3, textAlign: "center", color: "text.secondary" }}>
                                    Không tìm thấy kết quả
                                </Box>
                            )}
                        </Box>
                    </Paper>
                </Popper>
            </Box>
        </ClickAwayListener>
    );
}
