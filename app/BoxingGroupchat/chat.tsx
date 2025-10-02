import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { devVer } from '../index';
import { supabase } from '../supabase';
import { colorsFor, useThemeMode } from '../theme';


type message = {
    id: string;
    user: string;
    content: string;
    timestamp: string;
    color?: string;
};


export default function Chat() {
    const mode = useThemeMode();
        const styles = themedStyles(mode);
        const modeStr: 'light' | 'dark' = typeof mode === 'string'
            ? (mode as 'light' | 'dark')
            : (mode && (mode as any).mode) ? (mode as any).mode : 'light';
        const c = colorsFor(modeStr);

    const MESSAGES_KEY = '@boxinggroupchat_messages_v1';
    const PROFILE_KEY = '@boxinggroupchat_profile_v1';
    const [messages, setMessages] = useState<message[]>([]);
    const [text, setText] = useState('');
    const [profileName, setProfileName] = useState('You');
    const [profileColor, setProfileColor] = useState('#ffffff');
    const [dbError, setDbError] = useState<string | null>(null);
    const scrollRef = useRef<ScrollView | null>(null);

    async function saveMessages(list: message[]) {
        try {
            await AsyncStorage.setItem(MESSAGES_KEY, JSON.stringify(list));
        } catch (e) {
            console.warn('Failed to save messages:', e);
        }
    }

    async function loadMessages() {
        // Try loading from Supabase. If it fails, show an error to the user.
        try {
            const { data, error } = await supabase
                .from('messages')
                .select('id, user, content, timestamp, color')
                .order('timestamp', { ascending: true })
                .limit(500);
            if (error) throw error;
            if (data && Array.isArray(data)) {
                const mapped = data.map((r: any) => ({
                    id: String(r.id),
                    user: r.user || 'Unknown',
                    content: r.content || '',
                    timestamp: r.timestamp || new Date().toISOString(),
                    color: r.color || '#ffffff'
                })) as message[];
                setMessages(mapped);
                setDbError(null);
                console.log('messages loaded from database:', mapped);
                return;
            }
            // no rows => empty list, clear any db error
            setMessages([]);
            setDbError(null);
        } catch (e: any) {
            console.warn('Supabase load failed:', e);
            setMessages([]); // clear UI when DB isn't reachable
            setDbError('Could not reach database. Please check your network or try again.');
        }
    }

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

    // load on mount
    useEffect(() => {
        loadMessages();
        loadProfile();
    }, []);

    // reload on focus
    useFocusEffect(
        React.useCallback(() => {
            loadMessages();
            loadProfile();
        }, [])
    );

    // auto-save profile when name or color changes, but skip initial load
    const _profileFirstRun = useRef(true);
    useEffect(() => {
        if (_profileFirstRun.current) {
            _profileFirstRun.current = false;
            return;
        }
        saveProfile();
    }, [profileName, profileColor]);

    const sendMessage = async () => {
        if (!text.trim()) return;
        // optimistic UI: create a temporary message and persist locally, then insert to Supabase
        const tempId = Date.now().toString();
        const msg: message = { id: tempId, user: profileName || 'You', content: text.trim(), timestamp: new Date().toISOString(), color: profileColor };
        const next = [...messages, msg]; // append so oldest is first, newest last
        setMessages(next);
        setText('');
        await saveMessages(next);
        // defer scroll to end until state updates and layout finishes
        setTimeout(() => {
            try { scrollRef.current?.scrollToEnd({ animated: true }); } catch (e) { /* ignore */ }
        }, 50);

        // insert into Supabase and reconcile optimistic message
        try {
            const id = uuidv4();
            const { data, error } = await supabase
                .from('messages')
                .insert([{ id, user: msg.user, content: msg.content, timestamp: msg.timestamp, color: msg.color }])
                .select()
            if (error) {
                console.warn('Failed to save message to Supabase:', error);
                setDbError('Failed to save message to the database.');
                // revert optimistic message
                setMessages(curr => curr.filter(m => m.id !== tempId));
                await saveMessages(messages.filter(m => m.id !== tempId));
                return;
            }
            if (data && data[0]) {
                const inserted = data[0] as any;
                // replace the optimistic message id/timestamp with the authoritative one
                setMessages(curr => {
                    const replaced = curr.map(m => m.id === tempId ? { ...m, id: String(inserted.id), timestamp: inserted.timestamp || m.timestamp } : m);
                    saveMessages(replaced).catch(() => {});
                    return replaced;
                });
            }
        } catch (e) {
            console.warn('Supabase insert error:', e);
        }
    };

    // Clears all rows from the Supabase `messages` table and local cache.
    async function clearMessagesInDb() {
        try {
            setDbError(null);
            // Delete all rows — use neq('id','') which matches any non-empty id value.
            const { error } = await supabase.from('messages').delete().neq('id', '');
            if (error) {
                console.warn('Failed to clear messages in DB:', error);
                setDbError('Failed to clear messages in database.');
                return;
            }
            // Clear local state and storage after successful DB delete
            setMessages([]);
            await saveMessages([]);
        } catch (e: any) {
            console.warn('Error clearing messages:', e);
            setDbError('Error clearing messages.');
        }
    }

    // subscribe to realtime inserts so other clients show messages live
    useEffect(() => {
        let channel: any;
        const start = async () => {
            try {
                channel = supabase
                    .channel('public:messages')
                    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: any) => {
                        const r = payload.new as any;
                        const incoming: message = { id: String(r.id), user: r.user || 'Unknown', content: r.content || '', timestamp: r.timestamp || new Date().toISOString(), color: r.color || '#ffffff' };
                        setMessages(curr => {
                            // Deduplicate: skip if we already have this id or an identical recent optimistic message
                            const exists = curr.some(m => m.id === incoming.id || (m.user === incoming.user && m.content === incoming.content && Math.abs(new Date(m.timestamp).getTime() - new Date(incoming.timestamp).getTime()) < 5000));
                            if (exists) return curr;
                            const next = [...curr, incoming];
                            saveMessages(next).catch(() => {});
                            return next;
                        });
                        try { scrollRef.current?.scrollToEnd({ animated: true }); } catch (e) { }
                    })
                    .subscribe();
            } catch (e: any) {
                console.warn('Realtime subscription failed:', e);
                setDbError('Realtime subscription failed (cannot reach database).');
            }
        };
        start();
        return () => {
            try {
                if (channel) {
                    // unsubscribe from the realtime channel
                    channel.unsubscribe?.();
                    // also remove with Supabase client if available
                    if (typeof supabase.removeChannel === 'function') {
                        try { supabase.removeChannel(channel); } catch (e) { /* ignore */ }
                    }
                }
            } catch (e) { }
        };
     }, []);

    const quotes: string[] = ["The ultimate aim of martial arts is not having to use them. - Miyamoto Musashi",
                            "Do not fight with the strength, absorb it, and it flows, use it. - Yip Man",
                            "Float like a butterfly, sting like a bee. - Muhammad Ali",
                            "It's not about how hard you hit; it's about how hard you can get hit and keep moving forward. - Tyler Woods",
                            "Empty your mind, be formless. Shapeless, like water. ― Bruce Lee ",
                            "Feedback is the breakfast of champions. - Ken Blanchard",
                            ];

    const [selectedQuote, setSelectedQuote] = useState<string>(() => quotes[Math.floor(Math.random() * quotes.length)]);

    // When messages becomes empty (initial load or after reset), pick a new quote.
    useEffect(() => {
        if (messages.length === 0) {
            setSelectedQuote(quotes[Math.floor(Math.random() * quotes.length)]);
        }
    }, [messages.length]);


    return (
        <View style={styles.container}>
            {dbError ? (
                <View style={{ width: '90%', backgroundColor: '#2b0414', padding: 8, borderRadius: 6, marginBottom: 8 }}>
                    <Text style={{ color: '#ffdddd', marginBottom: 6 }}>{dbError}</Text>
                    <TouchableOpacity onPress={() => { setDbError(null); loadMessages(); }} accessibilityRole="button">
                        <View style={{ paddingVertical: 6, paddingHorizontal: 8, backgroundColor: '#40050a', borderRadius: 4 }}>
                            <Text style={{ color: '#fff' }}>Retry</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            ) : null}
            {/*reset button*/}
            {devVer ? (
                <TouchableOpacity
                    style={{ width: '90%' }}
                    onPress={() => {
                        setMessages([]);
                        saveMessages([]);
                        clearMessagesInDb();
                    }}
                    accessibilityRole="button"
                >
                    <View
                        style={{
                            backgroundColor: c.card,
                            paddingVertical: 10,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: modeStr === 'dark' ? '#111' : '#e6e6e6',
                            alignItems: 'center',
                        }}
                    >
                        <Text style={{ color: c.text, fontWeight: 'bold', fontSize: 16 }}>Reset Chat</Text>
                    </View>
                </TouchableOpacity>
            ) : null}
            
            <ScrollView
                ref={scrollRef}
                style={{ width: '90%', paddingHorizontal: 16, marginTop: 8, paddingTop: 8, backgroundColor: c.card, flex: 1 }}
                onContentSizeChange={() => {
                    try { scrollRef.current?.scrollToEnd({ animated: true }); } catch (e) { /* ignore */ }
                }}
            >
                {messages.length === 0 ? (
                    <View style={{ height: 200, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: c.text, opacity: 0.8 }}>{selectedQuote}</Text>
                    </View>
                ) : (
                    messages.map(m => (
                        <View key={m.id} style={{ marginBottom: 8 }}>
                            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                                <Text style={{ color: m.color, fontWeight: 'bold' }}>{m.user}</Text>
                                <Text style={{ color: c.text, fontSize: 10 }}>{new Date(m.timestamp).toLocaleString()}</Text>
                            </View>
                            <Text style={{ color: c.text }}>{m.content}</Text>
                            <View style={[styles.separator, { marginTop: 8 }]} />
                        </View>
                    ))
                )}
            </ScrollView>
            <View style={{ display: 'flex', justifyContent: 'space-between', flexDirection: 'row', width: '100%', paddingHorizontal: 16, marginVertical: 8 }}>
                <TextInput
                    placeholder="Don't be a stranger :)"
                    placeholderTextColor={modeStr === 'dark' ? '#ccc' : '#666'}
                    style={{
                        backgroundColor: c.card,
                        color: c.text,
                        flex: 1,
                        paddingHorizontal: 10,
                        paddingVertical: 10,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: modeStr === 'dark' ? '#111' : '#e6e6e6',
                        marginRight: 8,
                    }}
                    multiline
                    returnKeyType="send"
                    blurOnSubmit={false}
                    onSubmitEditing={() => {sendMessage();}}
                    value={text}
                    maxLength={100} // character limit
                    onChangeText={(t) => setText(t.slice(0, 100))}
                />
                <TouchableOpacity onPress={() => {sendMessage();}} accessibilityRole="button">
                    <View style={{
                        backgroundColor: c.card,
                        paddingVertical: 16,
                        paddingHorizontal: 10,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: modeStr === 'dark' ? '#111' : '#e6e6e6',
                        alignItems: 'center',
                        alignSelf: 'stretch'   // <-- ensures it fills the wrapper
                    }}>
                        <Ionicons name="send" size={24} color={c.text} />
                    </View>
                </TouchableOpacity>
            </View>
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
            paddingTop: 8,
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
            marginVertical: 0,
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