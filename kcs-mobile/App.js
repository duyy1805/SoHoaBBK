import { StatusBar } from 'expo-status-bar';
import { Provider as PaperProvider } from 'react-native-paper';
import AppNavigator from './src/navigation/AppNavigator';
import theme from './src/theme/theme';

export default function App() {
  return (
    <PaperProvider theme={theme}>
      <StatusBar style="dark" />
      <AppNavigator />
    </PaperProvider>
  );
}
