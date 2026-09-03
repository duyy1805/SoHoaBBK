import { useEffect, useState } from "react";
import {
    View,
    Text,
    TextInput,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert
} from "react-native";
import KeyboardFormScrollView from "../components/KeyboardFormScrollView";

import {
    getBienBanDetail,
    getStandaloneBienBanDetail,
    updateMoTaChung,
    completeBienBan,
    confirmAssign,
    confirmUser,
    confirmKphByCreatorDepartment,
    submitExecutiveApproval,
    updateKphRequirements
} from "../api/bienBan.api";

import AsyncStorage from "@react-native-async-storage/async-storage";
import AssignUserModal from "../components/AssignUserModal";
import AssignDepartmentModal from "../components/AssignDepartmentModal";
import XuLyModal from "../components/XuLyModal";
import ChiPhiModal from "../components/ChiPhiModal";
import HanhDongModal from "../components/HanhDongModal";
import OpinionResponseModal from "../components/OpinionResponseModal";
import ExecutiveApprovalReturnModal from "../components/ExecutiveApprovalReturnModal";
export default function BienBanDetailScreen({ route, navigation }) {

    const { bienBanId, standalone = false } = route.params;

    const [info, setInfo] = useState(null);
    const [moTaChung, setMoTaChung] = useState("");
    const [moTaConfirmed, setMoTaConfirmed] = useState(false);
    const [defects, setDefects] = useState([]);
    const [assigns, setAssigns] = useState([]);
    const [xuLy, setXuLy] = useState([]);
    const [chiPhi, setChiPhi] = useState([]);
    const [xacNhan, setXacNhan] = useState([]);
    const [hanhDong, setHanhDong] = useState([]);
    const [specialistOpinions, setSpecialistOpinions] = useState([]);
    const [executiveApprovals, setExecutiveApprovals] = useState([]);

    const [loading, setLoading] = useState(true);
    const [showAssignDeptModal, setShowAssignDeptModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showXuLyModal, setShowXuLyModal] = useState(false);
    const [showChiPhiModal, setShowChiPhiModal] = useState(false);
    const [showHanhDongModal, setShowHanhDongModal] = useState(false);
    const [showOpinionModal, setShowOpinionModal] = useState(false);
    const [selectedOpinionDepartment, setSelectedOpinionDepartment] = useState(null);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [currentUserBoPhanId, setCurrentUserBoPhanId] = useState(null);
    const [currentUserPermissions, setCurrentUserPermissions] = useState([]);
    const [currentUserRoles, setCurrentUserRoles] = useState([]);
    const [selectedAssign, setSelectedAssign] = useState(null);
    const [showExecutiveReturnModal, setShowExecutiveReturnModal] = useState(false);
    const [executiveSaving, setExecutiveSaving] = useState(false);
    /* LOAD DATA */

    useEffect(() => {
        loadUser();
        loadData();
    }, []);

    const loadUser = async () => {
        const userStr = await AsyncStorage.getItem("user");
        if (!userStr) return;
        const user = JSON.parse(userStr);
        setCurrentUserId(user.id);
        setCurrentUserBoPhanId(user.boPhanId);
        setCurrentUserPermissions(user.permissions || []);
        setCurrentUserRoles(user.roles || []);
    };
    const loadData = async () => {
        try {

            setLoading(true);
            const res = standalone
                ? await getStandaloneBienBanDetail(bienBanId)
                : await getBienBanDetail(bienBanId);

            setInfo(res.data.info || []);
            setDefects(res.data.defects || []);
            setAssigns(res.data.assigns || []);
            setXuLy(res.data.xuLy || []);
            setChiPhi(res.data.chiPhi || []);
            setXacNhan(res.data.xacNhan || []);
            setHanhDong(res.data.hanhDong || []);
            setSpecialistOpinions(res.data.specialistOpinions || []);
            setExecutiveApprovals(res.data.executiveApprovals || []);
            const moTa = res.data.info?.MoTaChung || "";

            setMoTaChung(moTa);
            setMoTaConfirmed(!!moTa);
        } catch (err) {

            Alert.alert(
                "Lỗi",
                err?.response?.data?.message || "Không tải được biên bản"
            );

        } finally {

            setLoading(false);

        }

    };

    const navigateToPhieuKiem = () => {
        if (!info?.PhieuKiemId) return;

        if (info.IsCongDoan) {
            navigation.navigate("CongDoanDetail", { id: info.PhieuKiemId });
            return;
        }

        const loaiKiemId = Number(info.LoaiKiemId || 0);
        if (loaiKiemId === 3) {
            navigation.navigate("CuoiChuyenInspection", { id: info.PhieuKiemId });
            return;
        }
        if (loaiKiemId === 4) {
            navigation.navigate("SxbtInspection", { id: info.PhieuKiemId });
            return;
        }
        if (loaiKiemId === 6) {
            navigation.navigate("TrenChuyenInspection", { id: info.PhieuKiemId });
            return;
        }

        navigation.navigate("PhieuDetail", { id: info.PhieuKiemId });
    };

    const getDefectColor = (type) => {

        if (!type) return "#95a5a6";

        const t = type.toLowerCase();

        if (t.includes("critical")) return "#e74c3c";
        if (t.includes("major")) return "#e67e22";
        if (t.includes("minor")) return "#f1c40f";

        return "#3498db";

    };
    /* CONFIRM ASSIGN */

    const handleConfirmAssign = async () => {

        try {

            await confirmAssign(bienBanId);

            Alert.alert("Thành công", "Đã xác nhận phân công");

            loadData();

        } catch (err) {

            Alert.alert(
                "Lỗi",
                err?.response?.status === 403 ? "Không được cấp quyền" : err?.response?.data?.message || "Không thể xác nhận phân công"
            );

        }

    };

    const handleConfirmMoTa = async () => {

        if (!moTaChung.trim()) {
            Alert.alert("Thiếu thông tin", "Vui lòng nhập mô tả");
            return;
        }

        try {

            await updateMoTaChung({
                bienBanId,
                moTaChung
            });

            setMoTaConfirmed(true);

            Alert.alert("Thành công", "Đã xác nhận mô tả");

            loadData();

        } catch (err) {

            Alert.alert(
                "Lỗi",
                err?.response?.data?.message || "Không thể lưu mô tả"
            );

        }

    };
    /* COMPLETE */

    const handleComplete = async () => {

        try {

            if (info?.MauPhieuVersion === "V01") {
                const response = await confirmKphByCreatorDepartment(bienBanId);
                Alert.alert("Thành công", response.data?.nextStatus === "CHO_BGD_XAC_NHAN"
                    ? "Đã xác nhận và chuyển Ban giám đốc duyệt"
                    : "Đã xác nhận và chuyển biên bản sang theo dõi");
                loadData();
            } else {
                await completeBienBan(bienBanId);
                Alert.alert("Thành công", "Biên bản đã hoàn thành");
                navigation.goBack();
            }

        } catch (err) {
            if (err.status === 403) {
                Alert.alert("Lỗi", "Không được cấp quyền");
            } else {
                Alert.alert(
                    "Lỗi",
                    err?.response?.data?.message || "Không thể hoàn thành biên bản"
                );
            }
        }

    };

    const handleExecutiveApprove = () => {
        Alert.alert(
            "Ban giám đốc xác nhận",
            "Xác nhận hồ sơ để chuyển sang bước theo dõi hiệu lực?",
            [
                { text: "Hủy", style: "cancel" },
                {
                    text: "Xác nhận",
                    onPress: async () => {
                        try {
                            setExecutiveSaving(true);
                            await submitExecutiveApproval(bienBanId, "APPROVE");
                            Alert.alert("Thành công", "Ban giám đốc đã xác nhận hồ sơ");
                            loadData();
                        } catch (error) {
                            Alert.alert("Lỗi", error?.response?.data?.message || "Không thể xác nhận hồ sơ");
                        } finally {
                            setExecutiveSaving(false);
                        }
                    }
                }
            ]
        );
    };

    const handleExecutiveReturn = async (reason) => {
        try {
            setExecutiveSaving(true);
            await submitExecutiveApproval(bienBanId, "RETURN", reason);
            setShowExecutiveReturnModal(false);
            Alert.alert("Thành công", "Đã trả hồ sơ cho bộ phận tạo chỉnh sửa");
            loadData();
        } catch (error) {
            Alert.alert("Lỗi", error?.response?.data?.message || "Không thể trả lại hồ sơ");
        } finally {
            setExecutiveSaving(false);
        }
    };

    /* STATUS */

    const getStatusText = (boPhanId) => {
        const done = xuLy.find(x => x.BoPhanId === boPhanId);
        return done ? "✓" : "Chờ";
    };

    const isAdmin = currentUserRoles.some((role) => String(role || "").toUpperCase() === "ADMIN");
    const isDepartmentLead = currentUserRoles.some((role) => String(role || "").toUpperCase().startsWith("TP_"));
    const isV01 = info?.MauPhieuVersion === "V01";
    const isManagerOrQA = currentUserPermissions.includes("XAC_NHAN_NGUOI_XU_LY") ||
        currentUserPermissions.includes("KET_LUAN") ||
        currentUserPermissions.includes("QUAN_TRI_DM");
    const workflowDepartments = isV01 ? specialistOpinions : assigns;
    const isAssigned = workflowDepartments.some(a => Number(a.BoPhanId) === Number(currentUserBoPhanId));
    const hasXuLy = xuLy.some(x => x.BoPhanId === currentUserBoPhanId);
    const hasChiPhi = chiPhi.some(c => c.BoPhanId === currentUserBoPhanId);
    const hasHanhDong = hanhDong.some(h => h.BoPhanId === currentUserBoPhanId);
    const isConfirmed = xacNhan.some(
        x => x.BoPhanId === currentUserBoPhanId
    );
    const canAssignUserForDepartment = (assign) => {
        if (!info?.AssignConfirmed) return false;
        if (!assign || assign.BoPhanId !== currentUserBoPhanId) return false;

        const hasAssignPermission = currentUserPermissions.includes("XAC_NHAN_NGUOI_XU_LY");
        const hasLeadRole = currentUserRoles.some(
            role => role?.toUpperCase().includes("TP")
        );
        return hasAssignPermission || hasLeadRole || currentUserRoles.length === 0;
    };

    const openAssignUserModal = (assign) => {
        setSelectedAssign(assign);
        setShowAssignModal(true);
    };
    const allConfirmed =
        assigns.length > 0 &&
        assigns.every(a =>
            xacNhan.some(x => x.BoPhanId === a.BoPhanId)
        );
    const allOpinionsAnswered = specialistOpinions.length > 0 &&
        specialistOpinions.every((item) => Boolean(item.HasResponded));
    const requiredSectionsReady = xuLy.length > 0 &&
        (!info?.YeuCauChiPhi || chiPhi.length > 0) &&
        (!info?.YeuCauHanhDong || hanhDong.length > 0);
    const canCreatorConfirm = isV01 && Boolean(info?.CanCreatorConfirm) &&
        info?.OpinionDepartmentsConfirmed && allOpinionsAnswered &&
        requiredSectionsReady && !["CHO_THEO_DOI", "HOAN_TAT"].includes(info?.TrangThai);
    const handleConfirmUser = async () => {

        try {

            await confirmUser(bienBanId);

            Alert.alert("Thành công", "Đã xác nhận thông tin");

            loadData();

        } catch (err) {

            Alert.alert(
                "Lỗi",
                err?.response?.data?.message || "Không thể xác nhận"
            );

        }

    };

    const toggleRequirement = async (field, value) => {
        try {
            await updateKphRequirements(bienBanId, { [field]: value });
            loadData();
        } catch (error) {
            Alert.alert("Lỗi", error?.response?.data?.message || "Không thể cập nhật yêu cầu");
        }
    };

    /* LOADING */
    if (loading) {
        return (
            <ActivityIndicator size="large" style={{ marginTop: 40 }} />
        );
    }

    /* UI */

    return (

        <KeyboardFormScrollView style={styles.container} keyboardShouldPersistTaps="handled">

            {/* HEADER */}

            <View style={styles.headerCard}>

                <Text style={styles.soPhieu}>{info?.SoPhieu}</Text>

                <Text style={styles.product}>{info?.TenSanPham}</Text>

                <View style={styles.rowBetween}>
                    <Text style={styles.meta}>Lot: {info?.Lot}</Text>
                    <Text style={styles.meta}>Người lập: {info?.NguoiLap}</Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                    <View style={styles.statusBadge}>
                        <Text style={styles.statusText}>{info?.TrangThai}</Text>
                    </View>

                    {info?.PhieuKiemId && (
                        <TouchableOpacity
                            onPress={navigateToPhieuKiem}
                            style={{
                                backgroundColor: '#2563eb',
                                paddingHorizontal: 12,
                                paddingVertical: 6,
                                borderRadius: 8
                            }}
                        >
                            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>Xem phiếu kiểm</Text>
                        </TouchableOpacity>
                    )}
                </View>

            </View>

            {/* MÔ TẢ CHUNG */}

            <Text style={styles.section}>Mô tả chung</Text>

            <View style={styles.moTaBox}>

                <TextInput
                    style={styles.moTaInput}
                    multiline
                    placeholder="Nhập mô tả chung về lỗi..."
                    value={moTaChung}
                    onChangeText={setMoTaChung}
                    editable={!moTaConfirmed}
                />

                {!moTaConfirmed && (

                    <TouchableOpacity
                        style={styles.moTaButton}
                        onPress={handleConfirmMoTa}
                    >
                        <Text style={styles.btnText}>
                            Xác nhận mô tả
                        </Text>
                    </TouchableOpacity>

                )}

            </View>
            {/* DEFECTS */}

            <Text style={styles.section}>Danh sách lỗi</Text>

            <View style={styles.table}>

                <View style={styles.tableHeader}>
                    <Text style={[styles.th, { flex: 1 }]}>Tên lỗi</Text>
                    <Text style={[styles.th, { width: 90, textAlign: "center" }]}>Mức độ</Text>
                    <Text style={[styles.th, { width: 40, textAlign: "right" }]}>SL</Text>
                </View>

                {defects.map((d, i) => {

                    const color = getDefectColor(d.DefectType);

                    return (

                        <View key={i} style={styles.tableRow}>

                            <Text style={[styles.td, { flex: 1 }]}>
                                {d.TenLoi}
                            </Text>

                            <View style={[styles.badge, { backgroundColor: color }]}>
                                <Text style={styles.badgeText}>
                                    {d.DefectType}
                                </Text>
                            </View>

                            <Text style={[styles.td, { width: 40, textAlign: "right" }]}>
                                {d.SoLuong}
                            </Text>

                        </View>

                    )

                })}

            </View>

            {/* ASSIGN */}

            <Text style={styles.section}>{isV01 ? "Bộ phận cần lấy ý kiến" : "Bộ phận xử lý"}</Text>

            <View style={styles.card}>

                {workflowDepartments.map((a, i) => (
                    <View key={i} style={styles.assignRow}>

                        <View style={styles.assignInfo}>
                            <Text style={styles.assignName}>{a.MaBoPhan}</Text>
                            <Text style={styles.assignRole}>{a.TenBoPhan}</Text>
                            <Text style={styles.assignPerson}>
                                {isV01
                                    ? (a.HasResponded ? "Đã phản hồi" : "Đang chờ phản hồi")
                                    : `Phụ trách: ${a.NguoiXuLy || "Chưa phân cá nhân"}`}
                            </Text>
                        </View>

                        <View style={styles.assignActionGroup}>
                            <Text style={[
                                styles.assignStatus,
                                (isV01 ? a.HasResponded : getStatusText(a.BoPhanId) === "✓")
                                    ? styles.done
                                    : styles.pending
                            ]}>
                                {isV01 ? (a.HasResponded ? "✓" : "Chờ") : getStatusText(a.BoPhanId)}
                            </Text>

                            {!isV01 && canAssignUserForDepartment(a) && (
                                <TouchableOpacity
                                    style={styles.assignMiniBtn}
                                    onPress={() => openAssignUserModal(a)}
                                >
                                    <Text style={styles.assignMiniBtnText}>
                                        Phân cá nhân
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>

                    </View>
                ))}

            </View>

            {/* BUTTONS */}

            {isV01 && moTaConfirmed && info.CanManageKphFlow &&
                !["CHO_THEO_DOI", "HOAN_TAT"].includes(info.TrangThai) && (
                <TouchableOpacity
                    style={styles.assignDeptBtn}
                    onPress={() => setShowAssignDeptModal(true)}
                >
                    <Text style={styles.btnText}>
                        {specialistOpinions.length ? "Bổ sung / cập nhật bộ phận" : "Chọn bộ phận cần ý kiến"}
                    </Text>
                </TouchableOpacity>
            )}

            {!isV01 && !info.AssignConfirmed && moTaConfirmed && isManagerOrQA && (

                <>

                    <TouchableOpacity
                        style={styles.assignDeptBtn}
                        onPress={() => setShowAssignDeptModal(true)}
                    >
                        <Text style={styles.btnText}>
                            Chọn bộ phận xử lý
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.confirmBtn}
                        onPress={handleConfirmAssign}
                    >
                        <Text style={styles.btnText}>
                            Xác nhận phân công
                        </Text>
                    </TouchableOpacity>

                </>

            )}

            {/* XU LY */}

            <Text style={styles.section}>Đề xuất xử lý</Text>

            <View style={styles.table}>

                {xuLy.map((x, i) => (
                    <View key={i} style={styles.xuLyRow}>

                        <Text style={styles.noiDung}>{x.NoiDung}</Text>

                        <Text style={styles.deNghi}>
                            Đề nghị: {x.DeNghiXuLy}
                        </Text>

                        <View style={styles.rowBetween}>
                            <Text style={styles.boPhan}>
                                {x.NguoiXuLy} - {x.MaBoPhan} - {x.TenBoPhan}
                            </Text>

                            <Text style={styles.deadline}>
                                {new Date(x.ThoiHan).toLocaleDateString("vi-VN")}
                            </Text>
                        </View>

                    </View>
                ))}

            </View>
            {((isV01 && info.CanManageKphFlow) || (!isV01 && info.AssignConfirmed && isAssigned && !isConfirmed)) &&
                !["CHO_THEO_DOI", "HOAN_TAT"].includes(info.TrangThai) && (

                <TouchableOpacity
                    style={styles.commentBtn}
                    onPress={() => setShowXuLyModal(true)}
                >
                    <Text style={styles.btnText}>
                        Nhập ý kiến xử lý
                    </Text>
                </TouchableOpacity>

            )}
            {/* CHI PHI */}

            <Text style={styles.section}>Chi phí phát sinh</Text>
            {isV01 && info.CanManageKphFlow && !["CHO_THEO_DOI", "HOAN_TAT"].includes(info.TrangThai) && (
                <TouchableOpacity
                    style={styles.requirementButton}
                    onPress={() => toggleRequirement("yeuCauChiPhi", !info.YeuCauChiPhi)}
                >
                    <Text style={styles.requirementText}>
                        {info.YeuCauChiPhi ? "Đang yêu cầu · Bấm để bỏ yêu cầu" : "Không yêu cầu · Bấm để yêu cầu"}
                    </Text>
                </TouchableOpacity>
            )}

            {chiPhi.map((c, i) => (
                // Ưu tiên dùng c.id nếu có, nếu không thì dùng index i
                <View key={c.id || i} style={styles.expenseCard}>
                    {/* Phần trên: Loại chi phí & Số tiền */}
                    <View style={styles.expenseHeader}>
                        <View style={styles.expenseTypeWrapper}>
                            <Text style={styles.expenseLabel}>Loại chi phí</Text>
                            <Text style={styles.expenseType}>{c.LoaiChiPhi}</Text>
                        </View>
                        <Text style={styles.expenseCost}>
                            {c.GiaTri?.toLocaleString("vi-VN")} <Text style={styles.currency}>₫</Text>
                        </Text>
                    </View>

                    {/* Đường kẻ ngang phân cách */}
                    <View style={styles.divider} />

                    {/* Phần dưới: Người theo dõi & Bộ phận */}
                    <View style={styles.expenseFooter}>
                        <View style={styles.assigneeWrapper}>
                            <Text style={styles.footerLabel}>Theo dõi</Text>
                            <Text style={styles.assignName}>{c.NguoiXuLy}</Text>
                        </View>
                        <View style={styles.departmentBadge}>
                            <Text style={styles.departmentText}>{c.TenBoPhan}</Text>
                        </View>
                    </View>
                </View>
            ))}

            {((isV01 && info.CanManageKphFlow && info.YeuCauChiPhi) ||
                (!isV01 && info.AssignConfirmed && isAssigned && !isConfirmed && hasXuLy)) &&
                !["CHO_THEO_DOI", "HOAN_TAT"].includes(info.TrangThai) && (

                <TouchableOpacity
                    style={styles.costBtn}
                    onPress={() => setShowChiPhiModal(true)}
                >
                    <Text style={styles.btnText}>
                        Thêm chi phí
                    </Text>
                </TouchableOpacity>

            )}
            <Text style={styles.section}>
                Hành động khắc phục
            </Text>
            {isV01 && info.CanManageKphFlow && !["CHO_THEO_DOI", "HOAN_TAT"].includes(info.TrangThai) && (
                <TouchableOpacity
                    style={styles.requirementButton}
                    onPress={() => toggleRequirement("yeuCauHanhDong", !info.YeuCauHanhDong)}
                >
                    <Text style={styles.requirementText}>
                        {info.YeuCauHanhDong ? "Đang yêu cầu · Bấm để bỏ yêu cầu" : "Không yêu cầu · Bấm để yêu cầu"}
                    </Text>
                </TouchableOpacity>
            )}
            <ScrollView style={styles.table} keyboardShouldPersistTaps="handled">
                {hanhDong.map((h, i) => (

                    <View key={i} style={styles.xuLyRow}>

                        <Text style={styles.noiDung}>{h.NoiDung}</Text>

                        <View style={styles.rowBetween}>
                            <Text style={styles.boPhan}>
                                {h.MaBoPhan} - {h.TenBoPhan}
                            </Text>

                            <Text style={styles.deadline}>
                                {new Date(h.ThoiHan).toLocaleDateString("vi-VN")}
                            </Text>
                        </View>

                    </View>

                ))}
            </ScrollView>
            {((isV01 && info.CanManageKphFlow && info.YeuCauHanhDong) ||
                (!isV01 && info.AssignConfirmed && isAssigned && !isConfirmed && hasXuLy)) &&
                !["CHO_THEO_DOI", "HOAN_TAT"].includes(info.TrangThai) && (

                <TouchableOpacity
                    style={styles.costBtn}
                    onPress={() => setShowHanhDongModal(true)}
                >
                    <Text style={styles.btnText}>
                        Thêm hành động
                    </Text>
                </TouchableOpacity>

            )}
            {isV01 && (
                <>
                    <Text style={styles.section}>Ý kiến phòng ban chuyên môn</Text>
                    {specialistOpinions.map((opinion) => (
                        <View key={opinion.Id} style={styles.opinionCard}>
                            <View style={styles.rowBetween}>
                                <Text style={styles.assignName}>{opinion.TenBoPhan || opinion.MaBoPhan}</Text>
                                <Text style={opinion.HasResponded ? styles.done : styles.pending}>
                                    {opinion.HasResponded ? "Đã phản hồi" : "Chưa phản hồi"}
                                </Text>
                            </View>
                            {opinion.HasResponded && (
                                <View style={styles.responseBatch}>
                                    <Text style={styles.responseText}>{opinion.NoiDung}</Text>
                                    <Text style={styles.meta}>
                                        {opinion.NguoiTraLoi} · {opinion.ThoiGian ? new Date(opinion.ThoiGian).toLocaleString("vi-VN") : ""}
                                    </Text>
                                </View>
                            )}
                            {info.OpinionDepartmentsConfirmed && !info.CreatorConfirmedAt &&
                                !opinion.HasResponded &&
                                (isAdmin || (isDepartmentLead && Number(opinion.BoPhanId) === Number(currentUserBoPhanId))) && (
                                <TouchableOpacity
                                    style={styles.commentBtn}
                                    onPress={() => {
                                        setSelectedOpinionDepartment(opinion);
                                        setShowOpinionModal(true);
                                    }}
                                >
                                    <Text style={styles.btnText}>Nhập ý kiến</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ))}
                </>
            )}
            {/* XAC NHAN */}

            {!isV01 && <Text style={styles.section}>Xác nhận</Text>}

            {!isV01 && xacNhan.map((x, i) => (
                <View key={i} style={styles.cardRow}>
                    <Text>{x.FullName}</Text>
                    <Text style={styles.meta}>{x.ThoiGian}</Text>
                </View>
            ))}

            {isV01 && info.RequiresExecutiveApproval && (
                <View style={styles.executiveCard}>
                    <View style={styles.rowBetween}>
                        <Text style={styles.executiveTitle}>Ban giám đốc xác nhận</Text>
                        <Text style={info.ExecutiveApprovalStatus === "APPROVED" ? styles.done
                            : info.ExecutiveApprovalStatus === "RETURNED" ? styles.returned : styles.pending}>
                            {info.ExecutiveApprovalStatus === "APPROVED" ? "Đã xác nhận"
                                : info.ExecutiveApprovalStatus === "RETURNED" ? "Đã trả lại"
                                    : info.TrangThai === "CHO_BGD_XAC_NHAN" ? "Đang chờ" : "Chưa đến bước"}
                        </Text>
                    </View>
                    {info.ExecutiveApprovalAt ? (
                        <Text style={styles.meta}>
                            {info.ExecutiveApprovalByName || "Ban giám đốc"} · {new Date(info.ExecutiveApprovalAt).toLocaleString("vi-VN")}
                        </Text>
                    ) : null}
                    {info.ExecutiveApprovalReason ? (
                        <Text style={styles.executiveReason}>Lý do: {info.ExecutiveApprovalReason}</Text>
                    ) : null}
                    {executiveApprovals.length > 1 ? (
                        <Text style={styles.meta}>Đã ghi nhận {executiveApprovals.length} vòng xử lý.</Text>
                    ) : null}
                    {(info.CanExecutiveApprove || info.CanExecutiveReturn) && (
                        <View style={styles.executiveActions}>
                            {info.CanExecutiveReturn && (
                                <TouchableOpacity
                                    style={styles.executiveReturnButton}
                                    disabled={executiveSaving}
                                    onPress={() => setShowExecutiveReturnModal(true)}
                                >
                                    <Text style={styles.executiveReturnText}>Trả lại</Text>
                                </TouchableOpacity>
                            )}
                            {info.CanExecutiveApprove && (
                                <TouchableOpacity
                                    style={styles.executiveApproveButton}
                                    disabled={executiveSaving}
                                    onPress={handleExecutiveApprove}
                                >
                                    <Text style={styles.btnText}>{executiveSaving ? "Đang xử lý…" : "Xác nhận"}</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>
            )}

            {/* COMPLETE */}
            {!isV01 && info.AssignConfirmed && isAssigned && !isConfirmed && hasXuLy && hasChiPhi && hasHanhDong && (

                <TouchableOpacity
                    style={styles.confirmUserBtn}
                    onPress={handleConfirmUser}
                >
                    <Text style={styles.btnText}>
                        Xác nhận thông tin
                    </Text>
                </TouchableOpacity>

            )}
            {(isV01 ? canCreatorConfirm : allConfirmed) && (

                <TouchableOpacity
                    style={styles.completeBtn}
                    onPress={handleComplete}
                >
                    <Text style={styles.btnText}>
                        {isV01
                            ? info.RequiresExecutiveApproval ? "Xác nhận và trình Ban giám đốc" : "Xác nhận và chuyển theo dõi"
                            : "Hoàn thành biên bản"}
                    </Text>
                </TouchableOpacity>

            )}

            {/* MODALS */}

            <AssignDepartmentModal
                visible={showAssignDeptModal}
                bienBanId={bienBanId}
                assignedDepartments={workflowDepartments}
                opinionFlow={isV01}
                onClose={() => setShowAssignDeptModal(false)}
                reload={loadData}
            />

            <AssignUserModal
                visible={showAssignModal}
                bienBanId={bienBanId}
                boPhanId={selectedAssign?.BoPhanId}
                tenBoPhan={selectedAssign?.TenBoPhan}
                currentAssignedUserId={selectedAssign?.NguoiXuLyId}
                onClose={() => {
                    setShowAssignModal(false);
                    setSelectedAssign(null);
                }}
                reload={loadData}
            />

            <XuLyModal
                visible={showXuLyModal}
                bienBanId={bienBanId}
                currentUserId={currentUserId}
                reload={loadData}
                onClose={() => setShowXuLyModal(false)}
            />
            <ChiPhiModal
                visible={showChiPhiModal}
                bienBanId={bienBanId}
                reload={loadData}
                onClose={() => setShowChiPhiModal(false)}
            />
            <HanhDongModal
                visible={showHanhDongModal}
                bienBanId={bienBanId}
                reload={loadData}
                onClose={() => setShowHanhDongModal(false)}
            />
            <OpinionResponseModal
                visible={showOpinionModal}
                bienBanId={bienBanId}
                department={selectedOpinionDepartment}
                reload={loadData}
                onClose={() => {
                    setShowOpinionModal(false);
                    setSelectedOpinionDepartment(null);
                }}
            />
            <ExecutiveApprovalReturnModal
                visible={showExecutiveReturnModal}
                saving={executiveSaving}
                onClose={() => !executiveSaving && setShowExecutiveReturnModal(false)}
                onSubmit={handleExecutiveReturn}
            />
        </KeyboardFormScrollView>

    );

}

const styles = StyleSheet.create({

    container: {
        flex: 1,
        backgroundColor: "#f4f6fa",
        padding: 16
    },
    opinionCard: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#e2e8f0"
    },
    responseBatch: {
        marginTop: 10,
        padding: 10,
        borderRadius: 8,
        backgroundColor: "#f8fafc"
    },
    responseText: {
        color: "#1e293b",
        lineHeight: 20,
        marginBottom: 4
    },
    requirementButton: {
        marginBottom: 10,
        padding: 10,
        borderRadius: 8,
        backgroundColor: "#eff6ff",
        borderWidth: 1,
        borderColor: "#bfdbfe"
    },
    requirementText: {
        color: "#1d4ed8",
        fontWeight: "700",
        textAlign: "center"
    },
    executiveCard: {
        marginTop: 18,
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#a78bfa",
        backgroundColor: "#faf5ff"
    },
    executiveTitle: { fontSize: 16, fontWeight: "700", color: "#4c1d95" },
    executiveReason: { marginTop: 8, color: "#b91c1c", lineHeight: 20 },
    returned: { color: "#b91c1c", fontWeight: "700" },
    executiveActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 14 },
    executiveReturnButton: { borderWidth: 1, borderColor: "#dc2626", borderRadius: 9, paddingHorizontal: 16, paddingVertical: 11 },
    executiveReturnText: { color: "#dc2626", fontWeight: "700" },
    executiveApproveButton: { backgroundColor: "#15803d", borderRadius: 9, paddingHorizontal: 18, paddingVertical: 12 },

    headerCard: {
        backgroundColor: "#fff",
        borderRadius: 14,
        padding: 16,
        marginBottom: 10
    },

    soPhieu: {
        fontSize: 18,
        fontWeight: "700"
    },

    product: {
        marginTop: 4,
        fontSize: 15
    },

    meta: {
        color: "#666",
        fontSize: 13
    },

    rowBetween: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 6
    },

    statusBadge: {
        marginTop: 8,
        alignSelf: "flex-start",
        backgroundColor: "#eaf3ff",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8
    },

    statusText: {
        color: "#2980b9",
        fontWeight: "600"
    },
    moTaBox: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 12,
        marginTop: 8
    },
    moTaInput: {
        backgroundColor: "#f4f6fa",
        borderRadius: 10,
        padding: 12,
        minHeight: 80,
        textAlignVertical: "top"
    },

    moTaButton: {
        backgroundColor: "#2980b9",
        marginTop: 10,
        padding: 12,
        borderRadius: 10,
        alignItems: "center"
    },
    section: {
        marginTop: 20,
        fontWeight: "700",
        fontSize: 16
    },

    table: {
        backgroundColor: "#fff",
        borderRadius: 12,
        marginTop: 8,
        overflow: "hidden"
    },

    tableHeader: {
        flexDirection: "row",
        backgroundColor: "#eef1f5",
        paddingVertical: 10,
        paddingHorizontal: 10
    },

    tableRow: {
        flexDirection: "row",
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderTopWidth: 1,
        borderColor: "#eee"
    },
    badge: {
        width: 90,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 3,
        borderRadius: 6
    },

    badgeText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "600"
    },
    th: {
        fontWeight: "700",
        fontSize: 13
    },

    td: {
        fontSize: 14
    },

    card: {
        backgroundColor: "#fff",
        borderRadius: 12,
        marginTop: 8,
        padding: 12
    },

    assignRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderColor: "#eee"
    },

    assignInfo: {
        flex: 1,
        paddingRight: 12
    },

    assignRole: {
        color: "#666",
        fontSize: 13
    },

    assignPerson: {
        color: "#2563eb",
        fontSize: 13,
        marginTop: 4,
        fontWeight: "500"
    },

    assignActionGroup: {
        alignItems: "flex-end"
    },

    assignStatus: {
        fontWeight: "700"
    },

    done: {
        color: "#27ae60"
    },

    pending: {
        color: "#e67e22"
    },

    xuLyRow: {
        padding: 12,
        borderBottomWidth: 1,
        borderColor: "#eee"
    },

    noiDung: {
        fontWeight: "600"
    },

    deNghi: {
        marginTop: 3,
        color: "#555"
    },

    boPhan: {
        fontSize: 13,
        color: "#666"
    },

    deadline: {
        fontSize: 13,
        color: "#e67e22",
        fontWeight: "600"
    },

    cardRow: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 12,
        marginTop: 8,
        flexDirection: "row",
        justifyContent: "space-between"
    },
    department: {
        fontWeight: "600",
        color: "#16a085"
    },
    cost: {
        fontWeight: "700"
    },
    costBtn: {
        backgroundColor: "#16a085",
        padding: 12,
        borderRadius: 10,
        alignItems: "center",
        marginTop: 10
    },
    // Thêm các style mới này vào StyleSheet của bạn
    expenseCard: {
        backgroundColor: "#fff",
        borderRadius: 12,
        marginTop: 12,
        padding: 16,
        // Thêm shadow để card nổi lên trông xịn hơn
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },

    expenseHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },

    expenseTypeWrapper: {
        flex: 1,
        paddingRight: 10,
    },

    expenseLabel: {
        fontSize: 12,
        color: "#888",
        marginBottom: 2,
    },

    expenseType: {
        fontSize: 15,
        fontWeight: "600",
        color: "#2c3e50",
    },

    expenseCost: {
        fontSize: 16,
        fontWeight: "700",
        color: "#e74c3c", // Màu đỏ cam nhấn mạnh chi phí (hoặc đổi thành #27ae60 nếu là thu nhập)
    },

    currency: {
        fontSize: 13,
        fontWeight: "600",
        color: "#e74c3c",
    },

    divider: {
        height: 1,
        backgroundColor: "#f0f0f0",
        marginVertical: 12,
    },

    expenseFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },

    assigneeWrapper: {
        flexDirection: "column",
    },

    footerLabel: {
        fontSize: 11,
        color: "#888",
        marginBottom: 2,
    },

    assignName: {
        fontSize: 14,
        fontWeight: "500",
        color: "#34495e",
    },

    departmentBadge: {
        backgroundColor: "#eaf3ff",
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },

    departmentText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#2980b9",
    },
    assignMiniBtn: {
        backgroundColor: "#3498db",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        marginTop: 8
    },

    assignMiniBtnText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "600"
    },

    assignDeptBtn: {
        backgroundColor: "#8e44ad",
        padding: 12,
        borderRadius: 10,
        alignItems: "center",
        marginTop: 10
    },

    confirmBtn: {
        backgroundColor: "#e67e22",
        padding: 12,
        borderRadius: 10,
        alignItems: "center",
        marginTop: 10
    },

    commentBtn: {
        backgroundColor: "#8e44ad",
        padding: 12,
        borderRadius: 10,
        alignItems: "center",
        marginTop: 10
    },
    confirmUserBtn: {
        backgroundColor: "#f39c12",
        padding: 12,
        borderRadius: 10,
        alignItems: "center",
        marginTop: 10
    },
    completeBtn: {
        backgroundColor: "#27ae60",
        padding: 16,
        borderRadius: 12,
        alignItems: "center",
        marginTop: 30,
        marginBottom: 30
    },

    btnText: {
        color: "#fff",
        fontWeight: "600"
    }

});
