import { useEffect, useState } from 'react';
import { FlatList, TouchableOpacity } from 'react-native';
import { Card, Text, Chip } from 'react-native-paper';
import axiosClient from '../api/axiosClient';

export default function PhieuKiemListScreen({ navigation }) {
    const [data, setData] = useState([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const res = await axiosClient.get('/phieu-kiem/');
        setData(res.data);
    };

    return (
        <FlatList
            data={data}
            keyExtractor={item => item.Id.toString()}
            contentContainerStyle={{ padding: 12 }}
            renderItem={({ item }) => (
                <TouchableOpacity
                    onPress={() =>
                        navigation.navigate('PhieuKiemDetail', { id: item.Id })
                    }
                >
                    <Card style={{ marginBottom: 12 }}>
                        <Card.Content>
                            <Text variant="titleMedium">{item.SoPhieu}</Text>
                            <Text>{item.TenChungLoai}</Text>
                            <Text>Lot: {item.Lot}</Text>

                            <Chip style={{ marginTop: 8 }}>
                                {item.LoaiKiem}
                            </Chip>
                        </Card.Content>
                    </Card>
                </TouchableOpacity>
            )}
        />
    );
}
