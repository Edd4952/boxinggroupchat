import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { devVer } from '..';
import { supabase } from '../supabase';
import { colorsFor, useThemeMode } from '../theme';
const instalogo = require('../../assets/images/instalogo.png');

let Device: any = null;
if (Platform.OS !== 'web') {
    // require so bundler won't try to resolve this on web
    Device = require('expo-device');
}
// use Device only when available, otherwise use web fallback
async function gatherDeviceInfo() {
    if (Device) {
        const d: any = Device;
        return {
            deviceId: d.deviceId ?? 'unknown',
            deviceName: d.modelName ?? 'unknown',
            isTablet: d.isTablet ?? false,
            systemVersion: d.osVersion ?? String(Platform.Version),
        };
    }
    return {
        deviceId: 'web-' + (typeof navigator !== 'undefined' ? navigator.userAgent.slice(0,32) : 'web'),
        deviceName: 'web',
        isTablet: false,
        systemVersion: typeof navigator !== 'undefined' ? navigator.userAgent : String(Platform.Version),
    };
}

// generate a 64-bit-safe unique BigInt id and return its decimal string
function generateBigIntId(): string {
    // timestamp (ms) shifted left 21 bits + 21 bits random => fits comfortably in signed 63-bit range
    const ts = BigInt(Date.now());
    const rand21 = BigInt(Math.floor(Math.random() * (1 << 21))); // 21 bits of randomness
    const idBig = (ts << 21n) | rand21;
    return idBig.toString();
}

