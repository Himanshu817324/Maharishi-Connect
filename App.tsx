import 'react-native-gesture-handler';
import 'react-native-screens';
import React from 'react';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { store } from './src/store';
import ThemeProvider from './src/theme';
import CustomStatusBar from './src/components/atoms/ui/StatusBar';
import RootNavigator from './src/navigation/RootNavigator';
import ChatInitializer from './src/components/ChatInitializer';

function App() {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <SafeAreaProvider>
          <ChatInitializer>
            <CustomStatusBar />
            <RootNavigator />
            <Toast />
          </ChatInitializer>
        </SafeAreaProvider>
      </ThemeProvider>
    </Provider>
  );
}

export default App;
