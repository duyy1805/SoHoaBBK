// src/screens/PhieuListScreen.jsx

import { useState, useCallback, useMemo } from "react";
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    RefreshControl,
    TextInput,
    KeyboardAvoidingView,
    Platform
} from "react-native";
import { useFocusEffect } from '@react-navigation/native';
import { getMyPhieuKiem } from "../api/phieuKiem.api";

export default function PhieuListScreen({ navigation }) {
    const [data, setData] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [searchText, setSearchText] = useState("");

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const truncate = (text, max = 30) => {
        if (!text) return "";
        return text.length > max ? text.slice(0, max) + "..." : text;
    };
    const loadData = async () => {
        try {
            const res = await getMyPhieuKiem();
            setData(res.data || []);
        } catch (err) {
            console.log(err);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    }, []);

    const getStatusStyle = (item) => {
        const status = item?.TrangThai;
        switch (status) {
            case "TAO_MOI":
                return { backgroundColor: "#e0f2fe", color: "#0369a1", text: "Chưa kiểm" };
            case "HOAN_THANH":
                return { backgroundColor: "#d1fae5", color: "#047857", text: "Hoàn thành" };

            case "HOAN_TAT":
                return { backgroundColor: "#d1fae5", color: "#047857", text: "Hoàn tất" };

            case "DANG_KIEM":
                return { backgroundColor: "#fef9c3", color: "#a16207", text: "Đang kiểm" };

            case "CHO_TBP_DUYET":
                return { backgroundColor: "#ede9fe", color: "#6d28d9", text: "Chờ Trưởng bộ phận" };

            case "DA_TAO_SECTION":
                return { backgroundColor: "#e0f2fe", color: "#0369a1", text: "Đang kiểm" };

            case "CHO_XUONG_XAC_NHAN":
                return {
                    backgroundColor: "#fef3c7",
                    color: "#b45309",
                    text: item?.LoaiKiemId === 4 ? "Chờ Kho" : "Chờ Trưởng bộ phận"
                };

            case "CHO_KHO_XAC_NHAN":
                return { backgroundColor: "#dbeafe", color: "#1d4ed8", text: "Chờ Kho" };

            case "CHO_KIEM_NGHIEM":
                return { backgroundColor: "#fef3c7", color: "#b45309", text: "Chờ Trưởng bộ phận" };

            default:
                return { backgroundColor: "#e2e8f0", color: "#475569", text: status };
        }
    };

    const normalizeSearchText = (value) =>
        String(value || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/đ/g, "d")
            .replace(/Đ/g, "D")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, " ")
            .trim();

    const normalizeCompactText = (value) =>
        normalizeSearchText(value).replace(/\s+/g, "");

    const formatDateVariants = (value) => {
        if (!value) return [];
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return [];
        const dd = String(date.getDate()).padStart(2, "0");
        const mm = String(date.getMonth() + 1).padStart(2, "0");
        const yyyy = String(date.getFullYear());
        return [
            `${dd}/${mm}/${yyyy}`,
            `${dd}-${mm}-${yyyy}`,
            `${dd}${mm}${yyyy}`,
            `${dd}/${mm}/${yyyy.slice(-2)}`,
            `${dd}${mm}${yyyy.slice(-2)}`
        ];
    };

    const getSearchDocument = (item) => {
        const statusStyle = getStatusStyle(item);
        const values = [
            item.SoPhieu,
            item.Lot,
            item.MaSanPham,
            item.TenSanPham,
            item.TenLoaiKiem,
            item.DoiTuong,
            item.TenNguoiKiem,
            item.SoLuong,
            item.TrangThai,
            statusStyle.text,
            ...formatDateVariants(item.Ngay_Giao),
            ...formatDateVariants(item.CreatedAt),
            ...formatDateVariants(item.NgayKiem)
        ];
        return values.filter(v => v !== undefined && v !== null && v !== "").join(" ");
    };

    const getSearchScore = (item, rawQuery) => {
        const query = normalizeSearchText(rawQuery);
        if (!query) return 1;

        const tokens = query.split(/\s+/).filter(Boolean);
        const document = normalizeSearchText(getSearchDocument(item));
        const compactDocument = normalizeCompactText(getSearchDocument(item));
        const compactQuery = normalizeCompactText(rawQuery);

        if (!tokens.every(token => document.includes(token) || compactDocument.includes(token))) {
            return 0;
        }

        let score = 10;
        const soPhieu = normalizeSearchText(item.SoPhieu);
        const soPhieuCompact = normalizeCompactText(item.SoPhieu);
        const maSP = normalizeSearchText(item.MaSanPham);
        const tenSP = normalizeSearchText(item.TenSanPham);

        if (soPhieu === query || soPhieuCompact === compactQuery) score += 100;
        else if (soPhieu.includes(query) || soPhieuCompact.includes(compactQuery)) score += 70;
        if (maSP.includes(query)) score += 40;
        if (tenSP.includes(query)) score += 25;
        if (document.includes(query)) score += 15;

        tokens.forEach(token => {
            if (soPhieu.includes(token) || soPhieuCompact.includes(token)) score += 12;
            if (maSP.includes(token)) score += 8;
            if (tenSP.includes(token)) score += 5;
        });

        return score;
    };

    const filteredData = useMemo(() => {
        const query = searchText.trim();
        if (!query) return data || [];

        return (data || [])
            .map((item, index) => ({
                item,
                index,
                score: getSearchScore(item, query)
            }))
            .filter(result => result.score > 0)
            .sort((a, b) => b.score - a.score || a.index - b.index)
            .map(result => result.item);
    }, [data, searchText]);

    const renderItem = ({ item }) => {
        const statusStyle = getStatusStyle(item);
        return (
            <TouchableOpacity
                style={styles.card}
                activeOpacity={0.8}
                onPress={() => {
                    if (item.LoaiKiemId === 3) {
                        navigation.navigate("CuoiChuyenInspection", { id: item.Id });
                    } else if (item.LoaiKiemId === 4) {
                        navigation.navigate("SxbtInspection", { id: item.Id });
                    } else if (item.LoaiKiemId === 6) {
                        navigation.navigate("TrenChuyenInspection", { id: item.Id });
                    } else {
                        navigation.navigate("PhieuDetail", { id: item.Id });
                    }
                }}
            >
                <View style={styles.header}>
                    <Text style={styles.soPhieu}>{item.SoPhieu}</Text>
                    <View
                        style={[
                            styles.badge,
                            { backgroundColor: statusStyle.backgroundColor }
                        ]}
                    >
                        <Text style={[styles.badgeText, { color: statusStyle.color }]}>
                            {statusStyle.text}
                        </Text>
                    </View>
                </View>

                <Text style={styles.lot}>LOT: {item.Lot}</Text>

                <View style={styles.divider} />

                <View style={styles.infoRow}>
                    <Text style={styles.label}>Loại kiểm</Text>
                    <Text style={styles.value}>{item.TenLoaiKiem}</Text>
                </View>

                <View style={styles.infoRow}>
                    <Text style={styles.label}>Itemcode</Text>
                    <Text style={styles.value}>{item.MaSanPham}</Text>
                </View>

                <View style={styles.infoRow}>
                    <Text style={styles.label}>Quy cách</Text>
                    <Text
                        style={styles.value}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                    >
                        {truncate(item.TenSanPham)}
                    </Text>
                </View>
                {item.Ngay_Giao && (
                    <View style={styles.infoRow}>
                        <Text style={styles.label}>Ngày giao</Text>
                        <Text style={styles.value}>
                            {new Date(item.Ngay_Giao).toLocaleDateString("vi-VN")}
                        </Text>
                    </View>
                )}
                <View style={styles.infoRow}>
                    <Text style={styles.label}>KH / TT / Hiệu lực</Text>
                    <Text style={styles.value}>
                        {item.SoLuongKeHoach ?? item.SoLuong ?? 0} / {item.SoLuongThucTe == null ? "Chưa nhập" : item.SoLuongThucTe} / {item.SoLuongHieuLuc ?? item.SoLuong ?? 0}
                    </Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.label}>Nơi đến</Text>
                    <Text style={styles.value}>{item.DoiTuong}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.label}>Người kiểm</Text>
                    <Text style={styles.value}>{item.TenNguoiKiem}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    const renderEmpty = () => (
        <View style={styles.empty}>
            <Text style={styles.emptyText}>
                {searchText.trim() ? "Không tìm thấy phiếu phù hợp" : "Không có phiếu kiểm"}
            </Text>
            {searchText.trim() ? (
                <Text style={styles.emptyHint}>Thử tìm bằng số phiếu, itemcode, lot, người kiểm hoặc ngày.</Text>
            ) : null}
        </View>
    );

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            <StatusBar barStyle="dark-content" />

            <FlatList
                data={filteredData}
                keyExtractor={(item) => item.Id.toString()}
                renderItem={renderItem}
                ListEmptyComponent={renderEmpty}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                contentContainerStyle={{ padding: 16 }}
            />

            <View style={styles.searchContainer}>
                <View style={styles.searchHeader}>
                    <Text style={styles.searchTitle}>Tìm kiếm phiếu</Text>
                    {searchText.trim() ? (
                        <Text style={styles.searchCount}>{filteredData.length}/{data.length}</Text>
                    ) : null}
                </View>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Số phiếu, itemcode, quy cách, lot, ngày..."
                    value={searchText}
                    onChangeText={setSearchText}
                    clearButtonMode="while-editing"
                    autoCapitalize="none"
                    autoCorrect={false}
                />
                {searchText.trim() ? (
                    <TouchableOpacity style={styles.clearSearchBtn} onPress={() => setSearchText("")}>
                        <Text style={styles.clearSearchText}>Xóa tìm kiếm</Text>
                    </TouchableOpacity>
                ) : (
                    <Text style={styles.searchHint}>Có thể tìm không dấu, không cần gạch/khoảng trắng trong số phiếu.</Text>
                )}
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f1f5f9"
    },
    searchContainer: {
        padding: 12,
        backgroundColor: "#ffffff",
        borderTopWidth: 1,
        borderTopColor: "#e2e8f0",
        paddingBottom: 24
    },
    searchHeader: {
        marginHorizontal: 12,
        marginBottom: 8,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between"
    },
    searchTitle: {
        fontSize: 13,
        fontWeight: "700",
        color: "#334155"
    },
    searchCount: {
        fontSize: 12,
        fontWeight: "700",
        color: "#2563eb",
        backgroundColor: "#eff6ff",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        overflow: "hidden"
    },
    searchInput: {
        backgroundColor: "#f1f5f9",
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 10,
        marginHorizontal: 12,
        fontSize: 15,
        color: "#1e293b",
        borderWidth: 1,
        borderColor: "#cbd5e1",
    },
    searchHint: {
        marginHorizontal: 12,
        marginTop: 6,
        fontSize: 11,
        color: "#94a3b8"
    },
    clearSearchBtn: {
        alignSelf: "flex-end",
        marginTop: 8,
        marginRight: 12,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: "#f8fafc",
        borderWidth: 1,
        borderColor: "#e2e8f0"
    },
    clearSearchText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#475569"
    },
    card: {
        backgroundColor: "#ffffff",
        padding: 18,
        borderRadius: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center"
    },
    soPhieu: {
        fontWeight: "bold",
        fontSize: 17,
        color: "#0f172a"
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20
    },
    badgeText: {
        fontSize: 12,
        fontWeight: "600"
    },
    lot: {
        marginTop: 8,
        fontWeight: "600",
        color: "#334155"
    },
    divider: {
        height: 1,
        backgroundColor: "#e2e8f0",
        marginVertical: 10
    },
    infoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 6
    },
    label: {
        color: "#64748b",
        fontSize: 13
    },
    value: {
        color: "#1e293b",
        fontWeight: "500"
    },
    empty: {
        alignItems: "center",
        marginTop: 80
    },
    emptyText: {
        color: "#94a3b8",
        fontSize: 15,
        fontWeight: "700"
    },
    emptyHint: {
        marginTop: 8,
        color: "#94a3b8",
        fontSize: 12,
        textAlign: "center",
        paddingHorizontal: 32,
        lineHeight: 18
    }
});
