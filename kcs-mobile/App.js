import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import AppNavigator from "./src/navigation/AppNavigator";
import { getUser } from "./src/utils/auth";
import { navigationRef } from "./src/navigation/navigationRef";
import Toast from "react-native-toast-message";
import { savePushToken } from "./src/api/notification.api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { KeyboardProvider } from "react-native-keyboard-controller";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const initApp = async () => {
      const user = await getUser();
      if (user) {
        registerForPushNotificationsAsync().then(async token => {
          if (token) {
            await AsyncStorage.setItem('expoPushToken', token);
            await savePushToken(token).catch(() => console.log("Token already saved"));
          }
        });
      }

      // Xóa số đỏ ở icon app khi mở app
      await Notifications.setBadgeCountAsync(0);
      setReady(true);
    };

    initApp();

    // Lắng nghe sự kiện click vào thông báo từ màn hình khóa
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data?.type === 'NEW_PHIEU' && data?.referenceId) {
        navigationRef.navigate('PhieuDetail', { id: data.referenceId });
      }
    });

    return () => responseListener.remove();
  }, []);

  if (!ready) return null;

  return (
    <KeyboardProvider>
      <SafeAreaProvider>
        <NavigationContainer ref={navigationRef}>
          <AppNavigator />
          <Toast />
        </NavigationContainer>
      </SafeAreaProvider>
    </KeyboardProvider>
  );
}

async function registerForPushNotificationsAsync() {
  let token;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    // THAY PROJECT ID CỦA BẠN VÀO ĐÂY (Trong app.json)
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: '0c5d1c8d-3b16-473b-aefe-1e56fc06e4f8'
    })).data;
  }
  return token;
}
