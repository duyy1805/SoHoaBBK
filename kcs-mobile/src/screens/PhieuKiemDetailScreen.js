import { useEffect, useState } from 'react';
import { ScrollView, View, Alert } from 'react-native';
import {
    Card,
    Text,
    TextInput,
    RadioButton,
    Button,
    Divider,
} from 'react-native-paper';
import axiosClient from '../api/axiosClient';

export default function PhieuKiemDetailScreen({ route, navigation }) {
    const { id } = route.params;

    const [tieuChiList, setTieuChiList] = useState([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadTieuChi();
    }, []);

    const loadTieuChi = async () => {
        const res = await axiosClient.get(`/phieu-kiem/${id}/tieu-chi`);
        setTieuChiList(res.data || []);
    };

    const updateChiSo = (tieuChiId, chiSoId, field, value) => {
        setTieuChiList((prev) =>
            prev.map((tc) =>
                tc.tieuChiId !== tieuChiId
                    ? tc
                    : {
                        ...tc,
                        chiSo: tc.chiSo.map((cs) =>
                            cs.chiSoId !== chiSoId
                                ? cs
                                : { ...cs, [field]: value }
                        ),
                    }
            )
        );
    };

    const submit = async () => {
        setSaving(true);
        try {
            const requests = [];

            tieuChiList.forEach((tc) => {
                tc.chiSo.forEach((cs) => {
                    requests.push(
                        axiosClient.post('phieu-kiem/kq-chi-so', {
                            phieuKiemId: id,
                            chiSoId: cs.chiSoId,
                            giaTri: cs.giaTri ?? null,
                            dat: cs.dat ?? null,
                        })
                    );
                });
            });

            await Promise.all(requests);

            Alert.alert('Thành công', 'Đã lưu kết quả kiểm', [
                { text: 'OK', onPress: () => navigation.goBack() },
            ]);
        } catch (err) {
            console.error(err);
            Alert.alert('Lỗi', 'Không lưu được kết quả kiểm');
        } finally {
            setSaving(false);
        }
    };


    return (
        <ScrollView style={{ padding: 12 }}>
            {tieuChiList.map((tc) => (
                <Card
                    key={tc.tieuChiId}
                    style={{
                        marginBottom: 16,
                        backgroundColor: '#f5f7fa',
                    }}
                >
                    <Card.Content>
                        {/* TIÊU CHÍ KIỂM */}
                        <View
                            style={{
                                borderLeftWidth: 4,
                                borderLeftColor: '#1976d2',
                                paddingLeft: 10,
                                marginBottom: 12,
                            }}
                        >
                            <Text
                                variant="titleMedium"
                                style={{
                                    fontWeight: '700',
                                    color: '#0d47a1',
                                }}
                            >
                                {tc.tenTieuChi}
                            </Text>
                            <Text style={{ color: '#546e7a', fontSize: 12 }}>
                                Tiêu chí kiểm
                            </Text>
                        </View>

                        {/* CHỈ SỐ KIỂM */}
                        {tc.chiSo.map((cs, index) => (
                            <View
                                key={cs.chiSoId}
                                style={{
                                    backgroundColor: '#ffffff',
                                    borderRadius: 8,
                                    padding: 10,
                                    marginBottom: 10,
                                    marginLeft: 12, // thụt vào để thấy cấp con
                                    elevation: 1,
                                }}
                            >
                                <Text
                                    style={{
                                        fontWeight: '600',
                                        marginBottom: 6,
                                        color: '#263238',
                                    }}
                                >
                                    {index + 1}. {cs.tenChiSo}
                                </Text>

                                {cs.kieuDuLieu === 'SO' && (
                                    <TextInput
                                        keyboardType="numeric"
                                        value={cs.giaTri ?? ''}
                                        mode="outlined"
                                        dense
                                        onChangeText={(v) =>
                                            updateChiSo(
                                                tc.tieuChiId,
                                                cs.chiSoId,
                                                'giaTri',
                                                v
                                            )
                                        }
                                    />
                                )}

                                {cs.kieuDuLieu === 'TEXT' && (
                                    <TextInput
                                        value={cs.giaTri ?? ''}
                                        mode="outlined"
                                        dense
                                        onChangeText={(v) =>
                                            updateChiSo(
                                                tc.tieuChiId,
                                                cs.chiSoId,
                                                'giaTri',
                                                v
                                            )
                                        }
                                    />
                                )}

                                {cs.kieuDuLieu === 'Đạt-Không đạt' && (
                                    <RadioButton.Group
                                        onValueChange={(v) =>
                                            updateChiSo(
                                                tc.tieuChiId,
                                                cs.chiSoId,
                                                'dat',
                                                v === 'DAT'
                                            )
                                        }
                                        value={
                                            cs.dat === null
                                                ? null
                                                : cs.dat
                                                    ? 'DAT'
                                                    : 'KHONG_DAT'
                                        }
                                    >
                                        <View
                                            style={{
                                                flexDirection: 'row',
                                                justifyContent: 'space-around',
                                            }}
                                        >
                                            <RadioButton.Item
                                                label="Đạt"
                                                value="DAT"
                                            />
                                            <RadioButton.Item
                                                label="Không đạt"
                                                value="KHONG_DAT"
                                            />
                                        </View>
                                    </RadioButton.Group>
                                )}
                            </View>
                        ))}
                    </Card.Content>
                </Card>
            ))}

            <Button
                mode="contained"
                onPress={submit}
                loading={saving}
                disabled={saving}
                style={{ marginTop: 8 }}
            >
                LƯU KẾT QUẢ KIỂM
            </Button>
        </ScrollView>
    );
}
