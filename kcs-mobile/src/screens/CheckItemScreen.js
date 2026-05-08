import { useState, useEffect } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    TextInput,
    StyleSheet,
    Alert,
    ActivityIndicator,
    Modal,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Image
} from "react-native";
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import {
    saveCheckItem,
    getDefectList,
    uploadImages
} from "../api/phieuKiem.api";

export default function CheckItemScreen({ route, navigation }) {

    const { item } = route.params;

    const [ketQua, setKetQua] = useState(item.KetQua || null);
    const [giaTriDo, setGiaTriDo] = useState(item.GiaTriDo || "");

    const [defects, setDefects] = useState([]);
    const [selectedDefects, setSelectedDefects] = useState([]);

    const [searchText, setSearchText] = useState("");
    const [filteredDefects, setFilteredDefects] = useState([]);

    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);

    // State cho việc xem trước ảnh
    const [previewUri, setPreviewUri] = useState(null);
    const [isPreviewVisible, setIsPreviewVisible] = useState(false);

    const BASE_URL = "https://z76api.z76.vn";
    useEffect(() => {
        loadDefects();
        if (item.Defects && item.Defects.length > 0) {
            const mapped = item.Defects.map(d => ({
                defectId: d.DefectId,
                MaLoi: d.MaLoi,
                TenLoi: d.TenLoi,
                DefectType: d.DefectType,
                soLuong: d.SoLuong,
                savedImages: d.ImageUrls ? d.ImageUrls : [], // Ảnh cũ từ DB
                localImages: [] // Ảnh mới chuẩn bị chụp
            }));
            setSelectedDefects(mapped);
        }
    }, []);

    useEffect(() => {

        if (!searchText) {
            setFilteredDefects(defects);
            return;
        }

        const keyword = searchText.toLowerCase();

        const filtered = defects.filter((d) =>
            d.MaLoi.toLowerCase().includes(keyword) ||
            d.TenLoi.toLowerCase().includes(keyword) ||
            d.DefectType.toLowerCase().includes(keyword)
        );

        setFilteredDefects(filtered);

    }, [searchText, defects]);

    const handlePickImage = async (index) => {
        Alert.alert(
            "Thêm hình ảnh",
            "Chọn nguồn ảnh",
            [
                {
                    text: "Chụp ảnh",
                    onPress: async () => {
                        try {
                            const { status } = await ImagePicker.requestCameraPermissionsAsync();
                            if (status !== 'granted') {
                                Alert.alert("Lỗi", "Bạn cần cấp quyền camera để chụp ảnh.");
                                return;
                            }

                            const result = await ImagePicker.launchCameraAsync({
                                mediaTypes: 'images',
                                quality: 0.7,
                            });

                            if (!result.canceled) {
                                const newUri = result.assets[0].uri;
                                setSelectedDefects(prev => prev.map((d, i) =>
                                    i === index
                                        ? { ...d, localImages: [...(d.localImages || []), newUri] }
                                        : d
                                ));
                            }
                        } catch (error) {
                            console.error("Camera Error:", error);
                            Alert.alert("Lỗi", "Không thể mở camera.");
                        }
                    }
                },
                {
                    text: "Chọn từ thư viện",
                    onPress: async () => {
                        try {
                            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                            if (status !== 'granted') {
                                Alert.alert("Lỗi", "Bạn cần cấp quyền truy cập thư viện để chọn ảnh.");
                                return;
                            }

                            const result = await ImagePicker.launchImageLibraryAsync({
                                mediaTypes: 'images',
                                quality: 0.7,
                            });

                            if (!result.canceled) {
                                const newUri = result.assets[0].uri;
                                setSelectedDefects(prev => prev.map((d, i) =>
                                    i === index
                                        ? { ...d, localImages: [...(d.localImages || []), newUri] }
                                        : d
                                ));
                            }
                        } catch (error) {
                            console.error("Library Error:", error);
                            Alert.alert("Lỗi", "Không thể mở thư viện ảnh.");
                        }
                    }
                },
                {
                    text: "Hủy",
                    style: "cancel"
                }
            ]
        );
    };

    // Hàm mở xem trước ảnh
    const handlePreviewImage = (uri) => {
        setPreviewUri(uri);
        setIsPreviewVisible(true);
    };

    // Hàm xoá ảnh đã chụp mới
    const removeLocalImage = (defectIndex, imgIndex) => {
        const updated = [...selectedDefects];
        updated[defectIndex].localImages.splice(imgIndex, 1);
        setSelectedDefects(updated);
    };

    // Hàm xoá ảnh cũ đã lưu trên DB
    const removeSavedImage = (defectIndex, imgIndex) => {
        const updated = [...selectedDefects];
        updated[defectIndex].savedImages.splice(imgIndex, 1);
        setSelectedDefects(updated);
    };

    const loadDefects = async () => {

        try {

            const res = await getDefectList(searchText || null);
            const data = res.data || [];

            setDefects(data);
            setFilteredDefects(data);

        } catch (err) {

            console.log(err);

        }

    };

    const handleAddDefect = (d) => {

        const exists = selectedDefects.find(x => x.defectId === d.Id);

        if (exists) {
            Alert.alert("Thông báo", "Lỗi đã được chọn");
            return;
        }

        setSelectedDefects(prev => [
            ...prev,
            {
                defectId: d.Id,
                MaLoi: d.MaLoi,
                TenLoi: d.TenLoi,
                MoTa: d.MoTa,
                GhiChu: d.GhiChu,
                DefectType: d.DefectType,
                soLuong: 1
            }
        ]);

        setShowModal(false);
        setSearchText("");

    };

    const updateQty = (index, value) => {

        const updated = [...selectedDefects];
        updated[index].soLuong = Number(value) || 0;

        setSelectedDefects(updated);

    };

    const removeDefect = (defectId) => {

        setSelectedDefects(
            selectedDefects.filter(x => x.defectId !== defectId)
        );

    };

    const handleSave = async () => {
        if (!ketQua) return Alert.alert("Thiếu thông tin", "Vui lòng chọn kết quả");
        if (ketQua === "KHONG_DAT" && selectedDefects.length === 0) return Alert.alert("Thiếu thông tin", "Chọn ít nhất 1 lỗi");

        try {
            setLoading(true);

            // Tạo bản sao sâu để tránh mutation state
            let finalDefects = selectedDefects.map(d => ({
                ...d,
                imageUrls: d.savedImages ? [...d.savedImages] : []
            }));

            if (ketQua === "KHONG_DAT") {
                for (let i = 0; i < finalDefects.length; i++) {
                    const defect = finalDefects[i];

                    // Nếu có ảnh MỚI chụp, mang đi upload
                    if (defect.localImages && defect.localImages.length > 0) {
                        const formData = new FormData();
                        defect.localImages.forEach((uri) => {
                            const filename = uri.split('/').pop();
                            const match = /\.(\w+)$/.exec(filename);
                            const type = match ? `image/${match[1]}` : `image/jpeg`;
                            formData.append('images', { uri, name: filename, type });
                        });

                        const uploadRes = await uploadImages(formData);
                        const newUploadedUrls = uploadRes.data?.filePaths || [];

                        // GỘP MẢNG: [Ảnh cũ user chưa xoá] + [Ảnh mới vừa upload]
                        finalDefects[i].imageUrls = [...finalDefects[i].imageUrls, ...newUploadedUrls];
                    }
                }
            }

            // Gọi API lưu (Gửi lên data đã gộp)
            await saveCheckItem({
                checkItemId: Number(item.Id),
                ketQua,
                defects: finalDefects.map(d => ({
                    defectId: d.defectId,
                    soLuong: d.soLuong,
                    imageUrls: d.imageUrls
                })),
                giaTriDo: giaTriDo
            });

            Alert.alert("Thành công", "Đã lưu kết quả");
            navigation.goBack();

        } catch (err) {
            console.error("Save Error:", err);
            const errMsg = err?.response?.data?.message || "Không thể lưu dữ liệu";
            Alert.alert("Lỗi", errMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: "#f1f5f9" }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        >
            <ScrollView
                style={styles.scrollContainer}
                contentContainerStyle={styles.container}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.title}>{item.TenMucKiem}</Text>

                {/* info */}
                <View style={styles.infoCard}>
                    <View style={styles.infoRow}>
                        <Text style={styles.label}>Tham chiếu</Text>
                        <Text style={styles.value}>{item.ThamChieu || "--"}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.label}>Phương pháp</Text>
                        <Text style={styles.value}>{item.PhuongPhapKiem || "--"}</Text>
                    </View>
                </View>

                <View style={styles.standardCard}>
                    <Text style={styles.standardTitle}>Tiêu chuẩn kỹ thuật</Text>
                    <Text style={styles.standard}>{item.TieuChuan}</Text>
                </View>

                {/* chọn kết quả */}
                <View style={styles.row}>
                    <TouchableOpacity
                        style={[styles.option, ketQua === "DAT" && styles.success]}
                        onPress={() => {
                            setKetQua("DAT");
                            setSelectedDefects([]);
                        }}
                    >
                        <Text style={styles.optionText}>Đạt</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.option, ketQua === "KHONG_DAT" && styles.error]}
                        onPress={() => setKetQua("KHONG_DAT")}
                    >
                        <Text style={styles.optionText}>Không đạt</Text>
                    </TouchableOpacity>
                </View>

                {/* defects */}
                {ketQua === "KHONG_DAT" && (
                    <>
                        <TouchableOpacity
                            style={styles.selectBox}
                            onPress={() => setShowModal(true)}
                        >
                            <Text style={styles.selectText}>+ Thêm lỗi</Text>
                        </TouchableOpacity>

                        {selectedDefects.map((d, index) => (
                            <View key={index} style={{ backgroundColor: "#fff", padding: 12, borderRadius: 12, marginBottom: 8 }}>
                                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.defectCode}>{d.MaLoi}</Text>
                                        <Text style={styles.defectName}>{d.TenLoi}</Text>
                                        {d.MoTa && (
                                            <Text style={styles.defectDesc}>{d.MoTa}</Text>
                                        )}
                                        {d.GhiChu && (
                                            <View style={styles.noteBox}>
                                                <Ionicons name="information-circle-outline" size={12} color="#2563eb" />
                                                <Text style={styles.noteText}>{d.GhiChu}</Text>
                                            </View>
                                        )}
                                    </View>

                                    <TextInput
                                        style={styles.qtyInput}
                                        keyboardType="numeric"
                                        value={String(d.soLuong)}
                                        onChangeText={(val) => updateQty(index, val)}
                                    />

                                    <TouchableOpacity onPress={() => handlePickImage(index)} style={{ marginHorizontal: 15 }}>
                                        <Ionicons name="image-outline" size={24} color="#2563eb" />
                                    </TouchableOpacity>

                                    <TouchableOpacity onPress={() => removeDefect(d.defectId)}>
                                        <Text style={{ color: "#ef4444", fontWeight: "bold", fontSize: 18 }}>X</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* CONTAINER CHỨA ẢNH: Hiển thị nhiều ảnh trên 1 dòng */}
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>

                                    {/* RENDER ẢNH ĐÃ LƯU */}
                                    {d.savedImages?.map((url, imgIndex) => (
                                        <View key={`saved-${imgIndex}`} style={{ marginRight: 12, marginBottom: 12, position: 'relative' }}>
                                            <TouchableOpacity onPress={() => handlePreviewImage(`${BASE_URL}${url}`)}>
                                                <Image
                                                    source={{ uri: `${BASE_URL}${url}` }}
                                                    style={{ width: 60, height: 60, borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1' }}
                                                />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={{ position: 'absolute', top: -8, right: -8, backgroundColor: 'white', borderRadius: 12, zIndex: 1 }}
                                                onPress={() => removeSavedImage(index, imgIndex)}
                                            >
                                                <Ionicons name="close-circle" size={22} color="#ef4444" />
                                            </TouchableOpacity>
                                        </View>
                                    ))}

                                    {/* RENDER ẢNH MỚI (CHƯA LƯU) */}
                                    {d.localImages?.map((uri, imgIndex) => (
                                        <View key={`local-${imgIndex}`} style={{ marginRight: 12, marginBottom: 12, position: 'relative' }}>
                                            <TouchableOpacity onPress={() => handlePreviewImage(uri)}>
                                                <Image
                                                    source={{ uri }}
                                                    style={{ width: 60, height: 60, borderRadius: 8 }}
                                                />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={{ position: 'absolute', top: -8, right: -8, backgroundColor: 'white', borderRadius: 12, zIndex: 1 }}
                                                onPress={() => removeLocalImage(index, imgIndex)}
                                            >
                                                <Ionicons name="close-circle" size={22} color="#ef4444" />
                                            </TouchableOpacity>
                                        </View>
                                    ))}

                                </View>
                            </View>
                        ))}
                    </>
                )}

                {/* Nhập giá trị đo thực tế */}
                <View style={{ backgroundColor: "#fff", padding: 14, borderRadius: 14, marginTop: 10, marginBottom: 5 }}>
                    <Text style={{ fontWeight: "600", color: "#0f172a", marginBottom: 8 }}>
                        Kết quả đo thực tế (Các giá trị cách nhau bằng dấu cách)
                    </Text>
                    <TextInput
                        style={{
                            backgroundColor: "#f8fafc",
                            padding: 12,
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: "#e2e8f0",
                            minHeight: 80,
                            textAlignVertical: "top",
                            color: "#0f172a",
                            fontSize: 15
                        }}
                        multiline
                        placeholder="Ví dụ: 100 102.5 98 101..."
                        value={giaTriDo}
                        onChangeText={setGiaTriDo}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.saveBtn, loading && { opacity: 0.6 }]}
                    onPress={handleSave}
                    disabled={loading}
                >
                    {loading
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={styles.saveText}>Lưu kết quả</Text>
                    }
                </TouchableOpacity>
            </ScrollView>

            {/* modal chọn lỗi */}
            <Modal visible={showModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        style={styles.modalContent}
                    >
                        <Text style={styles.modalTitle}>Chọn lỗi</Text>

                        <TextInput
                            placeholder="Tìm mã lỗi / tên lỗi..."
                            value={searchText}
                            onChangeText={setSearchText}
                            style={styles.searchInput}
                        />

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {filteredDefects.length === 0 ? (
                                <View style={{ padding: 20, alignItems: 'center' }}>
                                    <Ionicons name="search-outline" size={40} color="#cbd5e1" />
                                    <Text style={{ color: "#94a3b8", marginTop: 8 }}>Không tìm thấy mã lỗi phù hợp</Text>
                                </View>
                            ) : (
                                filteredDefects.map((d) => {
                                    const typeColor = d.DefectType === 'CRITICAL' ? '#ef4444' : d.DefectType === 'MAJOR' ? '#f59e0b' : '#3b82f6';
                                    return (
                                        <TouchableOpacity
                                            key={d.Id}
                                            style={styles.defectItem}
                                            onPress={() => handleAddDefect(d)}
                                        >
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <View style={{ flex: 1 }}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                                        <View style={[styles.typeBadge, { backgroundColor: typeColor }]}>
                                                            <Text style={styles.typeBadgeText}>{d.DefectType}</Text>
                                                        </View>
                                                        <Text style={styles.defectCode}>{d.MaLoi}</Text>
                                                    </View>
                                                    <Text style={styles.defectName}>{d.TenLoi}</Text>
                                                </View>
                                                <Ionicons name="add-circle-outline" size={24} color="#2563eb" />
                                            </View>

                                            {d.MoTa && (
                                                <Text style={styles.defectDesc}>{d.MoTa}</Text>
                                            )}

                                            {d.GhiChu && (
                                                <View style={styles.noteBox}>
                                                    <Ionicons name="alert-circle-outline" size={14} color="#2563eb" />
                                                    <Text style={styles.noteText}>{d.GhiChu}</Text>
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    );
                                })
                            )}
                        </ScrollView>

                        <TouchableOpacity
                            style={styles.closeBtn}
                            onPress={() => setShowModal(false)}
                        >
                            <Text style={{ color: "#fff" }}>Đóng</Text>
                        </TouchableOpacity>
                    </KeyboardAvoidingView>
                </View>
            </Modal>

            {/* Modal xem trước ảnh phóng to */}
            <Modal
                visible={isPreviewVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsPreviewVisible(false)}
            >
                <View style={styles.previewOverlay}>
                    <TouchableOpacity
                        style={styles.previewCloseArea}
                        activeOpacity={1}
                        onPress={() => setIsPreviewVisible(false)}
                    >
                        <Image
                            source={{ uri: previewUri }}
                            style={styles.previewFullImage}
                            resizeMode="contain"
                        />
                        <TouchableOpacity
                            style={styles.previewCloseBtn}
                            onPress={() => setIsPreviewVisible(false)}
                        >
                            <Ionicons name="close-circle" size={40} color="#fff" />
                        </TouchableOpacity>
                    </TouchableOpacity>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({

    scrollContainer: {
        flex: 1,
    },

    container: {
        padding: 20,
    },

    title: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#0f172a"
    },

    infoCard: {
        backgroundColor: "#fff",
        borderRadius: 14,
        padding: 14,
        marginTop: 10,
        marginBottom: 10
    },

    infoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 6
    },

    label: {
        color: "#64748b",
        fontSize: 13
    },

    value: {
        fontWeight: "600",
        color: "#0f172a"
    },

    standardCard: {
        backgroundColor: "#fff",
        padding: 14,
        borderRadius: 14,
        marginBottom: 20
    },

    standardTitle: {
        fontWeight: "600",
        marginBottom: 6,
        color: "#0f172a"
    },

    standard: {
        color: "#475569"
    },

    row: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 20
    },

    option: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        backgroundColor: "#e2e8f0",
        alignItems: "center"
    },

    optionText: {
        fontWeight: "600"
    },

    success: {
        backgroundColor: "#22c55e"
    },

    error: {
        backgroundColor: "#ef4444"
    },

    selectBox: {
        backgroundColor: "#fff",
        padding: 14,
        borderRadius: 12,
        marginBottom: 10
    },

    selectText: {
        fontWeight: "600"
    },

    defectRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        padding: 12,
        borderRadius: 12,
        marginBottom: 8
    },

    defectCode: {
        fontWeight: "bold"
    },

    defectName: {
        color: "#475569"
    },

    qtyInput: {
        width: 60,
        backgroundColor: "#f1f5f9",
        padding: 8,
        borderRadius: 8,
        textAlign: "center",
        marginRight: 10
    },

    saveBtn: {
        backgroundColor: "#2563eb",
        padding: 16,
        borderRadius: 16,
        alignItems: "center",
        marginTop: 20
    },

    saveText: {
        color: "#fff",
        fontWeight: "600"
    },

    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "flex-end"
    },

    modalContent: {
        backgroundColor: "#fff",
        padding: 20,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: "85%", // Tăng chiều cao để xem được nhiều lỗi hơn
        flex: 1
    },

    modalTitle: {
        fontWeight: "bold",
        fontSize: 18,
        marginBottom: 15,
        textAlign: 'center',
        color: '#0f172a'
    },

    searchInput: {
        backgroundColor: "#f1f5f9",
        padding: 12,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0'
    },

    defectItem: {
        padding: 14,
        borderRadius: 12,
        marginBottom: 10,
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2
    },

    defectCode: {
        fontWeight: "bold",
        fontSize: 14,
        color: "#64748b",
        marginLeft: 8
    },

    defectName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#0f172a",
        marginTop: 2
    },

    defectDesc: {
        fontSize: 13,
        color: "#64748b",
        marginTop: 6,
        lineHeight: 18
    },

    typeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },

    typeBadgeText: {
        color: "#fff",
        fontSize: 10,
        fontWeight: "bold"
    },

    noteBox: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 8,
        backgroundColor: "#eff6ff",
        padding: 8,
        borderRadius: 8,
        borderLeftWidth: 3,
        borderLeftColor: '#2563eb'
    },

    noteText: {
        fontSize: 12,
        color: "#1e40af",
        fontWeight: "500",
        marginLeft: 4,
        flex: 1
    },

    qtyInput: {
        width: 60,
        backgroundColor: "#f8fafc",
        padding: 8,
        borderRadius: 8,
        textAlign: "center",
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        fontWeight: 'bold'
    },

    saveBtn: {
        backgroundColor: "#2563eb",
        padding: 16,
        borderRadius: 16,
        alignItems: "center",
        marginTop: 20,
        shadowColor: "#2563eb",
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5
    },

    saveText: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 16
    },

    closeBtn: {
        backgroundColor: "#64748b",
        padding: 14,
        borderRadius: 14,
        alignItems: "center",
        marginTop: 15
    },

    // Styles cho xem trước ảnh
    previewOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.9)",
        justifyContent: "center",
        alignItems: "center"
    },
    previewCloseArea: {
        width: '100%',
        height: '100%',
        justifyContent: "center",
        alignItems: "center"
    },
    previewFullImage: {
        width: '95%',
        height: '80%',
    },
    previewCloseBtn: {
        position: 'absolute',
        top: 40,
        right: 20,
        zIndex: 10
    }
});