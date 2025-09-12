import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colorsFor, useThemeMode } from '../theme';

export default function Chat() {
  const mode = useThemeMode();
  const styles = themedStyles(mode);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chat</Text>
      <Text style={styles.text2}>Welcome to the chat!</Text>
    </View>
  );
}

const themedStyles = (mode: any) => {
    const modeStr: 'light' | 'dark' = typeof mode === 'string'
        ? (mode as 'light' | 'dark')
        : (mode && (mode as any).mode) ? (mode as any).mode : 'light';
    const c = colorsFor(modeStr);
    return StyleSheet.create({
        container: {
            flex: 1,
            flexDirection: 'column',
            justifyContent: 'flex-start',
            alignItems: 'center',
            backgroundColor: c.bg,
        },
        title: {
            color: c.text,
            fontSize: 28,
            marginTop: 8,
            marginLeft: 8,
            fontWeight: 'bold',
        },
        text1: {
            color: c.text,
            fontSize: 18,
            margin: 8,
            fontWeight: 'bold',
            lineHeight: 25,
        },
        text2: {
            color: c.text,
            fontSize: 18,
            margin: 8,
            lineHeight: 25,
        },
        separator: {
            height: 1,
            backgroundColor: modeStr === 'dark' ? '#666' : '#ddd',
            marginVertical: 1,
        },
        topic: {
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            backgroundColor: c.card,
            borderRadius: 8,
            paddingHorizontal: 8,
            paddingVertical: 4,
            marginTop: 16,
            width: '90%',
            borderColor: modeStr === 'dark' ? '#111' : '#e6e6e6',
            borderWidth: 1,
            gap: 8,
        },
    });
};