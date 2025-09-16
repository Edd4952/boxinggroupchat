import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
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
    const scrollRef = useRef<ScrollView | null>(null);

    async function saveMessages(list: message[]) {
        try {
            await AsyncStorage.setItem(MESSAGES_KEY, JSON.stringify(list));
        } catch (e) {
            console.warn('Failed to save messages:', e);
        }
    }

    async function loadMessages() {
        try {
            const raw = await AsyncStorage.getItem(MESSAGES_KEY);
            if (!raw) {
                setMessages([]);
                return;
            }
            const parsed = JSON.parse(raw) as message[];
            if (Array.isArray(parsed)) setMessages(parsed);
        } catch (e) {
            console.warn('Failed to load messages:', e);
            setMessages([]);
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
    const msg: message = { id: Date.now().toString(), user: profileName || 'You', content: text.trim(), timestamp: new Date().toISOString(), color: profileColor };
        const next = [...messages, msg]; // append so oldest is first, newest last
        setMessages(next);
        setText('');
        await saveMessages(next);
        // defer scroll to end until state updates and layout finishes
        setTimeout(() => {
            try { scrollRef.current?.scrollToEnd({ animated: true }); } catch (e) { /* ignore */ }
        }, 50);
    };

    return (
        <View style={styles.container}>
            {/*reset button*/}
            <TouchableOpacity style={{ width: '90%' }} onPress={() => { setMessages([]); saveMessages([]); }} accessibilityRole="button">
                <View style={{
                    backgroundColor: c.card,
                    paddingVertical: 10,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: modeStr === 'dark' ? '#111' : '#e6e6e6',
                    alignItems: 'center',
                }}>
                    <Text style={{ color: c.text, fontWeight: 'bold', fontSize: 16 }}>Reset Chat</Text>
                </View>
            </TouchableOpacity>
            <ScrollView
                ref={scrollRef}
                style={{ width: '90%', paddingHorizontal: 16, marginTop: 8, paddingTop: 8, backgroundColor: c.card, flex: 1 }}
                onContentSizeChange={() => {
                    try { scrollRef.current?.scrollToEnd({ animated: true }); } catch (e) { /* ignore */ }
                }}
            >
                {messages.map(m => (
                    <View key={m.id} style={{ marginBottom: 8 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                            <Text style={{ color: m.color, fontWeight: 'bold' }}>{m.user}</Text>
                            <Text style={{ color: c.text, fontSize: 10 }}>{new Date(m.timestamp).toLocaleString()}</Text>
                        </View>
                        <Text style={{ color: c.text }}>{m.content}</Text>
                        
                        <View style={[styles.separator, { marginTop: 8 }]} />
                    </View>
                    
                ))}
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
                    onChangeText={setText}
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