import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Alert, Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogActions,
    DialogContent, DialogTitle, FormControl, IconButton, InputLabel, MenuItem,
    Paper, Select, Stack, Tab, Table, TableBody, TableCell, TableContainer,
    TableHead, TablePagination, TableRow, Tabs, TextField, Tooltip, Typography
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import EditIcon from "@mui/icons-material/Edit";
import KeyIcon from "@mui/icons-material/Key";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import SecurityIcon from "@mui/icons-material/Security";
import {
    changeManagedRoleStatus, changeManagedUserStatus, createManagedRole,
    createManagedUser, getManagedRoles, getManagedUser, getManagedUsers,
    getUserAdminMetadata, resetManagedUserPassword, updateManagedRole,
    updateManagedRolePermissions, updateManagedUser, uploadManagedUserSignature,
    deleteManagedUserSignature
} from "../../api/admin.api";
import { getCurrentUser } from "../../utils/auth";

const emptyUserForm = {
    username: "", fullName: "", email: "", boPhanId: "", roleIds: [],
    managedBoPhanIds: [],
    password: "", confirmPassword: "", rowVersion: ""
};
const emptyRoleForm = {
    roleCode: "", roleName: "", permissionIds: [], rowVersion: ""
};
const formatDate = (value) => value ? new Date(value).toLocaleString("vi-VN") : "---";
const errorMessage = (error, fallback) => error.response?.data?.message || fallback;

function MultiSelectValue({ values, source, idField = "Id", labelField }) {
    if (!values?.length) return <Typography component="span" color="text.secondary">Chưa chọn</Typography>;
    return (
        <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
            {values.map((value) => {
                const item = source.find((option) => Number(option[idField]) === Number(value));
                return <Chip size="small" key={value} label={item?.[labelField] || value} />;
            })}
        </Stack>
    );
}

