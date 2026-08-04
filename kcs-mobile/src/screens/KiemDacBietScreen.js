import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator
} from "react-native";
import KeyboardFormScrollView from "../components/KeyboardFormScrollView";
import { getThongSoKq, saveThongSoKq } from "../api/phieuKiem.api";

export default function KiemDacBietScreen({ route, navigation }) {
    const { phieuId, trangThai } = route.params;

    // Chỉ cho phép chỉnh sửa khi phư kiết quả đang ở trạng thái kiểm (DANG_KIEM)
    const isReadOnly = trangThai !== "DANG_KIEM" && trangThai !== "DA_TAO_SECTION";

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [thongSoList, setThongSoList] = useState([]);

    // Matrix of results: { [thongSoId]: { [thuTuMau]: { GiaTriDo: "", GhiChu: "" } } }
    const [resultsMatrix, setResultsMatrix] = useState({});
    const [sampleCount, setSampleCount] = useState(13); // Default 13 samples as in the image

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const res = await getThongSoKq(phieuId);

            const thongSo = res.data.thongSo || [];
            const ketQua = res.data.ketQua || [];

            setThongSoList(thongSo);

            // Xây dựng ma trận kết quả
            let matrix = {};

            // Khởi tạo ma trận rỗng
            thongSo.forEach(ts => {
                matrix[ts.Id] = {};
                for (let i = 1; i <= sampleCount; i++) {
                    matrix[ts.Id][i] = { GiaTriDo: "", GhiChu: "" };
                }
            });

            // Điền kết quả đã lưu vào ma trận
            let maxSampleIndex = 13;
            ketQua.forEach(kq => {
                if (!matrix[kq.ThongSoId]) {
                    matrix[kq.ThongSoId] = {};
                }
                matrix[kq.ThongSoId][kq.ThuTuMau] = {
                    GiaTriDo: kq.GiaTriDo !== null ? String(kq.GiaTriDo) : "",
                    GhiChu: kq.GhiChu || ""
                };
                if (kq.ThuTuMau > maxSampleIndex) {
                    maxSampleIndex = kq.ThuTuMau;
                }
            });

            if (maxSampleIndex > sampleCount) {
                setSampleCount(maxSampleIndex);
            }

            setResultsMatrix(matrix);
        } catch (error) {
            console.error(error);
            Alert.alert("Lỗi", "Không thể tải dữ liệu kiểm đặc biệt");
        } finally {
            setLoading(false);
        }
    };

    const handleValueChange = (tsId, sampleIdx, value) => {
        setResultsMatrix(prev => ({
            ...prev,
            [tsId]: {
                ...prev[tsId],
                [sampleIdx]: {
                    ...prev[tsId]?.[sampleIdx],
                    GiaTriDo: value
                }
            }
        }));
    };

    const checkStatus = (tsId, valueStr) => {
        if (!valueStr) return null;
        const val = parseFloat(valueStr);
        if (isNaN(val)) return null;

        const ts = thongSoList.find(x => x.Id === tsId);
        if (!ts) return null;

        const giaTriChuan = parseFloat(ts.GiaTriChuan); // Mặc dù là chuỗi, có thể có chữ cái, ta thử ép kiểu. Nếu ko phải số (vd: "H330"), quy tắc đánh giá có thể khó.
        // Tạm thời, nếu GiaTriChuan có text như 'H330', ta sẽ lấy số bằng regex
        const numMatch = String(ts.GiaTriChuan).match(/[-+]?[0-9]*\.?[0-9]+/);
        if (!numMatch) return null;

        const standardVal = parseFloat(numMatch[0]);
        const min = standardVal - ts.DungSaiAm;
        const max = standardVal + ts.DungSaiDuong;

        return (val >= min && val <= max) ? "DAT" : "KHONG_DAT";
    };

    const isAnyFailed = () => {
        for (const tsId in resultsMatrix) {
            for (const sampleIdx in resultsMatrix[tsId]) {
                const val = resultsMatrix[tsId][sampleIdx].GiaTriDo;
                if (val && checkStatus(parseInt(tsId), val) === "KHONG_DAT") {
                    return true;
                }
            }
        }
        return false;
    };

    const handleSave = async () => {
        try {
            setSaving(true);

            const hasFailed = isAnyFailed();

            // Prepare payload
            const payload = [];
            for (const tsId in resultsMatrix) {
                for (const sampleIdx in resultsMatrix[tsId]) {
                    const data = resultsMatrix[tsId][sampleIdx];
                    if (data.GiaTriDo !== "") {
                        payload.push({
                            ThongSoId: parseInt(tsId),
                            ThuTuMau: parseInt(sampleIdx),
                            GiaTriDo: data.GiaTriDo,
                            GhiChu: data.GhiChu
                        });
                    }
                }
            }

            await saveThongSoKq(phieuId, payload);

            if (hasFailed) {
                Alert.alert("Cảnh báo", "Có giá trị KHÔNG ĐẠT. Phiếu này sẽ bị đánh dấu Không Đạt.", [
                    { text: "OK", onPress: () => navigation.goBack() }
                ]);
            } else {
                Alert.alert("Thành công", "Đã lưu kết quả đo đạc", [
                    { text: "OK", onPress: () => navigation.goBack() }
                ]);
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Lỗi", "Không thể lưu kết quả");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    if (thongSoList.length === 0) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                <Text>Không có thông số kỹ thuật đặc biệt nào được cấu hình cho sản phẩm này.</Text>
            </View>
        );
    }

    // Lấy danh sách mẫu (1..13)
    const sampleIndices = Array.from({ length: sampleCount }, (_, i) => i + 1);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>KẾT QUẢ KIỂM THEO CẤP ĐỘ ĐẶC BIỆT</Text>
            </View>

            {/* Scroll ngang để xem nhiều cột thông số */}
            <ScrollView horizontal style={styles.tableContainer} keyboardShouldPersistTaps="handled">
                {/* Scroll dọc để xem 13 hàng mẫu */}
                <KeyboardFormScrollView
                    style={{ flex: 1 }}
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Header Row */}
                    <View style={styles.row}>
                        <View style={[styles.cell, styles.headerCell, { width: 60 }]}>
                            <Text style={styles.headerText}>Thứ tự{"\n"}mẫu</Text>
                        </View>
                        {thongSoList.map((ts) => (
                            <View key={ts.Id} style={[styles.cell, styles.headerCell, { width: 120 }]}>
                                <Text style={styles.headerText}>{ts.NhomThongSo || ts.TenThongSo}</Text>
                                <Text style={styles.subHeaderText}>
                                    {ts.GiaTriChuan}
                                    {ts.DungSaiAm === ts.DungSaiDuong
                                        ? `±${ts.DungSaiAm}`
                                        : `(-${ts.DungSaiAm}/+${ts.DungSaiDuong})`}
                                </Text>
                            </View>
                        ))}
                    </View>

                    {/* Data Rows – mỗi mẫu 1 dòng */}
                    {sampleIndices.map(sampleIdx => (
                        <View key={`sample-${sampleIdx}`} style={styles.row}>
                            <View style={[styles.cell, { width: 60, backgroundColor: "#f8fafc" }]}>
                                <Text style={{ textAlign: "center", fontWeight: "bold" }}>
                                    {String(sampleIdx).padStart(2, '0')}
                                </Text>
                            </View>
                            {thongSoList.map(ts => {
                                const value = resultsMatrix[ts.Id]?.[sampleIdx]?.GiaTriDo || "";
                                const status = checkStatus(ts.Id, value);

                                return (
                                    <View key={`${ts.Id}-${sampleIdx}`} style={[styles.cell, { width: 120 }]}>
                                        <TextInput
                                            style={[
                                                styles.input,
                                                status === "KHONG_DAT" && styles.inputError,
                                                status === "DAT" && styles.inputSuccess,
                                                isReadOnly && styles.inputReadOnly
                                            ]}
                                            keyboardType="default"
                                            value={value}
                                            onChangeText={(val) => handleValueChange(ts.Id, sampleIdx, val)}
                                            placeholder="-"
                                            placeholderTextColor="#cbd5e1"
                                            editable={!isReadOnly}
                                        />
                                    </View>
                                );
                            })}
                        </View>
                    ))}
                </KeyboardFormScrollView>
            </ScrollView>

            {isReadOnly ? (
                <View style={styles.readOnlyNotice}>
                    <Text style={styles.readOnlyText}>
                        Kết quả đã được xác nhận.
                    </Text>
                </View>
            ) : (
                <TouchableOpacity
                    style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                    onPress={handleSave}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.saveText}>Lưu kết quả</Text>
                    )}
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
        padding: 10
    },
    header: {
        marginBottom: 10,
        alignItems: "center"
    },
    title: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#0f172a",
        textAlign: "center"
    },
    tableContainer: {
        flex: 1,
        borderWidth: 1,
        borderColor: "#cbd5e1"
    },
    row: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#cbd5e1"
    },
    cell: {
        borderRightWidth: 1,
        borderRightColor: "#cbd5e1",
        justifyContent: "center",
        alignItems: "center",
        padding: 5,
        height: 48
    },
    headerCell: {
        backgroundColor: "#f1f5f9",
        height: 56
    },
    headerText: {
        fontWeight: "bold",
        fontSize: 12,
        textAlign: "center",
        color: "#334155"
    },
    subHeaderText: {
        fontSize: 11,
        textAlign: "center",
        color: "#64748b",
        marginTop: 2
    },
    input: {
        width: "100%",
        height: 40,
        textAlign: "center",
        fontSize: 14,
        padding: 0
    },
    inputError: {
        backgroundColor: "#fee2e2",
        color: "#ef4444",
        fontWeight: "bold"
    },
    inputSuccess: {
        color: "#22c55e",
        fontWeight: "bold"
    },
    inputReadOnly: {
        backgroundColor: "#f1f5f9",
        color: "#94a3b8"
    },
    readOnlyNotice: {
        backgroundColor: "#fef9c3",
        padding: 14,
        borderRadius: 12,
        alignItems: "center",
        marginTop: 15,
        borderWidth: 1,
        borderColor: "#fde047"
    },
    readOnlyText: {
        color: "#854d0e",
        fontWeight: "600",
        fontSize: 14
    },
    saveBtn: {
        backgroundColor: "#2563eb",
        padding: 16,
        borderRadius: 12,
        alignItems: "center",
        marginTop: 15
    },
    saveText: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 16
    }
});
