import AsyncStorage from '@react-native-async-storage/async-storage';
import { Link, router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { colorsFor, useThemeMode } from './theme';


const HomePage = () => {
  const mode = useThemeMode();
  const modeStr: 'light' | 'dark' = typeof mode === 'string'
    ? (mode as 'light' | 'dark')
    : (mode && (mode as any).mode) ? (mode as any).mode : 'light';
  const c = colorsFor(modeStr);
  const PROFILE_KEY = '@boxinggroupchat_profile_v1';
  const [profileName, setProfileName] = useState('You');
  const [profileColor, setProfileColor] = useState('#ffffff');

  async function saveProfile(name?: string, color?: string) {
    try {
      const obj = { name: name ?? profileName, color: color ?? profileColor };
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(obj));
    } catch (e) {
      console.warn('Failed to save profile:', e);
    }
  }

  async function loadProfile() {
    try {
      const raw = await AsyncStorage.getItem(PROFILE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { name?: string; color?: string } | null;
      if (!parsed) return;
      if (parsed.name) setProfileName(parsed.name);
      if (parsed.color) setProfileColor(parsed.color);
    } catch (e) {
      console.warn('Failed to load profile:', e);
    }
  }

  useEffect(() => { loadProfile(); }, []);
  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <Text style={[styles.text, { color: c.text }]}>Welcome to my app</Text>
      <Link style={[styles.button]} href={{ pathname: "/BoxingGroupchat/chat", params: { id: "1" } }}>
          <Text style={[styles.text, { color: c.text }]}>Open chat</Text>
      </Link>
      <Pressable style={[styles.button2]} onPress={() => router.push({ pathname: "/BoxingGroupchat/events" })}>
        <Text style={[styles.text, { color: c.text }]}>View events</Text>
      </Pressable>
      <Pressable style={[styles.button2]} onPress={() => router.push({ pathname: "/BoxingGroupchat/about" })}>
        <Text style={[styles.text, { color: c.text }]}>About Page</Text>
      </Pressable>
      <View style={{ width: '100%', paddingHorizontal: 16, marginBottom: 12 }}>
        <Text style={{ color: c.text, marginBottom: 6 }}>Display name</Text>
        <TextInput
          placeholder="Your name"
          placeholderTextColor={modeStr === 'dark' ? '#ccc' : '#666'}
          value={profileName}
            onChangeText={(text) => { setProfileName(text); saveProfile(text, undefined); }}
            onBlur={() => { saveProfile(); }}
          style={{
            backgroundColor: c.card,
            color: c.text,
            paddingHorizontal: 10,
            paddingVertical: 8,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: modeStr === 'dark' ? '#111' : '#e6e6e6',
            marginBottom: 8,
          }}
        />
        <Text style={{ color: c.text, marginBottom: 6 }}>Choose color</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            {['#4f46e5', '#ef4444', '#f59e0b', '#10b981', '#06b6d4', '#a78bfa'].map(col => (
              <TouchableOpacity key={col} onPress={() => { setProfileColor(col); saveProfile(undefined, col); }} accessibilityRole="button">
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: col, borderWidth: profileColor === col ? 3 : 1, borderColor: profileColor === col ? (modeStr === 'dark' ? '#fff' : '#000') : '#ccc' }} />
              </TouchableOpacity>
            ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#222',
    gap: 8,
  },
  text: {
    color: 'white',
    fontSize: 28,
  },
  link: {
    color: '#007AFF',
    fontSize: 18,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  }
  ,
  button2: {
    backgroundColor: 'grey',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  }
});

export default HomePage;