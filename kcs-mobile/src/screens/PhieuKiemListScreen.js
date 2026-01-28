import { useEffect, useState } from 'react';
import { FlatList, TouchableOpacity, View } from 'react-native';
import { Card, Text, Chip } from 'react-native-paper';
import axiosClient from '../api/axiosClient';

const LOAI_KIEM_CONFIG = {
    'Đầu vào': { color: '#2e7d32', label: 'ĐẦU VÀO' },
    'Trong chuyền': { color: '#0277bd', label: 'TRONG CHUYỀN' },
    'Cuối': { color: '#6a1b9a', label: 'CUỐI' },
    'Nhà thầu': { color: '#ed6c02', label: 'NHÀ THẦU' },
};

export default function PhieuKiemListScreen({ navigation }) {
    const [data, setData] = useState([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const res = await axiosClient.get('/phieu-kiem/');
        setData(res.data || []);
    };

    const renderItem = ({ item }) => {
        const loaiConfig =
            LOAI_KIEM_CONFIG[item.LoaiKiem] || {
                color: '#546e7a',
                label: item.LoaiKiem,
            };

        return (
            <TouchableOpacity
                activeOpacity={0.85}
                onPress={() =>
                    navigation.navigate('PhieuKiemDetail', { id: item.Id })
                }
            >
                <Card style={{ marginBottom: 12 }}>
                    <Card.Content>
                        {/* Header */}
                        <View
                            style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: 8,
                            }}
                        >
                            <Text
                                variant="titleMedium"
                                style={{ fontWeight: '700' }}
                            >
                                {item.SoPhieu}
                            </Text>

                            <Chip
                                style={{
                                    backgroundColor: loaiConfig.color,
                                }}
                                textStyle={{
                                    color: '#fff',
                                    fontWeight: '600',
                                }}
                            >
                                {loaiConfig.label}
                            </Chip>
                        </View>

                        {/* Nội dung */}
                        <Text style={{ color: '#37474f' }}>
                            Chủng loại: {item.TenChungLoai}
                        </Text>

                        <Text
                            style={{
                                color: '#607d8b',
                                marginTop: 4,
                            }}
                        >
                            LOT: {item.Lot}
                        </Text>
                    </Card.Content>
                </Card>
            </TouchableOpacity>
        );
    };

    return (
        <FlatList
            data={data}
            keyExtractor={(item) => item.Id.toString()}
            contentContainerStyle={{ padding: 12 }}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
        />
    );
}
