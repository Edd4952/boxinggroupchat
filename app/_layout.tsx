import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from "expo-router";
import { Switch } from 'react-native';
import { ThemeProvider, colorsFor, useThemeMode } from './theme';

function RootStackInner() {
  const { mode, toggle } = useThemeMode();
  const c = colorsFor(mode);
  const navTheme = mode === 'dark' ? DarkTheme : DefaultTheme;

  return (
    <NavThemeProvider value={navTheme}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: c.headerBg },
          headerTintColor: c.tint,
          contentStyle: { backgroundColor: c.bg },
          headerRight: () => (
            <Switch style={{ marginRight: 8 }} value={mode === 'dark'} onValueChange={toggle} />
          ),
        }}
      >
        <Stack.Screen name="index" options={{ headerTitle: "BoxingGroupchat" }} />
      </Stack>
    </NavThemeProvider>
  );
}

const RootLayout = () => {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  // Optionally handle font loading state if needed
  return (
    <ThemeProvider>
      <RootStackInner />
    </ThemeProvider>
  );
};

export default RootLayout;