import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Link, router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Platform, Pressable, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { disablePush, enablePush, isPushEnabled, isWebPushSupported, sendChatPush } from '../lib/notifications';
import { colorsFor, useThemeMode } from './theme';


////////////////ITS RIGHT HERE///////////////////////////
export const devVer: boolean = false;
/////////////////////////////////////////////////////////

const HomePage = () => {
  const mode = useThemeMode();
  const modeStr: 'light' | 'dark' = typeof mode === 'string'
    ? (mode as 'light' | 'dark')
    : (mode && (mode as any).mode) ? (mode as any).mode : 'light';
  const c = colorsFor(modeStr);
  const fade1 = useRef(new Animated.Value(0)).current;
  const fade2 = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    React.useCallback(() => {
      // reset
      fade1.setValue(0);
      fade2.setValue(0);
      // sequence: fade in first, then second, then the rest of the UI
      Animated.timing(fade1, { toValue: 1, duration: 800, useNativeDriver: true }).start(() => {
        Animated.timing(fade2, { toValue: 1, duration: 800, useNativeDriver: true }).start(() => {

        });
      });
      return () => {
        fade1.setValue(0);
        fade2.setValue(0);
      };
    }, [fade1, fade2])
  );
  const PROFILE_KEY = '@boxinggroupchat_profile_v1';
  const PUSH_PREF_KEY = '@boxinggroupchat_push_enabled_v1';
  const [profileName, setProfileName] = useState('');
  const [profileColor, setProfileColor] = useState('#ffffff');
  const [pushEnabled, setPushEnabled] = useState(false);
  const [checkingPush, setCheckingPush] = useState(true);

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

  async function loadPushPreference() {
    try {
      if (Platform.OS !== 'web') { setCheckingPush(false); return; }
      if (!isWebPushSupported()) { setCheckingPush(false); return; }
      const stored = await AsyncStorage.getItem(PUSH_PREF_KEY);
      const hasSub = await isPushEnabled();
      setPushEnabled(stored === 'true' || hasSub);
    } catch (e) {
      console.warn('Failed to load push preference:', e);
    } finally {
      setCheckingPush(false);
    }
  }

  async function togglePush(next: boolean) {
    setPushEnabled(next);
    await AsyncStorage.setItem(PUSH_PREF_KEY, next ? 'true' : 'false');
    if (Platform.OS !== 'web') {
      Alert.alert('Not supported', 'Push notifications are currently implemented for web only in this app.');
      return;
    }
    if (!isWebPushSupported()) {
      Alert.alert('Not supported', 'Your browser does not support Web Push.');
      return;
    }
    try {
      if (next) {
        await enablePush();
      } else {
        await disablePush();
      }
    } catch (e: any) {
      const msg = e?.message || String(e);
      Alert.alert('Notifications', msg);
      setPushEnabled(!next);
      await AsyncStorage.setItem(PUSH_PREF_KEY, !next ? 'true' : 'false');
    }
  }

  useEffect(() => { loadProfile(); loadPushPreference(); }, []);
  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <Animated.Text style={[styles.text, { color: c.text, opacity: fade1 }]}>Welcome to</Animated.Text>
      <Animated.Text style={[styles.text, { fontSize: 36, fontWeight: 'bold', color: c.text, marginBottom: 16, opacity: fade2 }]}>Boxing Group Chat</Animated.Text>
      <View style={{ width: '100%', paddingHorizontal: 16, marginBottom: 12 }}>
        <Text style={{ color: c.text, marginBottom: 6 }}>Name</Text>
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
        <Text style={{ color: c.text, marginBottom: 12 }}>Color</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 0}}>
            {['#4f46e5', '#ef4444', '#f59e0b', '#10b981', '#06b6d4', '#a78bfa'].map(col => (
              <TouchableOpacity key={col} onPress={() => { setProfileColor(col); saveProfile(undefined, col); }} accessibilityRole="button">
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: col, borderWidth: profileColor === col ? 3 : 1, borderColor: profileColor === col ? (modeStr === 'dark' ? '#fff' : '#000') : '#ccc' }} />
              </TouchableOpacity>
            ))}
        </View>
      </View>
      <View style={{ width: '100%', paddingHorizontal: 16, marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: c.text, marginRight: 12 }}>Web notifications</Text>
          <Switch
            value={pushEnabled}
            disabled={checkingPush || Platform.OS !== 'web' || !isWebPushSupported()}
            onValueChange={togglePush}
          />
        </View>
        {Platform.OS === 'web' ? null : (
          <Text style={{ color: c.text, marginTop: 6, fontSize: 12, opacity: 0.7 }}>
            Push is only wired for web in this build.
          </Text>
        )}
      </View>
      <Link style={[styles.button]} href={{ pathname: "/BoxingGroupchat/chat", params: { id: "1" } }}>
          <Text style={[styles.text, { color: c.text }]}>Open chat</Text>
      </Link>
      {Platform.OS === 'web' && (
        <></>
      )}
      <Pressable style={[styles.button2]} onPress={() => router.push({ pathname: "/BoxingGroupchat/events" })}>
        <Text style={[styles.text, { color: c.text }]}>View events</Text>
      </Pressable>
      <Pressable style={[styles.button2]} onPress={() => router.push({ pathname: "/BoxingGroupchat/about" })}>
        <Text style={[styles.text, { color: c.text }]}>About Page</Text>
      </Pressable>
      
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