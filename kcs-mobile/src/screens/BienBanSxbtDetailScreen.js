import { useCallback, useMemo, useState } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    StyleSheet
} from "react-native";
import KeyboardFormScrollView from "../components/KeyboardFormScrollView";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    getBienBanSxbtDetail,
    saveBienBanSxbtDraft,
    confirmBienBanSxbtMucDo,
    confirmBienBanSxbtStep
} from "../api/bienBan.api";
import SxbtXuLyModal from "../components/SxbtXuLyModal";
import SxbtHanhDongModal from "../components/SxbtHanhDongModal";

const LEVEL_OPTIONS = ["B", "C"];

export default function BienBanSxbtDetailScreen({ route, navigation }) {
    const { bienBanId } = route.params;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [info, setInfo] = useState(null);
    const [confirmSteps, setConfirmSteps] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [xuLyRows, setXuLyRows] = useState([]);
    const [hanhDongRows, setHanhDongRows] = useState([]);
    const [showXuLyModal, setShowXuLyModal] = useState(false);
    const [showHanhDongModal, setShowHanhDongModal] = useState(false);

    const [moTaChung, setMoTaChung] = useState("");
    const [mucDo, setMucDo] = useState("B");
    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [bienBanId])
    );

    const loadData = async () => {
        try {
            setLoading(true);
            const [res, userStr] = await Promise.all([
                getBienBanSxbtDetail(bienBanId),
                AsyncStorage.getItem("user")
            ]);
            const user = userStr ? JSON.parse(userStr) : null;

            const data = res.data || {};
            const infoData = data.info || {};
            const selectedLevel = infoData.MucDoKhongPhuHop || "B";
            setCurrentUser(user);
            setInfo(infoData);
            setConfirmSteps(data.confirmSteps || []);
            setXuLyRows(data.xuLyRows || []);
            setHanhDongRows(data.hanhDong || []);
            setMoTaChung(infoData.MoTaChung || "");
            setMucDo(selectedLevel);
        } catch (err) {
            Alert.alert("Lỗi", err?.response?.data?.message || "Không tải được biên bản SXBT");
        } finally {
            setLoading(false);
        }
    };

    const isMucDoConfirmed = info?.MucDoKhongPhuHopConfirmed === true || info?.MucDoKhongPhuHopConfirmed === 1;

    const currentPendingStep = useMemo(
        () => (confirmSteps || []).find(s => s.TrangThai !== "DA_XAC_NHAN"),
        [confirmSteps]
    );

    const canConfirmCurrentStep = useMemo(() => {
        if (!currentPendingStep || !currentUser?.boPhanId) return false;
        return Number(currentPendingStep.BoPhanId) === Number(currentUser.boPhanId);
    }, [currentPendingStep, currentUser]);

    const isCompleted = info?.TrangThai === "BB_SXBT_HOAN_TAT";
    const canEditBeforeFlow = !isMucDoConfirmed && !isCompleted;
    const canEditCurrentStep = isMucDoConfirmed && !isCompleted && canConfirmCurrentStep;
    const canEditContent = canEditBeforeFlow || canEditCurrentStep;

    const onChangeLevel = (value) => {
        setMucDo(value);
    };

    const handleConfirmMucDo = async () => {
        if (!["B", "C"].includes(mucDo)) {
            Alert.alert("Thiếu thông tin", "Vui lòng chọn mức độ không phù hợp");
            return;
        }
        if (!moTaChung.trim()) {
            Alert.alert("Thiếu thông tin", "Vui lòng nhập mô tả chung");
            return;
        }

        try {
            setSaving(true);
            await saveBienBanSxbtDraft(bienBanId, buildDraftPayload());
            await confirmBienBanSxbtMucDo(bienBanId, mucDo);
            Alert.alert("Thành công", `Đã xác nhận mức độ ${mucDo}`);
            await loadData();
        } catch (err) {
            Alert.alert("Lỗi", err?.response?.data?.message || "Không thể xác nhận mức độ");
        } finally {
            setSaving(false);
        }
    };

    const buildDraftPayload = (nextHanhDongRows = hanhDongRows) => ({
        moTaChung,
        mucDoKhongPhuHop: mucDo,
        xuLyRows: xuLyRows.map((row, idx) => ({
            rowCode: row.RowCode || `ROW_${idx + 1}`,
            sortOrder: row.SortOrder || idx + 1,
            chiPhi: row.ChiPhi || null,
            noiDung: row.NoiDung || null,
            nguoiNhapId: row.NguoiNhapId || null,
            boPhanTrachNhiemId: row.BoPhanTrachNhiemId || null,
            thoiHan: row.ThoiHan || null
        })),
        hanhDong: nextHanhDongRows.map((item) => ({
            noiDung: item.NoiDung || null,
            thoiHan: item.ThoiHan || null,
            boPhanId: item.BoPhanId || null,
            nguoiNhapId: item.NguoiNhapId || null
        }))
    });

    const handleConfirmStep = async () => {
        try {
            setSaving(true);
            await confirmBienBanSxbtStep(bienBanId);
            Alert.alert("Thành công", "Đã xác nhận bước hiện tại");
            await loadData();
        } catch (err) {
            Alert.alert("Lỗi", err?.response?.data?.message || "Không thể xác nhận bước");
        } finally {
            setSaving(false);
        }
    };

    const handleAddHanhDong = async ({ noiDung, thoiHan, boPhanId, boPhanText }) => {
        const [maBoPhan, ...tenParts] = String(boPhanText || "").split(" - ");
        const tenBoPhan = tenParts.join(" - ");
        const nextHanhDongRows = [
            ...hanhDongRows,
            {
                NoiDung: noiDung,
                ThoiHan: thoiHan,
                BoPhanId: boPhanId,
                MaBoPhan: maBoPhan || "",
                TenBoPhan: tenBoPhan || "",
                NguoiNhapId: currentUser?.id || currentUser?.userId || null,
                NguoiNhap: currentUser?.fullName || currentUser?.username || ""
            }
        ];

        try {
            setSaving(true);
            await saveBienBanSxbtDraft(bienBanId, buildDraftPayload(nextHanhDongRows));

            setShowHanhDongModal(false);
            Alert.alert("Thành công", "Đã thêm hành động khắc phục");
            await loadData();
        } catch (err) {
            Alert.alert("Lỗi", err?.response?.data?.message || "Không thể thêm hành động");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <KeyboardFormScrollView
            style={styles.container}
            contentContainerStyle={{ paddingBottom: 32 }}
            keyboardShouldPersistTaps="handled"
        >
            <View style={styles.card}>
                <Text style={styles.title}>Biên bản SXBT</Text>
                <Text style={styles.meta}>Số phiếu: {info?.SoPhieu || "---"}</Text>
                <Text style={styles.meta}>Bộ phận tạo: {[info?.MaBoPhanTao, info?.TenBoPhanTao].filter(Boolean).join(" - ") || "---"}</Text>
                <Text style={styles.meta}>Mã đơn vị SXBT: {info?.MaDonVi || "---"}</Text>
                <Text style={styles.meta}>
                    Nguồn SXBT: {info?.SxbtSourceCount > 1
                        ? `${info.SxbtSourceCount} kế hoạch: ${(info.SxbtSources || []).map((source) => `#${source.KeHoachNhapId}/KHSX #${source.ID_KeHoachSanXuat}`).join(", ")}`
                        : info?.SxbtSourceType === "KE_HOACH_NHAP"
                        ? `Kế hoạch nhập #${info?.KeHoachNhapId || "---"}`
                        : (info?.So_PhieuNhapBTP || `Phiếu nhập #${info?.PhieuNhapBtpId || "---"}`)}
                </Text>
                <Text style={styles.meta}>Trạng thái: {info?.TrangThai || "---"}</Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Mô tả chung</Text>
                <TextInput
                    style={styles.textArea}
                    multiline
                    placeholder="Nhập mô tả chung..."
                    value={moTaChung}
                    onChangeText={setMoTaChung}
                    editable={canEditBeforeFlow}
                />
            </View>

            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Mức không phù hợp</Text>
                <View style={styles.row}>
                    {LEVEL_OPTIONS.map((opt) => (
                        <TouchableOpacity
                            key={opt}
                            style={[styles.levelChip, mucDo === opt && styles.levelChipActive]}
                            onPress={() => onChangeLevel(opt)}
                            disabled={!canEditBeforeFlow || isMucDoConfirmed}
                        >
                            <Text style={[styles.levelText, mucDo === opt && styles.levelTextActive]}>{opt}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                {canEditBeforeFlow && !isMucDoConfirmed && (
                    <TouchableOpacity style={styles.confirmLevelBtn} onPress={handleConfirmMucDo} disabled={saving}>
                        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Xác nhận mức độ</Text>}
                    </TouchableOpacity>
                )}
                {isMucDoConfirmed && (
                    <Text style={styles.confirmedText}>Mức độ đã xác nhận: {mucDo}</Text>
                )}
            </View>

            {isMucDoConfirmed && (
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Ý kiến / Đề xuất xử lý</Text>
                    {xuLyRows.length === 0 ? (
                        <Text style={styles.emptyText}>Chưa có phương án xử lý</Text>
                    ) : (
                        <View style={styles.xuLyList}>
                            {xuLyRows.map((item, idx) => (
                                <View key={item.Id || idx} style={styles.xuLyCard}>
                                    <View style={styles.xuLyHeader}>
                                        <Text style={styles.xuLyCost}>
                                            Chi phí: {item.ChiPhi || "---"}
                                        </Text>
                                        <View style={styles.deadlineBadge}>
                                            <Text style={styles.deadlineBadgeText}>
                                                {item.ThoiHan ? new Date(item.ThoiHan).toLocaleDateString("vi-VN") : "---"}
                                            </Text>
                                        </View>
                                    </View>

                                    <Text style={styles.xuLyContent}>
                                        {item.NoiDung || "---"}
                                    </Text>

                                    <View style={styles.infoGrid}>
                                        <Text style={styles.infoItem}>
                                            Trách nhiệm: {item.TenBoPhanTrachNhiem || item.TrachNhiem || "---"}
                                        </Text>
                                        <Text style={styles.infoItem}>
                                            Người nhập: {item.NguoiNhap || (item.NguoiNhapId ? `ID ${item.NguoiNhapId}` : "---")}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                    {canEditContent && (
                        <TouchableOpacity style={styles.actionAddBtn} onPress={() => setShowXuLyModal(true)}>
                            <Text style={styles.btnText}>Nhập phương án xử lý</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {isMucDoConfirmed && (
                <View style={styles.card}>
                    <View style={styles.cardHeaderRow}>
                        <Text style={styles.sectionTitle}>Hành động khắc phục</Text>
                        {canEditContent && (
                            <TouchableOpacity style={styles.addActionBtn} onPress={() => setShowHanhDongModal(true)}>
                                <Text style={styles.addActionBtnText}>+ Thêm</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    {hanhDongRows.length === 0 ? (
                        <Text style={styles.emptyText}>Chưa có hành động cụ thể.</Text>
                    ) : (
                        <ScrollView style={styles.table} keyboardShouldPersistTaps="handled">
                            {hanhDongRows.map((item, idx) => (
                                <View key={item.Id || idx} style={styles.xuLyRow}>
                                    <Text style={styles.noiDung}>{item.NoiDung || "---"}</Text>
                                    <View style={styles.rowBetween}>
                                        <Text style={styles.boPhan}>
                                            Bộ phận thực hiện: {item.MaBoPhan && item.TenBoPhan
                                                ? `${item.MaBoPhan} - ${item.TenBoPhan}`
                                                : "Chưa có bộ phận"}
                                        </Text>
                                        <Text style={styles.deadline}>
                                            {item.ThoiHan ? new Date(item.ThoiHan).toLocaleDateString("vi-VN") : "---"}
                                        </Text>
                                    </View>
                                    <Text style={styles.meta}>
                                        Người nhập: {item.NguoiNhap || (item.NguoiNhapId ? `ID ${item.NguoiNhapId}` : "---")}
                                    </Text>
                                </View>
                            ))}
                        </ScrollView>
                    )}
                </View>
            )}

            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Chuỗi xác nhận</Text>
                {confirmSteps.length === 0 ? (
                    <Text style={styles.emptyText}>Chưa có chuỗi xác nhận</Text>
                ) : (
                    <>
                        {currentPendingStep && (
                            <Text style={styles.meta}>
                                Đang chờ: {currentPendingStep.MaBoPhan || currentPendingStep.TenBoPhan || `BP ${currentPendingStep.BoPhanId}`}
                            </Text>
                        )}
                        {confirmSteps.map((step) => (
                            <View key={step.Id || `${step.BoPhanId}-${step.StepOrder}`} style={styles.stepRow}>
                                <Text style={styles.meta}>Bước {step.StepOrder}: {step.TenBoPhan || step.MaBoPhan || `BP ${step.BoPhanId}`}</Text>
                                <Text style={[styles.meta, step.TrangThai === "DA_XAC_NHAN" ? styles.okText : styles.waitText]}>
                                    {step.TrangThai}
                                </Text>
                            </View>
                        ))}
                    </>
                )}
            </View>

            {canConfirmCurrentStep && !isCompleted && (
                <TouchableOpacity style={styles.primaryBtn} onPress={handleConfirmStep} disabled={saving}>
                    {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Xác nhận bước hiện tại</Text>}
                </TouchableOpacity>
            )}

            {isCompleted && (
                <Text style={styles.confirmedText}>Biên bản SXBT đã hoàn tất.</Text>
            )}

            <SxbtXuLyModal
                visible={showXuLyModal}
                bienBanId={bienBanId}
                mucDo={mucDo}
                onClose={() => setShowXuLyModal(false)}
                reload={loadData}
            />
            <SxbtHanhDongModal
                visible={showHanhDongModal}
                onClose={() => setShowHanhDongModal(false)}
                onSave={handleAddHanhDong}
            />
        </KeyboardFormScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f3f4f6",
        padding: 16
    },
    center: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center"
    },
    card: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 14,
        marginBottom: 12
    },
    title: {
        fontSize: 18,
        fontWeight: "700",
        marginBottom: 6
    },
    sectionTitle: {
        fontWeight: "700",
        fontSize: 15,
        marginBottom: 10
    },
    meta: {
        color: "#374151",
        marginBottom: 4
    },
    textArea: {
        minHeight: 90,
        borderWidth: 1,
        borderColor: "#d1d5db",
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
        textAlignVertical: "top"
    },
    xuLyList: {
        marginTop: 8,
        gap: 10
    },
    xuLyCard: {
        backgroundColor: "#f8fafc",
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 14,
        padding: 12
    },
    xuLyHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 8
    },
    xuLyCost: {
        fontSize: 16,
        fontWeight: "700",
        color: "#111827",
        flex: 1,
        marginRight: 8
    },
    deadlineBadge: {
        backgroundColor: "#fff3e8",
        borderWidth: 1,
        borderColor: "#ffd9b3",
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4
    },
    deadlineBadgeText: {
        color: "#c05621",
        fontWeight: "700",
        fontSize: 12
    },
    xuLyContent: {
        fontSize: 15,
        color: "#1f2937",
        lineHeight: 22,
        marginBottom: 10
    },
    infoGrid: {
        gap: 4
    },
    infoItem: {
        color: "#4b5563",
        fontSize: 13
    },
    input: {
        borderWidth: 1,
        borderColor: "#d1d5db",
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
        marginTop: 8
    },
    rowBetween: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 6
    },
    boPhan: {
        color: "#374151",
        fontSize: 13
    },
    deadline: {
        color: "#e67e22",
        fontWeight: "600"
    },
    row: {
        flexDirection: "row",
        gap: 8
    },
    levelChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "#d1d5db"
    },
    levelChipActive: {
        backgroundColor: "#2563eb",
        borderColor: "#2563eb"
    },
    levelText: {
        color: "#111827",
        fontWeight: "600"
    },
    levelTextActive: {
        color: "#fff"
    },
    rowBlock: {
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 10,
        padding: 10,
        marginBottom: 10
    },
    rowLabel: {
        fontWeight: "600",
        color: "#1f2937"
    },
    cardHeaderRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 6
    },
    table: {
        backgroundColor: "#fff",
        borderRadius: 12,
        marginTop: 8,
        overflow: "hidden"
    },
    xuLyRow: {
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderTopWidth: 1,
        borderColor: "#eee",
        backgroundColor: "#fff"
    },
    noiDung: {
        fontSize: 16,
        fontWeight: "600",
        color: "#374151"
    },
    addActionBtn: {
        backgroundColor: "#eff6ff",
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: "#bfdbfe"
    },
    addActionBtnText: {
        color: "#2563eb",
        fontWeight: "700",
        fontSize: 12
    },
    costBtn: {
        marginTop: 12,
        backgroundColor: "#2d8cff",
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: "center"
    },
    actionAddBtn: {
        marginTop: 12,
        backgroundColor: "#2d8cff",
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: "center"
    },
    btnText: {
        color: "#fff",
        fontWeight: "700"
    },
    actionRow: {
        flexDirection: "row",
        gap: 10
    },
    confirmLevelBtn: {
        marginTop: 12,
        backgroundColor: "#2563eb",
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: "center"
    },
    confirmedText: {
        marginTop: 10,
        color: "#059669",
        fontWeight: "700"
    },
    primaryBtn: {
        backgroundColor: "#2563eb",
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: "center",
        marginBottom: 12,
        flex: 1
    },
    successBtn: {
        backgroundColor: "#059669",
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: "center",
        marginBottom: 12
    },
    primaryText: {
        color: "#fff",
        fontWeight: "700"
    },
    emptyText: {
        color: "#6b7280",
        fontStyle: "italic"
    },
    stepRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        borderBottomWidth: 1,
        borderBottomColor: "#f3f4f6",
        paddingVertical: 8
    },
    okText: {
        color: "#059669",
        fontWeight: "700"
    },
    waitText: {
        color: "#d97706",
        fontWeight: "700"
    }
});
