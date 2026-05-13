import { useEffect, useState } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";

import LoginScreen from "../screens/LoginScreen";
import HomeScreen, { homeHeaderOptions } from "../screens/HomeScreen";
import PhieuListScreen from "../screens/PhieuListScreen";
import PhieuDetailScreen from "../screens/PhieuDetailScreen";
import CheckItemScreen from "../screens/CheckItemScreen";

// (Sau này thêm BienBanListScreen)
import BienBanListScreen from "../screens/BienBanListScreen";
import BienBanDetailScreen from "../screens/BienBanDetailScreen"
import NotificationScreen from "../screens/NotificationScreen";
import KiemDacBietScreen from "../screens/KiemDacBietScreen";
import SxbtInspectionScreen from "../screens/SxbtInspectionScreen";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
    const [isLoading, setIsLoading] = useState(true);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        const checkToken = async () => {
            const token = await AsyncStorage.getItem("token");
            setIsLoggedIn(!!token);
            setIsLoading(false);
        };

        checkToken();
    }, []);

    if (isLoading) return null;

    return (
        <Stack.Navigator
            initialRouteName={isLoggedIn ? "Home" : "Login"}
            screenOptions={{
                headerBackTitleVisible: false,
                headerBackButtonDisplayMode: "minimal",
                headerTitleAlign: "center"
            }}
        >
            <Stack.Screen
                name="Login"
                component={LoginScreen}
                options={{ headerShown: false }}
            />

            <Stack.Screen
                name="Home"
                component={HomeScreen}
                options={{ headerShown: false }}
            />

            <Stack.Screen
                name="PhieuList"
                component={PhieuListScreen}
                options={{ title: "Phiếu kiểm" }}
            />

            <Stack.Screen
                name="PhieuDetail"
                component={PhieuDetailScreen}
                options={{ title: "Chi tiết phiếu" }}
            />

            <Stack.Screen
                name="CheckItem"
                component={CheckItemScreen}
                options={{ title: "Kiểm tra mục" }}
            />

            <Stack.Screen
                name="BienBanList"
                component={BienBanListScreen}
                options={{ title: "Biên bản kiểm" }}
            />

            <Stack.Screen
                name="BienBanDetail"
                component={BienBanDetailScreen}
                options={{ title: "Chi tiết biên bản" }}
            />
            <Stack.Screen
                name="KiemDacBiet"
                component={KiemDacBietScreen}
                options={{ title: "Kiểm tra đặc biệt" }}
            />
            <Stack.Screen
                name="SxbtInspection"
                component={SxbtInspectionScreen}
                options={{ title: "Kiểm tra Sản Xuất Bổ Trợ" }}
            />
            <Stack.Screen
                name="Notifications"
                component={NotificationScreen}
                options={{ title: "Thông báo" }}
            />
        </Stack.Navigator>
    );
}