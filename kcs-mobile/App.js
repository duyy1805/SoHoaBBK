import { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AppNavigator from "./src/navigation/AppNavigator";
import { getUser } from "./src/utils/auth";
import { navigationRef } from "./src/navigation/navigationRef";
import Toast from "react-native-toast-message";

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      await getUser();
      setReady(true);
    };
    checkAuth();
  }, []);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef}>
        <AppNavigator />
        <Toast />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}