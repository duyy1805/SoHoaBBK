import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import PhieuKiemListScreen from '../screens/PhieuKiemListScreen';
import PhieuKiemDetailScreen from '../screens/PhieuKiemDetailScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
    return (
        <NavigationContainer>
            <Stack.Navigator>
                <Stack.Screen
                    name="Login"
                    component={LoginScreen}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="PhieuKiemList"
                    component={PhieuKiemListScreen}
                    options={{ title: 'Phiếu kiểm' }}
                />
                <Stack.Screen
                    name="PhieuKiemDetail"
                    component={PhieuKiemDetailScreen}
                    options={{ title: 'Kiểm tra' }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
}
