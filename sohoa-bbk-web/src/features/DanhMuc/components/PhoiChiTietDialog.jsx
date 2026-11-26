import { useEffect, useState } from "react";
import {
    Alert, Autocomplete, Box, Button, Checkbox, CircularProgress, Dialog, DialogActions,
    DialogContent, DialogTitle, Divider, FormControlLabel, IconButton, Paper, Stack, Tab,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, TextField,
    Typography
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteIcon from "@mui/icons-material/Delete";
import {
    copyPhoiDetails, createPhoiDetails, deletePhoiDetail, getPhoiDetails,
    searchPhoiMaterials, searchPhoiProducts
} from "../../../api/lookup.api";

const emptyRow = () => ({ tenLoaiPhoi: "", daoChat: "", soPhoi: "1", kyHieu: "", isIn: false, dinhMuc: "" });
const productLabel = (item) => item ? `${item.ItemCode} — ${item.TenSanPham || ""}` : "";
const materialLabel = (item) => item ? `${item.MaVatTu} — ${item.QuyCach || ""}` : "";

export default function PhoiChiTietDialog({ open, onClose, initialProduct = null, onChanged }) {
    const [tab, setTab] = useState(0);
    const [products, setProducts] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [selectedMaterial, setSelectedMaterial] = useState(null);
    const [rows, setRows] = useState([emptyRow()]);
    const [sourceProduct, setSourceProduct] = useState(null);
    const [targetProducts, setTargetProducts] = useState([]);
    const [previewProduct, setPreviewProduct] = useState(null);
    const [details, setDetails] = useState([]);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    const loadProducts = async (keyword = "") => {
        const response = await searchPhoiProducts(keyword);
        setProducts(response.data || []);
    };
    const loadMaterials = async (keyword = "") => {
        const response = await searchPhoiMaterials(keyword);
        setMaterials(response.data || []);
    };
    const loadDetails = async (product) => {
        setPreviewProduct(product || null);
        if (!product?.Id) return setDetails([]);
        try {
            setLoadingDetails(true);
            const response = await getPhoiDetails(product.Id);
            setDetails(response.data || []);
        } catch (error) {
            setMessage({ severity: "error", text: error.response?.data?.message || "Không tải được chi tiết phôi" });
        } finally {
            setLoadingDetails(false);
        }
    };

    useEffect(() => {
        if (!open) return;
        setMessage(null);
        setTab(0);
        setSelectedProducts(initialProduct ? [initialProduct] : []);
        setPreviewProduct(initialProduct || null);
        Promise.all([loadProducts(), loadMaterials()]).catch((error) => {
            setMessage({ severity: "error", text: error.response?.data?.message || "Không tải được danh mục" });
        });
    }, [open, initialProduct]);

    useEffect(() => {
        if (tab === 0 && selectedProducts.length) loadDetails(selectedProducts[0]);
        if (tab === 1 && sourceProduct) loadDetails(sourceProduct);
    }, [tab, selectedProducts, sourceProduct]);

    const updateRow = (index, field, value) => {
        setRows(current => current.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row));
    };

    const handleCreate = async () => {
        try {
            setSaving(true);
            setMessage(null);
            const response = await createPhoiDetails({
                productIds: selectedProducts.map(item => item.Id),
                materialId: selectedMaterial?.Id,
                rows
            });
            const inserted = response.data?.Inserted ?? 0;
            const skipped = response.data?.Skipped ?? 0;
            setMessage({ severity: "success", text: `Đã thêm ${inserted} dòng${skipped ? `, bỏ qua ${skipped} dòng trùng` : ""}.` });
            setRows([emptyRow()]);
            if (selectedProducts[0]) await loadDetails(selectedProducts[0]);
            onChanged?.();
        } catch (error) {
            setMessage({ severity: "error", text: error.response?.data?.message || "Không thêm được thông tin phôi" });
        } finally {
            setSaving(false);
        }
    };

    const handleCopy = async () => {
        try {
            setSaving(true);
            setMessage(null);
            const response = await copyPhoiDetails({
                sourceProductId: sourceProduct?.Id,
                targetProductIds: targetProducts.map(item => item.Id)
            });
            setMessage({ severity: "success", text: `Đã sao chép ${response.data?.Inserted ?? 0} dòng mới. Các dòng trùng được giữ nguyên.` });
            onChanged?.();
        } catch (error) {
            setMessage({ severity: "error", text: error.response?.data?.message || "Không sao chép được thông tin phôi" });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Xóa dòng thông tin phôi này?")) return;
        try {
            await deletePhoiDetail(id);
            await loadDetails(previewProduct);
            setMessage({ severity: "success", text: "Đã xóa dòng phôi." });
            onChanged?.();
        } catch (error) {
            setMessage({ severity: "error", text: error.response?.data?.message || "Không xóa được dòng phôi" });
        }
    };

    return (
        <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="xl">
            <DialogTitle>
                <Typography variant="h6" fontWeight={800}>Thông tin chi tiết phôi</Typography>
                <Typography variant="body2" color="text.secondary">Khai báo đồng thời cho nhiều itemcode hoặc sao chép cấu hình đã có.</Typography>
            </DialogTitle>
            <Tabs value={tab} onChange={(_, value) => { setTab(value); setMessage(null); }} sx={{ px: 3 }}>
                <Tab label="Thêm loại phôi" />
                <Tab label="Sao chép sang item khác" icon={<ContentCopyIcon />} iconPosition="start" />
            </Tabs>
            <DialogContent dividers>
                <Stack spacing={2.5}>
                    {message && <Alert severity={message.severity} onClose={() => setMessage(null)}>{message.text}</Alert>}
                    {tab === 0 ? <>
                        <Autocomplete multiple options={products} value={selectedProducts}
                            onChange={(_, value) => setSelectedProducts(value)}
                            onInputChange={(_, value, reason) => reason === "input" && loadProducts(value)}
                            filterOptions={options => options} getOptionLabel={productLabel}
                            isOptionEqualToValue={(option, value) => option.Id === value.Id}
                            renderInput={params => <TextField {...params} required label="Itemcode áp dụng" placeholder="Có thể chọn nhiều itemcode" />}
                        />
                        <Autocomplete options={materials} value={selectedMaterial}
                            onChange={(_, value) => setSelectedMaterial(value)}
                            onInputChange={(_, value, reason) => reason === "input" && loadMaterials(value)}
                            filterOptions={options => options} getOptionLabel={materialLabel}
                            isOptionEqualToValue={(option, value) => option.Id === value.Id}
                            renderInput={params => <TextField {...params} required label="Vật tư" placeholder="Tìm mã hoặc quy cách vật tư" />}
                        />
                        <Box>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                                <Typography fontWeight={700}>Các loại phôi của vật tư</Typography>
                                <Button startIcon={<AddIcon />} onClick={() => setRows(current => [...current, emptyRow()])}>Thêm dòng</Button>
                            </Stack>
                            <Stack spacing={1.5}>
                                {rows.map((row, index) => <Paper key={index} variant="outlined" sx={{ p: 1.5 }}>
                                    <Stack direction={{ xs: "column", md: "row" }} spacing={1.25} alignItems={{ md: "center" }}>
                                        <TextField required size="small" label="Tên loại phôi" value={row.tenLoaiPhoi} onChange={event => updateRow(index, "tenLoaiPhoi", event.target.value)} sx={{ flex: 2 }} />
                                        <TextField size="small" label="Dao chặt" value={row.daoChat} onChange={event => updateRow(index, "daoChat", event.target.value)} sx={{ flex: 1 }} />
                                        <TextField size="small" label="Số phôi" value={row.soPhoi} onChange={event => updateRow(index, "soPhoi", event.target.value)} sx={{ width: { md: 110 } }} />
                                        <TextField size="small" label="Ký hiệu" value={row.kyHieu} onChange={event => updateRow(index, "kyHieu", event.target.value)} sx={{ width: { md: 130 } }} />
                                        <TextField size="small" type="number" label="Định mức" value={row.dinhMuc} onChange={event => updateRow(index, "dinhMuc", event.target.value)} inputProps={{ min: 0, step: "any" }} sx={{ width: { md: 130 } }} />
                                        <FormControlLabel control={<Checkbox checked={row.isIn} onChange={event => updateRow(index, "isIn", event.target.checked)} />} label="Phôi in" sx={{ whiteSpace: "nowrap" }} />
                                        <IconButton color="error" disabled={rows.length === 1} onClick={() => setRows(current => current.filter((_, rowIndex) => rowIndex !== index))}><DeleteIcon /></IconButton>
                                    </Stack>
                                </Paper>)}
                            </Stack>
                        </Box>
                        <Button variant="contained" size="large" disabled={saving || !selectedProducts.length || !selectedMaterial || !rows.some(row => row.tenLoaiPhoi.trim())} onClick={handleCreate}>
                            {saving ? <CircularProgress size={22} color="inherit" /> : `Lưu cho ${selectedProducts.length || 0} itemcode`}
                        </Button>
                    </> : <>
                        <Autocomplete options={products} value={sourceProduct} onChange={(_, value) => setSourceProduct(value)}
                            onInputChange={(_, value, reason) => reason === "input" && loadProducts(value)} filterOptions={options => options}
                            getOptionLabel={productLabel} isOptionEqualToValue={(option, value) => option.Id === value.Id}
                            renderInput={params => <TextField {...params} required label="Itemcode nguồn (đã có thông tin phôi)" />}
                        />
                        <Autocomplete multiple options={products.filter(item => item.Id !== sourceProduct?.Id)} value={targetProducts}
                            onChange={(_, value) => setTargetProducts(value)}
                            onInputChange={(_, value, reason) => reason === "input" && loadProducts(value)} filterOptions={options => options}
                            getOptionLabel={productLabel} isOptionEqualToValue={(option, value) => option.Id === value.Id}
                            renderInput={params => <TextField {...params} required label="Itemcode đích" placeholder="Chọn item 2, 3, 4..." />}
                        />
                        <Alert severity="info">Dữ liệu được gộp vào item đích. Dòng đã tồn tại sẽ được bỏ qua, không xóa hay ghi đè cấu hình cũ.</Alert>
                        <Button variant="contained" size="large" startIcon={<ContentCopyIcon />} disabled={saving || !sourceProduct || !targetProducts.length || !details.length} onClick={handleCopy}>
                            {saving ? <CircularProgress size={22} color="inherit" /> : `Sao chép sang ${targetProducts.length || 0} itemcode`}
                        </Button>
                    </>}

                    <Divider />
                    <Box>
                        <Typography fontWeight={800} sx={{ mb: 1 }}>
                            Chi tiết hiện có {previewProduct ? `— ${previewProduct.ItemCode}` : ""}
                        </Typography>
                        {loadingDetails ? <Box textAlign="center" py={3}><CircularProgress /></Box> : !previewProduct ?
                            <Alert severity="info">Chọn itemcode để xem dữ liệu hiện có.</Alert> : !details.length ?
                            <Alert severity="warning">Itemcode này chưa có thông tin phôi.</Alert> :
                            <TableContainer component={Paper} variant="outlined">
                                <Table size="small">
                                    <TableHead><TableRow sx={{ bgcolor: "grey.100" }}>
                                        <TableCell>Vật tư</TableCell><TableCell>Loại phôi</TableCell><TableCell>Dao chặt</TableCell>
                                        <TableCell>Số phôi</TableCell><TableCell>Ký hiệu</TableCell><TableCell>Phôi in</TableCell>
                                        <TableCell>Định mức</TableCell><TableCell align="right">Xóa</TableCell>
                                    </TableRow></TableHead>
                                    <TableBody>{details.map(item => <TableRow key={item.Id}>
                                        <TableCell><Typography variant="body2" fontWeight={700}>{item.MaVatTu || `#${item.MaterialId}`}</Typography><Typography variant="caption" color="text.secondary">{item.QuyCach}</Typography></TableCell>
                                        <TableCell>{item.TenLoaiPhoi}</TableCell><TableCell>{item.DaoChat || "—"}</TableCell>
                                        <TableCell>{item.SoPhoi || "—"}</TableCell><TableCell>{item.KyHieu || "—"}</TableCell>
                                        <TableCell>{item.IsIn ? "Có" : "Không"}</TableCell><TableCell>{item.DinhMuc ?? "—"}</TableCell>
                                        <TableCell align="right"><IconButton size="small" color="error" onClick={() => handleDelete(item.Id)}><DeleteIcon fontSize="small" /></IconButton></TableCell>
                                    </TableRow>)}</TableBody>
                                </Table>
                            </TableContainer>}
                    </Box>
                </Stack>
            </DialogContent>
            <DialogActions><Button onClick={onClose} disabled={saving}>Đóng</Button></DialogActions>
        </Dialog>
    );
}
