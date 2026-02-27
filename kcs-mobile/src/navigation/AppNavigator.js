// src/navigation/AppNavigator.jsx

import { useEffect, useState } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";

import LoginScreen from "../screens/LoginScreen";
import PhieuListScreen from "../screens/PhieuListScreen";
import PhieuDetailScreen from "../screens/PhieuDetailScreen";
import CheckItemScreen from "../screens/CheckItemScreen";

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
            initialRouteName={isLoggedIn ? "PhieuList" : "Login"}
            screenOptions={{
                headerShown: true,
                headerBackTitleVisible: false,
                headerBackTitle: "",
                headerBackButtonDisplayMode: "minimal", // 👈 QUAN TRỌNG
                headerTitleAlign: "center"
            }}
        >
            <Stack.Screen
                name="Login"
                component={LoginScreen}
                options={{ headerShown: false }}
            />

            <Stack.Screen
                name="PhieuList"
                component={PhieuListScreen}
                options={{ title: "Phiếu kiểm của tôi" }}
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
        </Stack.Navigator>
    );
}