const About = () => {
    const { id } = useLocalSearchParams();
    const { mode } = useThemeMode();
    const styles = themedStyles(mode);
    const c = colorsFor(mode);

    // load profile (same as Chat)
    const PROFILE_KEY = '@boxinggroupchat_profile_v1';
    const [profileName, setProfileName] = useState('You');
    const [profileColor, setProfileColor] = useState('#ffffff');
    
    const MESSAGE_IDS_KEY = '@boxinggroupchat_message_ids_v1';
    const [messageIDs, setMessageIDs] = useState<string[]>([]);
    const [showCopied, setShowCopied] = useState(false);
    const [toastMessage, setToastMessage] = useState('Copied to clipboard');
    const [contactText, setContactText] = useState('');
    const [contactMessages, setContactMessages] = useState<DirectMessage[]>([]);
    const timerRef = useRef<any>(null);

    // load saved ids on mount — return parsed array so caller can use it immediately
    async function loadMessageIDs(): Promise<string[] | null> {
        try {
            const raw = await AsyncStorage.getItem(MESSAGE_IDS_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw) as string[] | null;
            if (Array.isArray(parsed)) setMessageIDs(parsed);
            return Array.isArray(parsed) ? parsed : null;
        } catch (e) {
            console.warn('Failed to load message IDs:', e);
            return null;
        }
    }
 
    // persist ids to AsyncStorage
    async function saveMessageIDs(ids: string[]) {
        try {
            await AsyncStorage.setItem(MESSAGE_IDS_KEY, JSON.stringify(ids));
        } catch (e) {
            console.warn('Failed to save message IDs:', e);
        }
    }

    // add a new id (dedupes) and save
    function addMessageID(id: string) {
        setMessageIDs(prev => {
            if (prev.includes(id)) return prev;
            const next = [...prev, id];
            saveMessageIDs(next);
            return next;
        });
    }

    // clear stored ids
    async function clearMessageIDs() {
        try {
            await AsyncStorage.removeItem(MESSAGE_IDS_KEY);
            setMessageIDs([]);
        } catch (e) {
            console.warn('Failed to clear message IDs:', e);
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
            console.warn('Failed to load profile in About:', e);
        }
    }

    // load direct messages that match stored messageIDs (optional ids param)
    async function loadDirectMessages(ids?: string[] | null) {
        try {
            if (devVer) {
                const { data, error } = await supabase
                    .from('directmessages')
                    .select('id, username, usermsg, devicename, sysver, deviceid, istablet, created_at')
                    .order('created_at', { ascending: false })
                    .limit(500);
                if (error) throw error;
                if (!Array.isArray(data)) {
                    setContactMessages([]);
                    return;
                }
                const mapped = (data as any[]).map(r => ({
                    id: String(r.id),
                    username: r.username ?? 'Unknown',
                    usermsg: r.usermsg ?? '',
                    created_at: r.created_at ?? null,
                    devicename: r.devicename ?? null,
                    adminmsg: r.adminmsg ?? null,
                    admintime: r.admintime ?? null,
                })) as DirectMessage[];
                setContactMessages(mapped);
                return;
            }

            const idsToUse = ids && ids.length ? ids : messageIDs;
            if (!idsToUse || idsToUse.length === 0) {
                setContactMessages([]);
                return;
            }

            // convert ids to numbers when safe, otherwise keep as strings to avoid precision loss
            const idsForQuery = idsToUse.map(id => {
                const n = Number(id);
                return Number.isSafeInteger(n) ? n : id;
            });
            if (idsForQuery.some(x => typeof x === 'string')) {
                console.warn('Some message IDs are too large for safe integer conversion — querying using strings for those IDs.');
            }

            const { data, error } = await supabase
                .from('directmessages')
                .select('id, username, usermsg, devicename, sysver, deviceid, istablet, created_at, adminmsg, admintime')
                .in('id', idsForQuery);

            if (error) throw error;

            if (Array.isArray(data)) {
                const byId = new Map<string, any>(data.map((r: any) => [String(r.id), r]));
                const ordered = idsToUse
                    .map(id => byId.get(String(id)))
                    .filter(Boolean)
                    .map((r: any) => ({
                        id: String(r.id),
                        username: r.username ?? 'Unknown',
                        usermsg: r.usermsg ?? '',
                        created_at: r.created_at ?? r.createdAt ?? null,
                        adminmsg: r.adminmsg ?? null,
                        admintime: r.admintime ?? null,
                    })) as DirectMessage[];
                setContactMessages(ordered);
            } else {
                setContactMessages([]);
            }
        } catch (e) {
            console.warn('Failed to load direct messages from DB:', e);
            setContactMessages([]);
        }
    }

    // reload direct messages whenever the stored ids change
    useEffect(() => {
        loadDirectMessages();
    }, [messageIDs]);
    
    // on mount: load profile, messageIDs, then direct messages (ensures order)
    useEffect(() => {
        (async () => {
            await loadProfile();
            const ids = await loadMessageIDs();
            await loadDirectMessages(ids);
        })();
    }, []);

    // refresh when screen gains focus (useful after navigation)
    useFocusEffect(
        React.useCallback(() => {
            loadMessageIDs().then(ids => loadDirectMessages(ids));
        }, [])
    );
    
    type DirectMessage = {
        id: string;
        username: string;
        usermsg: string;
        created_at?: string | null;
        devicename?: string | null;
        adminmsg?: string | null;
        admintime?: string | null;
    };

    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);
 
    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 80}>
            <ScrollView
                style={styles.container}
                contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 6 }}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                nestedScrollEnabled={true}
            >
            <View style={styles.topic}>
                <Text style={[styles.title, {marginTop: 4}]}>About us</Text>
                <Text style={styles.text2}>
                    Welcome to fight club.{'\n'}
                    The first rule of fight club is you do not talk about fight club.{'\n'}
                    The second rule of fight club is you DO NOT talk about fight club.{'\n'}
                </Text>
                <Divider />
                <Text style={styles.text2}>
                    Kidding of course{'\n'}
                    This groupchat is for all of my boxing friends!{'\n'}
                </Text>
            </View>
            
            <View style={styles.topic}>
                <Text style={[styles.title, {marginTop: 4}]}>Rules</Text>
                <Text style={styles.text2}>
                    1. Respect
                    {'\n'}2. Don't spam
                    {'\n'}3. Everyone has the same access to the chat and events maker. Don't abuse it.
                </Text>
            </View>

            <View style={[styles.topic, { marginBottom: 12 }]}>
                <Text style={[styles.title, { marginTop: 4 }]}>Contact</Text>

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>   
                    <Image source={instalogo} style={{ width: 20, height: 20, resizeMode: 'contain', marginLeft: 8 }} />
                    <Text
                        style={[styles.text2, { marginLeft: 8 }]}
                        selectable
                        onPress={async () => {
                            try {
                                await Clipboard.setStringAsync('ezilbert.06');
                                setShowCopied(true);
                                if (timerRef.current) clearTimeout(timerRef.current);
                                timerRef.current = setTimeout(() => setShowCopied(false), 1500);
                            } catch (e) {
                                console.warn('Copy failed', e);
                            }
                        }}
                    >
                        ezilbert.06
                    </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="mail-outline" size={20} color={mode === 'dark' ? '#fff' : '#000'} style={{ marginLeft: 8 }} />
                    <Text
                        style={[styles.text2, { marginLeft: 8 }]}
                        selectable
                        onPress={async () => {
                            try {
                                await Clipboard.setStringAsync('zilbert3dward@gmail.com');
                                setShowCopied(true);
                                if (timerRef.current) clearTimeout(timerRef.current);
                                timerRef.current = setTimeout(() => setShowCopied(false), 1500);
                            } catch (e) {
                                console.warn('Copy failed', e);
                            }
                        }}
                    >
                        zilbert3dward@gmail.com
                    </Text>
                </View>
                <Divider />
                <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.text2}>Send me some feedback:</Text>
                    <Ionicons name="chevron-down-outline" size={20} color={colorsFor(mode).text} />
                </View>
                {/*direct message input*/}
                <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 4 }}>
                    <TextInput
                        style={[styles.input, { flex: 1, marginRight: 8 }]}
                        placeholder="Send a message and ill get back to you"
                        placeholderTextColor={mode === 'dark' ? '#ccc' : '#666'}
                        multiline
                        returnKeyType="send"
                        blurOnSubmit={false}
                        value={contactText}
                        onChangeText={setContactText}
                        onSubmitEditing={() => {
                            // send action
                            if (contactText.trim()) {
                                setToastMessage('Message sent');
                                setShowCopied(true);
                                if (timerRef.current) clearTimeout(timerRef.current);
                                timerRef.current = setTimeout(() => setShowCopied(false), 1500);
                                setContactText('');
                            }
                        }}
                    />
                    <TouchableOpacity
                        onPress={async () => {
                            if (!contactText.trim()) return;
                            try {
                                const { deviceId, deviceName, isTablet, systemVersion } = await gatherDeviceInfo();
                                // let DB generate the id. send only other fields, then use returned id.
                                const payload = {
                                    deviceid: deviceId,
                                    devicename: deviceName,
                                    istablet: isTablet,
                                    sysver: systemVersion,
                                    username: profileName,
                                    usermsg: contactText.trim(),
                                };
                                const { data, error } = await supabase
                                    .from('directmessages')
                                    .insert([payload])
                                    .select('id, created_at')
                                    .single();
                                 if (error) {
                                     console.warn('Failed to send direct message to DB:', error);
                                     setToastMessage('Failed to send');
                                 } else {
                                     setToastMessage('Message sent');
                                    // use the DB-returned id (string) so local storage matches DB
                                    const sentId = String((data as any)?.id);
                                    // update local ids array immediately and persist, then refresh the window using the new list
                                    const newIds = [sentId, ...messageIDs];
                                     try {
                                         await saveMessageIDs(newIds);
                                     } catch (e) {
                                         console.warn('Failed to persist message IDs after insert:', e);
                                     }
                                     setMessageIDs(newIds);
                                     await loadDirectMessages(newIds);
                                     setContactText('');
                                 }
                            } catch (err: any) {
                                console.warn('Error sending direct message:', err);
                                setToastMessage('Failed to send');
                            } finally {
                                setShowCopied(true);
                                if (timerRef.current) clearTimeout(timerRef.current);
                                timerRef.current = setTimeout(() => setShowCopied(false), 1500);
                            }
                        }}
                        accessibilityRole="button"
                    >
                        <View style={{
                            backgroundColor: colorsFor(mode).card,
                            paddingVertical: 18,
                            paddingHorizontal: 12,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: mode === 'dark' ? '#c5c5c5ff' : '#111',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Ionicons name="send" size={20} color={colorsFor(mode).text} />
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Direct messages window — only render when there are messages (or when debugging all messages) */}
                {(contactMessages.length > 0 || devVer) ? (
                    <View style={{ width: '100%', marginTop: 4, backgroundColor: c.card3, marginBottom: 4 }}>
                        <Text style={[styles.text2, { fontWeight: 'bold', alignSelf: 'center', marginBottom: 4 }]}>
                            Direct Messages
                        </Text>
                        <ScrollView
                            style={{
                                width: '100%',
                                paddingHorizontal: 12,
                                paddingTop: 8,
                                borderRadius: 8,
                                maxHeight: 200,
                            }}
                            contentContainerStyle={{ paddingBottom: 0 }}
                        >
                            {contactMessages.length === 0 ? (
                                <View style={{ height: 40, alignItems: 'center', justifyContent: 'center' }}>
                                    <Text style={{ color: c.text, opacity: 0.6 }}>No messages yet</Text>
                                </View>
                            ) : (
                                contactMessages.map(m => (
                                    <View key={m.id} style={{ marginBottom: 8 }}>
                                        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                                            <Text style={{ color: c.text, fontWeight: 'bold' }}>{m.username}</Text>
                                            <Text style={{ color: c.text, fontSize: 10 }}>
                                                {m.created_at ? new Date(m.created_at).toLocaleString() : ''}
                                            </Text>
                                        </View>
                                        <Text style={{ color: c.text }}>{m.usermsg}</Text>

                                        {m.adminmsg ? (
                                            <>
                                                <View style={[styles.separator, { marginTop: 8 , width: '70%', alignSelf: 'center' }]} />
                                                <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                                                    <Text style={{ color: c.text, fontWeight: 'bold' }}>Admin</Text>
                                                    <Text style={{ color: c.text, fontSize: 10 }}>
                                                        {m.admintime ? new Date(m.admintime).toLocaleString() : (m.created_at ? new Date(m.created_at).toLocaleString() : '')}
                                                    </Text>
                                                </View>
                                                <Text style={{ color: c.text }}>{m.adminmsg}</Text>
                                            </>
                                        ) : null}
                                        <View style={[styles.separator, { marginTop: 8 }]} />

                                    </View>
                                ))
                            )}
                        </ScrollView>
                    </View>
                ) : null}
            </View>

            <View style={[styles.topic, { marginBottom: 12, marginTop: 0 }]}>
                <Text style={[styles.text2, { marginTop: 4 }]}>This app is a work in progress, please be patient as we improve it.</Text>
            </View>
            {showCopied ? (
                <View
                    pointerEvents="none"
                    style={{
                        position: 'absolute',
                        bottom: 40,
                        alignSelf: 'center',
                        backgroundColor: '#28a745',
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderRadius: 12,
                        elevation: 6,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.25,
                        shadowRadius: 4,
                        zIndex: 9999,
                    }}
                >
                    <Text style={{ color: '#fff', fontWeight: '600' }}>{toastMessage}</Text>
                </View>
            ) : null}
                </ScrollView>
        </KeyboardAvoidingView>

    );
};

