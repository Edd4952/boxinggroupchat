import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from "expo-router";
import React from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { ThemeProvider, colorsFor, useThemeMode } from './theme';

function RootStackInner() {
  const { mode, toggle } = useThemeMode();
  const c = colorsFor(mode);
  const navTheme = mode === 'dark' ? DarkTheme : DefaultTheme;

  return (
    <NavThemeProvider value={navTheme}>
      <View style={styles.appShell}>
        <View style={styles.maxWidth}>
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
        </View>
      </View>
    </NavThemeProvider>
  );
}

const RootLayout = () => {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  return (
    <ThemeProvider>
      <RootStackInner />
    </ThemeProvider>
  );
};

const styles = StyleSheet.create({
  appShell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: '#222',  // default background color
  },
  // --- IGNORE ---
  
  maxWidth: {
    flex: 1,
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
    alignItems: 'stretch',
  },
});

export default RootLayout;