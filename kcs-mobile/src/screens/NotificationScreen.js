import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getNotifications, markAsRead, markAllAsRead } from '../api/notification.api';
import * as Notifications from 'expo-notifications';

export default function NotificationScreen({ navigation }) {
    const [data, setData] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        try {
            const res = await getNotifications();
            setData(res.data.notifications || []);
            // Xóa badge ngoài màn hình chính khi vào xem
            await Notifications.setBadgeCountAsync(0);
        } catch (err) {
            console.log(err);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const handlePressNotification = async (item) => {
        // Đánh dấu đã đọc
        if (!item.IsRead) {
            await markAsRead(item.Id);
            setData(prev => prev.map(n => n.Id === item.Id ? { ...n, IsRead: true } : n));
        }

        // Điều hướng
        if (item.Type === 'NEW_PHIEU' && item.ReferenceId) {
            navigation.navigate('PhieuDetail', { id: item.ReferenceId });
        }
    };

    const handleMarkAllRead = async () => {
        await markAllAsRead();
        loadData();
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={[styles.item, !item.IsRead && styles.unreadItem]}
            onPress={() => handlePressNotification(item)}
        >
            <View style={styles.iconContainer}>
                <Ionicons name="notifications-circle" size={40} color={!item.IsRead ? "#2563eb" : "#94a3b8"} />
            </View>
            <View style={styles.content}>
                <Text style={[styles.title, !item.IsRead && styles.unreadText]}>{item.Title}</Text>
                <Text style={styles.message} numberOfLines={2}>{item.Message}</Text>
                <Text style={styles.time}>{new Date(item.CreatedAt).toLocaleString('vi-VN')}</Text>
            </View>
            {!item.IsRead && <View style={styles.unreadDot} />}
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Thông báo</Text>
                <TouchableOpacity onPress={handleMarkAllRead}>
                    <Text style={styles.markReadText}>Đánh dấu đã đọc</Text>
                </TouchableOpacity>
            </View>
            <FlatList
                data={data}
                keyExtractor={item => item.Id.toString()}
                renderItem={renderItem}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
                ListEmptyComponent={<Text style={styles.empty}>Chưa có thông báo nào</Text>}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee' },
    headerTitle: { fontSize: 24, fontWeight: 'bold' },
    markReadText: { color: '#2563eb', fontWeight: '600' },
    item: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee', alignItems: 'center' },
    unreadItem: { backgroundColor: '#eff6ff' },
    iconContainer: { marginRight: 12 },
    content: { flex: 1 },
    title: { fontSize: 16, color: '#334155' },
    unreadText: { fontWeight: 'bold', color: '#0f172a' },
    message: { color: '#475569', marginTop: 4 },
    time: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
    unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#2563eb', marginLeft: 8 },
    empty: { textAlign: 'center', marginTop: 50, color: '#94a3b8' }
});