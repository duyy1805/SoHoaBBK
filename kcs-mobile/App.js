import { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import AppNavigator from "./src/navigation/AppNavigator";
import { getUser } from "./src/utils/auth";

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
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
}