const Divider = ({ color = '#DDD', thickness = 1, margin = 0 }) => (
  <View style={{ width: '100%', height: thickness, backgroundColor: color, marginVertical: margin }} />
);

const themedStyles = (mode: 'light' | 'dark') => {
    const c = colorsFor(mode);
    return StyleSheet.create({
        container: {
            flex: 1,
            flexDirection: 'column',
            paddingHorizontal: 8,
            backgroundColor: c.bg,
        },
        title: {
            color: c.text,
            fontSize: 28,
            marginLeft: 6,
            fontWeight: 'bold',
        },
        text1: {
            color: c.text,
            fontSize: 18,
            marginHorizontal: 8,
            fontWeight: 'bold',
            lineHeight: 25,
        },
        text2: {
            color: c.text,
            fontSize: 18,
            margin: 4,
            lineHeight: 25,
        },
        separator: {
            height: 1,
            backgroundColor: mode === 'dark' ? '#666' : '#ddd',
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
            marginTop: 12,
            width: '90%',
            borderColor: mode === 'dark' ? '#111' : '#e6e6e6',
            borderWidth: 1,
            gap: 4,
        },
        input: {
            backgroundColor: c.card,
            color: c.text,
            paddingHorizontal: 10,
            paddingVertical: 10,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: mode === 'dark' ? '#c5c5c5ff' : '#111',
            width: '100%',
        },
    });
};

export default About;