export default function UserAdminPage() {
    const currentUser = getCurrentUser() || {};
    const currentUserId = Number(currentUser.id || currentUser.userId || 0);
    const [tab, setTab] = useState(0);
    const [metadata, setMetadata] = useState({ departments: [], roles: [], permissions: [] });
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, pageSize: 25, total: 0 });
    const [filters, setFilters] = useState({ keyword: "", boPhanId: "", roleId: "", status: "" });
    const [debouncedKeyword, setDebouncedKeyword] = useState("");
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [userDialog, setUserDialog] = useState({ open: false, editing: false });
    const [userForm, setUserForm] = useState(emptyUserForm);
    const [userPermissions, setUserPermissions] = useState([]);
    const [signatureFile, setSignatureFile] = useState(null);
    const [signaturePreview, setSignaturePreview] = useState(null);
    const [resetTarget, setResetTarget] = useState(null);
    const [resetForm, setResetForm] = useState({ password: "", confirmPassword: "" });
    const [roleDialog, setRoleDialog] = useState({ open: false, editing: false });
    const [roleForm, setRoleForm] = useState(emptyRoleForm);
    const [permissionTarget, setPermissionTarget] = useState(null);
    const [permissionIds, setPermissionIds] = useState([]);

    useEffect(() => {
        const timer = window.setTimeout(() => setDebouncedKeyword(filters.keyword.trim()), 350);
        return () => window.clearTimeout(timer);
    }, [filters.keyword]);

    const loadUsers = useCallback(async ({ background = false, page = pagination.page, pageSize = pagination.pageSize } = {}) => {
        if (background) setRefreshing(true);
        else setLoading(true);
        try {
            const res = await getManagedUsers({
                page,
                pageSize,
                keyword: debouncedKeyword || undefined,
                boPhanId: filters.boPhanId || undefined,
                roleId: filters.roleId || undefined,
                status: filters.status || undefined
            });
            setUsers(res.data?.items || []);
            setPagination((prev) => ({ ...prev, ...(res.data?.pagination || {}), page, pageSize }));
            setError("");
        } catch (err) {
            setError(errorMessage(err, "Không tải được danh sách người dùng"));
        } finally {
            if (background) setRefreshing(false);
            else setLoading(false);
        }
    }, [debouncedKeyword, filters.boPhanId, filters.roleId, filters.status, pagination.page, pagination.pageSize]);

    const loadRoles = useCallback(async () => {
        try {
            const res = await getManagedRoles();
            setRoles(res.data || []);
        } catch (err) {
            setError(errorMessage(err, "Không tải được danh sách role"));
        }
    }, []);

    useEffect(() => {
        Promise.all([getUserAdminMetadata(), getManagedRoles()])
            .then(([metadataRes, rolesRes]) => {
                setMetadata(metadataRes.data || { departments: [], roles: [], permissions: [] });
                setRoles(rolesRes.data || []);
            })
            .catch((err) => setError(errorMessage(err, "Không tải được dữ liệu quản trị")));
    }, []);

    useEffect(() => {
        loadUsers({ page: 1, pageSize: pagination.pageSize });
        // pagination.page không tham gia vì bộ lọc luôn quay về trang đầu.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedKeyword, filters.boPhanId, filters.roleId, filters.status]);

    const patchUser = (updated) => {
        if (!updated?.Id) return;
        setUsers((prev) => prev.map((item) => Number(item.Id) === Number(updated.Id) ? { ...item, ...updated } : item));
    };
    const patchRole = (updated) => {
        if (!updated?.Id) return;
        setRoles((prev) => prev.map((item) => Number(item.Id) === Number(updated.Id) ? { ...item, ...updated } : item));
        setMetadata((prev) => ({
            ...prev,
            roles: prev.roles.map((item) => Number(item.Id) === Number(updated.Id) ? { ...item, ...updated } : item)
        }));
    };

    const openCreateUser = () => {
        setUserPermissions([]);
        setSignatureFile(null);
        setSignaturePreview(null);
        setUserForm(emptyUserForm);
        setUserDialog({ open: true, editing: false });
    };

    const openEditUser = async (user) => {
        setSaving(true);
        try {
            const res = await getManagedUser(user.Id);
            const detail = res.data || {};
            setUserPermissions(detail.permissions || []);
            setSignatureFile(null);
            setSignaturePreview(detail.SignatureDataUrl || null);
            setUserForm({
                username: detail.Username || "",
                fullName: detail.FullName || "",
                email: detail.Email || "",
                boPhanId: detail.BoPhanId || "",
                roleIds: (detail.roles || []).map((role) => role.Id),
                managedBoPhanIds: detail.managedBoPhanIds || [],
                password: "",
                confirmPassword: "",
                rowVersion: detail.RowVersion || ""
            });
            setUserDialog({ open: true, editing: true, id: detail.Id });
        } catch (err) {
            setError(errorMessage(err, "Không tải được chi tiết tài khoản"));
        } finally {
            setSaving(false);
        }
    };

    const selectSignatureFile = (event) => {
        const file = event.target.files?.[0] || null;
        setSignatureFile(file);
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => setSignaturePreview(String(reader.result || "") || null);
        reader.readAsDataURL(file);
        event.target.value = "";
    };

    const saveSignature = async () => {
        if (!signatureFile || !userDialog.editing) return;
        setSaving(true);
        try {
            const res = await uploadManagedUserSignature(userDialog.id, signatureFile);
            const updated = res.data?.user;
            setSignatureFile(null);
            setSignaturePreview(updated?.SignatureDataUrl || null);
            if (updated?.RowVersion) {
                setUserForm((prev) => ({ ...prev, rowVersion: updated.RowVersion }));
            }
            patchUser(updated);
            setNotice(res.data?.message || "Đã cập nhật ảnh chữ ký");
        } catch (err) {
            setError(errorMessage(err, "Không cập nhật được ảnh chữ ký"));
        } finally {
            setSaving(false);
        }
    };

    const removeSignature = async () => {
        if (!userDialog.editing || !signaturePreview || !window.confirm("Xóa ảnh chữ ký của tài khoản này?")) return;
        setSaving(true);
        try {
            const res = await deleteManagedUserSignature(userDialog.id);
            setSignatureFile(null);
            setSignaturePreview(null);
            if (res.data?.user?.RowVersion) {
                setUserForm((prev) => ({ ...prev, rowVersion: res.data.user.RowVersion }));
            }
            patchUser(res.data?.user);
            setNotice(res.data?.message || "Đã xóa ảnh chữ ký");
        } catch (err) {
            setError(errorMessage(err, "Không xóa được ảnh chữ ký"));
        } finally {
            setSaving(false);
        }
    };

    const saveUser = async () => {
        if (!userForm.fullName.trim() || !userForm.boPhanId || !userForm.roleIds.length) {
            setError("Vui lòng nhập họ tên, chọn bộ phận và ít nhất một role");
            return;
        }
        if (!userDialog.editing && (!userForm.username.trim() || userForm.password.length < 8)) {
            setError("Vui lòng nhập tên đăng nhập và mật khẩu tối thiểu 8 ký tự");
            return;
        }
        if (!userDialog.editing && userForm.password !== userForm.confirmPassword) {
            setError("Mật khẩu xác nhận không khớp");
            return;
        }
        setSaving(true);
        try {
            const payload = {
                username: userForm.username.trim(),
                fullName: userForm.fullName.trim(),
                email: userForm.email.trim() || null,
                boPhanId: Number(userForm.boPhanId),
                roleIds: userForm.roleIds.map(Number),
                managedBoPhanIds: userForm.managedBoPhanIds.map(Number),
                rowVersion: userForm.rowVersion
            };
            const res = userDialog.editing
                ? await updateManagedUser(userDialog.id, payload)
                : await createManagedUser({ ...payload, password: userForm.password });
            setNotice(res.data?.message || "Đã lưu tài khoản");
            setUserDialog({ open: false, editing: false });
            if (userDialog.editing) patchUser(res.data?.user);
            else await loadUsers({ background: true, page: 1 });
            await loadRoles();
        } catch (err) {
            setError(errorMessage(err, "Không lưu được tài khoản"));
        } finally {
            setSaving(false);
        }
    };

    const toggleUserStatus = async (user) => {
        const next = !(user.TrangThai !== false && user.TrangThai !== 0);
        if (!window.confirm(`${next ? "Mở" : "Khóa"} tài khoản ${user.Username}?`)) return;
        try {
            const res = await changeManagedUserStatus(user.Id, next, user.RowVersion);
            patchUser(res.data?.user);
            setNotice(res.data?.message || "Đã cập nhật trạng thái tài khoản");
        } catch (err) {
            setError(errorMessage(err, "Không đổi được trạng thái tài khoản"));
        }
    };

    const openResetPassword = (user) => {
        setResetTarget(user);
        setResetForm({ password: "", confirmPassword: "" });
    };

    const saveResetPassword = async () => {
        if (resetForm.password.length < 8) {
            setError("Mật khẩu phải có ít nhất 8 ký tự");
            return;
        }
        if (resetForm.password !== resetForm.confirmPassword) {
            setError("Mật khẩu xác nhận không khớp");
            return;
        }
        setSaving(true);
        try {
            const res = await resetManagedUserPassword(resetTarget.Id, resetForm.password, resetTarget.RowVersion);
            patchUser(res.data?.user);
            setResetTarget(null);
            setNotice(res.data?.message || "Đã đặt lại mật khẩu");
        } catch (err) {
            setError(errorMessage(err, "Không đặt lại được mật khẩu"));
        } finally {
            setSaving(false);
        }
    };

    const openCreateRole = () => {
        setRoleForm(emptyRoleForm);
        setRoleDialog({ open: true, editing: false });
    };

    const openEditRole = (role) => {
        setRoleForm({
            roleCode: role.RoleCode,
            roleName: role.RoleName,
            permissionIds: [],
            rowVersion: role.RowVersion
        });
        setRoleDialog({ open: true, editing: true, id: role.Id });
    };

    const saveRole = async () => {
        if (!roleForm.roleName.trim() || (!roleDialog.editing && !roleForm.roleCode.trim())) {
            setError("Vui lòng nhập mã và tên role");
            return;
        }
        setSaving(true);
        try {
            const res = roleDialog.editing
                ? await updateManagedRole(roleDialog.id, roleForm.roleName.trim(), roleForm.rowVersion)
                : await createManagedRole({
                    roleCode: roleForm.roleCode.trim().toUpperCase(),
                    roleName: roleForm.roleName.trim(),
                    permissionIds: roleForm.permissionIds
                });
            const updated = res.data?.role;
            if (roleDialog.editing) patchRole(updated);
            else {
                setRoles((prev) => [...prev, updated].filter(Boolean));
                setMetadata((prev) => ({ ...prev, roles: [...prev.roles, updated].filter(Boolean) }));
            }
            setRoleDialog({ open: false, editing: false });
            setNotice(res.data?.message || "Đã lưu role");
        } catch (err) {
            setError(errorMessage(err, "Không lưu được role"));
        } finally {
            setSaving(false);
        }
    };

    const openPermissions = (role) => {
        setPermissionTarget(role);
        setPermissionIds((role.permissions || []).map((permission) => permission.Id));
    };

    const savePermissions = async () => {
        setSaving(true);
        try {
            const res = await updateManagedRolePermissions(permissionTarget.Id, permissionIds, permissionTarget.RowVersion);
            patchRole(res.data?.role);
            setPermissionTarget(null);
            setNotice(res.data?.message || "Đã cập nhật permission");
        } catch (err) {
            setError(errorMessage(err, "Không cập nhật được permission"));
        } finally {
            setSaving(false);
        }
    };

    const toggleRoleStatus = async (role) => {
        const next = !(role.TrangThai !== false && role.TrangThai !== 0);
        if (!window.confirm(`${next ? "Kích hoạt" : "Vô hiệu hóa"} role ${role.RoleCode}?`)) return;
        try {
            const res = await changeManagedRoleStatus(role.Id, next, role.RowVersion);
            patchRole(res.data?.role);
            setNotice(res.data?.message || "Đã cập nhật trạng thái role");
        } catch (err) {
            setError(errorMessage(err, "Không đổi được trạng thái role"));
        }
    };

    const activeRoles = useMemo(() => metadata.roles.filter((role) => role.TrangThai !== false && role.TrangThai !== 0), [metadata.roles]);
    const activeDepartments = useMemo(() => metadata.departments.filter((department) => department.TrangThai !== false && department.TrangThai !== 0), [metadata.departments]);
    const hasTpBpRole = useMemo(() => userForm.roleIds.some((roleId) => {
        const role = metadata.roles.find((item) => Number(item.Id) === Number(roleId));
        return String(role?.RoleCode || "").toUpperCase() === "TP_BP";
    }), [metadata.roles, userForm.roleIds]);
    const managementPermissionId = metadata.permissions.find((permission) => permission.PermissionCode === "QUAN_TRI_NGUOI_DUNG")?.Id;
    const newRoleGrantsManagement = Boolean(managementPermissionId && roleForm.permissionIds.includes(managementPermissionId));
    const permissionEditGrantsManagement = Boolean(managementPermissionId && permissionIds.includes(managementPermissionId));

    return (
        <Box sx={{ width: "100%", minWidth: 0 }}>
            <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
                <Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <ManageAccountsIcon color="primary" />
                        <Typography variant="h5" fontWeight={800}>Quản lý người dùng</Typography>
                    </Stack>
                    <Typography color="text.secondary">Quản lý tài khoản, bộ phận, role và permission của hệ thống.</Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={tab === 0 ? openCreateUser : openCreateRole}
                >
                    {tab === 0 ? "Tạo tài khoản" : "Tạo role"}
                </Button>
            </Stack>

            {error && <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>{error}</Alert>}
            {notice && <Alert severity="success" onClose={() => setNotice("")} sx={{ mb: 2 }}>{notice}</Alert>}
            {refreshing && <Alert severity="info" sx={{ mb: 1, py: 0 }}>Đang đồng bộ dữ liệu nền…</Alert>}

            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
                <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ px: 2, borderBottom: 1, borderColor: "divider" }}>
                    <Tab icon={<ManageAccountsIcon />} iconPosition="start" label="Tài khoản" />
                    <Tab icon={<SecurityIcon />} iconPosition="start" label="Role & permission" />
                </Tabs>

                {tab === 0 && (
                    <>
                        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} sx={{ p: 2 }}>
                            <TextField
                                size="small"
                                fullWidth
                                label="Tìm tài khoản"
                                placeholder="Username, họ tên hoặc email"
                                value={filters.keyword}
                                onChange={(event) => setFilters((prev) => ({ ...prev, keyword: event.target.value }))}
                            />
                            <TextField select size="small" label="Bộ phận" value={filters.boPhanId} onChange={(event) => setFilters((prev) => ({ ...prev, boPhanId: event.target.value }))} sx={{ minWidth: 210 }}>
                                <MenuItem value="">Tất cả</MenuItem>
                                {metadata.departments.map((department) => <MenuItem key={department.Id} value={department.Id}>{department.MaBoPhan} - {department.TenBoPhan}</MenuItem>)}
                            </TextField>
                            <TextField select size="small" label="Role" value={filters.roleId} onChange={(event) => setFilters((prev) => ({ ...prev, roleId: event.target.value }))} sx={{ minWidth: 190 }}>
                                <MenuItem value="">Tất cả</MenuItem>
                                {metadata.roles.map((role) => <MenuItem key={role.Id} value={role.Id}>{role.RoleCode}</MenuItem>)}
                            </TextField>
                            <TextField select size="small" label="Trạng thái" value={filters.status} onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))} sx={{ minWidth: 150 }}>
                                <MenuItem value="">Tất cả</MenuItem>
                                <MenuItem value="active">Hoạt động</MenuItem>
                                <MenuItem value="inactive">Đã khóa</MenuItem>
                            </TextField>
                        </Stack>

                        {loading ? <Box sx={{ display: "grid", placeItems: "center", py: 8 }}><CircularProgress /></Box> : (
                            <TableContainer>
                                <Table size="small" sx={{ minWidth: 920 }}>
                                    <TableHead><TableRow>
                                        <TableCell>Tài khoản</TableCell><TableCell>Bộ phận</TableCell>
                                        <TableCell>Role</TableCell><TableCell>Trạng thái</TableCell>
                                        <TableCell>Cập nhật</TableCell><TableCell align="right">Thao tác</TableCell>
                                    </TableRow></TableHead>
                                    <TableBody>
                                        {users.map((user) => {
                                            const active = user.TrangThai !== false && user.TrangThai !== 0;
                                            return (
                                                <TableRow key={user.Id} hover>
                                                    <TableCell>
                                                        <Typography fontWeight={700}>{user.FullName || "---"}</Typography>
                                                        <Typography variant="caption" color="text.secondary">{user.Username}{user.Email ? ` · ${user.Email}` : ""}</Typography>
                                                        {user.HasSignature && <Chip size="small" color="info" variant="outlined" label="Có chữ ký" sx={{ ml: 1 }} />}
                                                    </TableCell>
                                                    <TableCell>{user.MaBoPhan && user.TenBoPhan ? `${user.MaBoPhan} - ${user.TenBoPhan}` : user.BoPhan || "Chưa gán"}</TableCell>
                                                    <TableCell><Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">{(user.roles || []).map((role) => <Chip key={role.Id} size="small" label={role.RoleCode} color={role.RoleCode === "ADMIN" ? "error" : "default"} />)}</Stack></TableCell>
                                                    <TableCell><Chip size="small" color={active ? "success" : "default"} label={active ? "Hoạt động" : "Đã khóa"} /></TableCell>
                                                    <TableCell>{formatDate(user.UpdatedAt || user.CreatedAt)}</TableCell>
                                                    <TableCell align="right">
                                                        <Tooltip title="Sửa và xem quyền"><IconButton onClick={() => openEditUser(user)}><EditIcon /></IconButton></Tooltip>
                                                        <Tooltip title="Đặt lại mật khẩu"><IconButton onClick={() => openResetPassword(user)}><KeyIcon /></IconButton></Tooltip>
                                                        <Tooltip title={active ? "Khóa tài khoản" : "Mở tài khoản"}>
                                                            <span><IconButton color={active ? "warning" : "success"} disabled={active && Number(user.Id) === currentUserId} onClick={() => toggleUserStatus(user)}>{active ? <LockIcon /> : <LockOpenIcon />}</IconButton></span>
                                                        </Tooltip>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                        {!users.length && <TableRow><TableCell colSpan={6} align="center" sx={{ py: 5, color: "text.secondary" }}>Không có tài khoản phù hợp.</TableCell></TableRow>}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                        <TablePagination
                            component="div"
                            count={pagination.total}
                            page={Math.max(0, pagination.page - 1)}
                            rowsPerPage={pagination.pageSize}
                            rowsPerPageOptions={[10, 25, 50, 100]}
                            labelRowsPerPage="Số dòng"
                            onPageChange={(_, nextPage) => loadUsers({ page: nextPage + 1, pageSize: pagination.pageSize })}
                            onRowsPerPageChange={(event) => loadUsers({ page: 1, pageSize: Number(event.target.value) })}
                        />
                    </>
                )}

                {tab === 1 && (
                    <TableContainer>
                        <Table size="small" sx={{ minWidth: 850 }}>
                            <TableHead><TableRow>
                                <TableCell>Role</TableCell><TableCell>Permission</TableCell>
                                <TableCell>Người dùng</TableCell><TableCell>Loại</TableCell>
                                <TableCell>Trạng thái</TableCell><TableCell align="right">Thao tác</TableCell>
                            </TableRow></TableHead>
                            <TableBody>
                                {roles.map((role) => {
                                    const active = role.TrangThai !== false && role.TrangThai !== 0;
                                    return (
                                        <TableRow key={role.Id} hover>
                                            <TableCell><Typography fontWeight={800}>{role.RoleCode}</Typography><Typography variant="caption" color="text.secondary">{role.RoleName}</Typography></TableCell>
                                            <TableCell><Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">{(role.permissions || []).slice(0, 4).map((permission) => <Chip key={permission.Id} size="small" label={permission.PermissionCode} />)}{role.permissions?.length > 4 && <Chip size="small" label={`+${role.permissions.length - 4}`} />}</Stack></TableCell>
                                            <TableCell>{role.UserCount || 0}</TableCell>
                                            <TableCell><Chip size="small" variant="outlined" label={role.IsSystem ? "Hệ thống" : "Tùy chỉnh"} /></TableCell>
                                            <TableCell><Chip size="small" color={active ? "success" : "default"} label={active ? "Hoạt động" : "Đã tắt"} /></TableCell>
                                            <TableCell align="right">
                                                <Tooltip title="Sửa tên role"><IconButton onClick={() => openEditRole(role)}><EditIcon /></IconButton></Tooltip>
                                                <Tooltip title="Gán permission"><IconButton color="primary" onClick={() => openPermissions(role)}><AdminPanelSettingsIcon /></IconButton></Tooltip>
                                                {!role.IsSystem && <Tooltip title={active ? "Vô hiệu hóa" : "Kích hoạt"}><span><IconButton disabled={active && Number(role.ActiveUserCount) > 0} color={active ? "warning" : "success"} onClick={() => toggleRoleStatus(role)}>{active ? <LockIcon /> : <LockOpenIcon />}</IconButton></span></Tooltip>}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {!roles.length && <TableRow><TableCell colSpan={6} align="center" sx={{ py: 5, color: "text.secondary" }}>Chưa có role.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>

            <Dialog open={userDialog.open} onClose={() => !saving && setUserDialog({ open: false, editing: false })} maxWidth="md" fullWidth>
                <DialogTitle>{userDialog.editing ? "Cập nhật tài khoản" : "Tạo tài khoản"}</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                            <TextField fullWidth required label="Tên đăng nhập" value={userForm.username} disabled={userDialog.editing} onChange={(event) => setUserForm((prev) => ({ ...prev, username: event.target.value }))} />
                            <TextField fullWidth required label="Họ và tên" value={userForm.fullName} onChange={(event) => setUserForm((prev) => ({ ...prev, fullName: event.target.value }))} />
                        </Stack>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                            <TextField fullWidth label="Email" type="email" value={userForm.email} onChange={(event) => setUserForm((prev) => ({ ...prev, email: event.target.value }))} />
                            <TextField select fullWidth required label="Bộ phận" value={userForm.boPhanId} onChange={(event) => setUserForm((prev) => ({ ...prev, boPhanId: event.target.value }))}>
                                {activeDepartments.map((department) => <MenuItem key={department.Id} value={department.Id}>{department.MaBoPhan} - {department.TenBoPhan}</MenuItem>)}
                            </TextField>
                        </Stack>
                        <FormControl fullWidth required>
                            <InputLabel>Role</InputLabel>
                            <Select
                                multiple label="Role" value={userForm.roleIds}
                                onChange={(event) => setUserForm((prev) => ({ ...prev, roleIds: event.target.value.map(Number) }))}
                                renderValue={(selected) => <MultiSelectValue values={selected} source={activeRoles} labelField="RoleCode" />}
                            >
                                {activeRoles.map((role) => <MenuItem key={role.Id} value={role.Id}><Checkbox checked={userForm.roleIds.includes(Number(role.Id))} />{role.RoleCode} - {role.RoleName}</MenuItem>)}
                            </Select>
                        </FormControl>
                        {hasTpBpRole && (
                            <FormControl fullWidth>
                                <InputLabel>Đơn vị được quản lý</InputLabel>
                                <Select
                                    multiple
                                    label="Đơn vị được quản lý"
                                    value={userForm.managedBoPhanIds}
                                    onChange={(event) => setUserForm((prev) => ({
                                        ...prev,
                                        managedBoPhanIds: event.target.value.map(Number)
                                    }))}
                                    renderValue={(selected) => (
                                        <MultiSelectValue values={selected} source={activeDepartments} labelField="MaBoPhan" />
                                    )}
                                >
                                    {activeDepartments.map((department) => (
                                        <MenuItem key={department.Id} value={department.Id}>
                                            <Checkbox checked={userForm.managedBoPhanIds.includes(Number(department.Id))} />
                                            {department.MaBoPhan} - {department.TenBoPhan}
                                        </MenuItem>
                                    ))}
                                </Select>
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75 }}>
                                    TP_BP được nhập, xác nhận và trả lại ý kiến thay cho các đơn vị này. Đơn vị chính vẫn được giữ riêng ở trên.
                                </Typography>
                            </FormControl>
                        )}
                        {!userDialog.editing && <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                            <TextField fullWidth required type="password" label="Mật khẩu" value={userForm.password} onChange={(event) => setUserForm((prev) => ({ ...prev, password: event.target.value }))} />
                            <TextField fullWidth required type="password" label="Xác nhận mật khẩu" value={userForm.confirmPassword} onChange={(event) => setUserForm((prev) => ({ ...prev, confirmPassword: event.target.value }))} />
                        </Stack>}
                        {userDialog.editing && <Paper variant="outlined" sx={{ p: 1.5 }}>
                            <Typography fontWeight={700} sx={{ mb: 1 }}>Permission hiệu lực hiện tại</Typography>
                            <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">{userPermissions.length ? userPermissions.map((permission) => <Chip key={permission.Id} size="small" label={permission.PermissionCode} />) : <Typography variant="body2" color="text.secondary">Không có permission</Typography>}</Stack>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>Permission mới có hiệu lực sau khi tài khoản đăng nhập lại.</Typography>
                        </Paper>}
                        {userDialog.editing && <Paper variant="outlined" sx={{ p: 1.5 }}>
                            <Typography fontWeight={700}>Ảnh chữ ký</Typography>
                            <Typography variant="caption" color="text.secondary">PNG, JPEG hoặc WebP; tối đa 2 MB. Ảnh sẽ được chuẩn hóa thành PNG tối đa 800×300.</Typography>
                            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }} sx={{ mt: 1.5 }}>
                                <Box sx={{ width: 260, height: 100, border: "1px dashed", borderColor: "divider", borderRadius: 1, display: "grid", placeItems: "center", bgcolor: "grey.50" }}>
                                    {signaturePreview
                                        ? <Box component="img" src={signaturePreview} alt="Chữ ký" sx={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                                        : <Typography variant="body2" color="text.secondary">Chưa có chữ ký</Typography>}
                                </Box>
                                <Stack spacing={1} alignItems="flex-start">
                                    <Button component="label" variant="outlined" disabled={saving}>
                                        Chọn ảnh
                                        <input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={selectSignatureFile} />
                                    </Button>
                                    <Stack direction="row" spacing={1}>
                                        <Button variant="contained" disabled={saving || !signatureFile} onClick={saveSignature}>Tải lên</Button>
                                        <Button color="error" disabled={saving || !signaturePreview} onClick={removeSignature}>Xóa</Button>
                                    </Stack>
                                </Stack>
                            </Stack>
                        </Paper>}
                    </Stack>
                </DialogContent>
                <DialogActions><Button disabled={saving} onClick={() => setUserDialog({ open: false, editing: false })}>Hủy</Button><Button disabled={saving} variant="contained" onClick={saveUser}>{saving ? "Đang lưu…" : "Lưu"}</Button></DialogActions>
            </Dialog>

            <Dialog open={Boolean(resetTarget)} onClose={() => !saving && setResetTarget(null)} maxWidth="sm" fullWidth>
                <DialogTitle>Đặt lại mật khẩu · {resetTarget?.Username}</DialogTitle>
                <DialogContent dividers><Stack spacing={2} sx={{ mt: 1 }}>
                    <Alert severity="warning">Mật khẩu đang sử dụng cơ chế MD5 hiện tại và không bắt buộc đổi ở lần đăng nhập đầu.</Alert>
                    <TextField type="password" label="Mật khẩu mới" value={resetForm.password} onChange={(event) => setResetForm((prev) => ({ ...prev, password: event.target.value }))} />
                    <TextField type="password" label="Xác nhận mật khẩu" value={resetForm.confirmPassword} onChange={(event) => setResetForm((prev) => ({ ...prev, confirmPassword: event.target.value }))} />
                </Stack></DialogContent>
                <DialogActions><Button disabled={saving} onClick={() => setResetTarget(null)}>Hủy</Button><Button disabled={saving} variant="contained" onClick={saveResetPassword}>Đặt lại</Button></DialogActions>
            </Dialog>

            <Dialog open={roleDialog.open} onClose={() => !saving && setRoleDialog({ open: false, editing: false })} maxWidth="sm" fullWidth>
                <DialogTitle>{roleDialog.editing ? "Sửa role" : "Tạo role tùy chỉnh"}</DialogTitle>
                <DialogContent dividers><Stack spacing={2} sx={{ mt: 1 }}>
                    <TextField required label="Mã role" placeholder="VD: GIAM_SAT_CHAT_LUONG" disabled={roleDialog.editing} value={roleForm.roleCode} onChange={(event) => setRoleForm((prev) => ({ ...prev, roleCode: event.target.value.toUpperCase() }))} />
                    <TextField required label="Tên role" value={roleForm.roleName} onChange={(event) => setRoleForm((prev) => ({ ...prev, roleName: event.target.value }))} />
                    {!roleDialog.editing && <FormControl fullWidth>
                        <InputLabel>Permission ban đầu</InputLabel>
                        <Select multiple label="Permission ban đầu" value={roleForm.permissionIds} onChange={(event) => setRoleForm((prev) => ({ ...prev, permissionIds: event.target.value.map(Number) }))} renderValue={(selected) => <MultiSelectValue values={selected} source={metadata.permissions} labelField="PermissionCode" />}>
                            {metadata.permissions.map((permission) => <MenuItem key={permission.Id} value={permission.Id}><Checkbox checked={roleForm.permissionIds.includes(Number(permission.Id))} />{permission.PermissionCode} - {permission.PermissionName}</MenuItem>)}
                        </Select>
                    </FormControl>}
                    {!roleDialog.editing && newRoleGrantsManagement && <Alert severity="warning">Role này có thể quản trị toàn bộ tài khoản và phân quyền.</Alert>}
                    <Alert severity="info">Mã role không thể thay đổi sau khi tạo.</Alert>
                </Stack></DialogContent>
                <DialogActions><Button disabled={saving} onClick={() => setRoleDialog({ open: false, editing: false })}>Hủy</Button><Button disabled={saving} variant="contained" onClick={saveRole}>Lưu</Button></DialogActions>
            </Dialog>

            <Dialog open={Boolean(permissionTarget)} onClose={() => !saving && setPermissionTarget(null)} maxWidth="md" fullWidth>
                <DialogTitle>Permission của role · {permissionTarget?.RoleCode}</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={1}>
                        {metadata.permissions.map((permission) => (
                            <Paper key={permission.Id} variant="outlined" sx={{ p: 1 }}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <Checkbox checked={permissionIds.includes(Number(permission.Id))} onChange={(event) => setPermissionIds((prev) => event.target.checked ? [...prev, Number(permission.Id)] : prev.filter((id) => id !== Number(permission.Id)))} />
                                    <Box><Typography fontWeight={700}>{permission.PermissionCode}</Typography><Typography variant="body2" color="text.secondary">{permission.PermissionName}</Typography></Box>
                                </Stack>
                            </Paper>
                        ))}
                        {permissionEditGrantsManagement && <Alert severity="warning">Permission này cho phép quản trị toàn bộ tài khoản, role và phân quyền.</Alert>}
                        <Alert severity="info">Thay đổi chỉ có hiệu lực sau khi người dùng thuộc role đăng nhập lại.</Alert>
                    </Stack>
                </DialogContent>
                <DialogActions><Button disabled={saving} onClick={() => setPermissionTarget(null)}>Hủy</Button><Button disabled={saving} variant="contained" onClick={savePermissions}>Lưu permission</Button></DialogActions>
            </Dialog>
        </Box>
    );
}
