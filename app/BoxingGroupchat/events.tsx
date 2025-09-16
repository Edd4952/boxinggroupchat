import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { colorsFor, useThemeMode } from '../theme';

type Event = {
    title: string;
    date: string;
    location: string;
    description: string;
};

export default function Chat() {
    {/*for colors*/}
    const mode = useThemeMode();
    const styles = themedStyles(mode);
    const modeStr: 'light' | 'dark' = typeof mode === 'string'
        ? (mode as 'light' | 'dark')
        : (mode && (mode as any).mode) ? (mode as any).mode : 'light';
    const c = colorsFor(modeStr);

    // start empty; we'll load persisted events asynchronously
    const [events, setEvents] = useState<Event[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');
    const [location, setLocation] = useState('');
    const [description, setDescription] = useState('');

    const EVENTS_KEY = '@boxinggroupchat_events_v1';

    async function saveEventsToDevice(list: Event[]) {
        try {
            await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(list));
        } catch (e) {
            console.warn('Failed to save events to AsyncStorage:', e);
        }
    }

    async function loadEvents() {
        try {
            const raw = await AsyncStorage.getItem(EVENTS_KEY);
            if (!raw) {
                // no saved events
                setEvents([]);
                return;
            }
            const parsed = JSON.parse(raw) as Event[];
            if (Array.isArray(parsed)) {
                setEvents(parsed);
            }
        } catch (e) {
            console.warn('Failed to load events from AsyncStorage:', e);
        }
    }

    const resetForm = () => { setTitle(''); setDate(''); setLocation(''); setDescription(''); };

    const saveEvent = async () => {
        const e: Event = { title: title || 'Untitled', date: date || new Date().toLocaleDateString(), location: location || 'Unknown', description };
        const next = [e, ...events];
        setEvents(next);
        await saveEventsToDevice(next);
        setModalVisible(false);
        resetForm();
    };

    // load on mount and whenever the screen gains focus
    useEffect(() => {
        loadEvents();
    }, []);

    useFocusEffect(
        React.useCallback(() => {
            const loadOnFocus = async () => {
                try {
                    const raw = await AsyncStorage.getItem(EVENTS_KEY);
                    if (raw) {
                        const parsed = JSON.parse(raw);
                        console.log(parsed);
                        setEvents(parsed);
                    } else {
                        setEvents([]);
                    }
                } catch (e) {
                    console.warn('Failed to load events on focus:', e);
                }
            };
            loadOnFocus();
        }, [])
    );

    return (
        <View style={{ flex: 1, backgroundColor: c.bg }}>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container}>
                <Text style={styles.title}>Events</Text>
                
                {/* Event Box */}

                {events.map((ev, i) => (    
                    <View key={i} style={styles.eventbox}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={styles.text1}>{ev.title}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons name="calendar-outline" size={16} color={c.text} style={{ marginRight: 4 }} />
                                <Text style={styles.text1}>{ev.date}</Text>
                            </View>
                        </View>
                        <View style={styles.separator} />
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="location-outline" size={16} color={c.text} />
                            <Text style={[styles.text2, { marginLeft: 8 }]}>{ev.location}</Text>
                        </View>
                        <View style={styles.separator} />
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Text style={styles.text2}>{ev.description}</Text>
                            {/*delete button*/}
                            <Pressable onPress={async () => {
                                const next = events.filter((_, index) => index !== i);
                                setEvents(next);
                                await saveEventsToDevice(next);
                            }} accessibilityRole="button" style={{ marginLeft: 8 }}>
                                <Ionicons name="trash-outline" size={18} color={'red'} />
                            </Pressable>
                        </View>
                    </View>
                ))}

            </ScrollView>

            <View style={{ width: '100%', paddingHorizontal: 16, marginVertical: 8 }}>
                <TouchableOpacity onPress={() => setModalVisible(true)} accessibilityRole="button">
                    <View style={{
                        backgroundColor: c.card,
                        paddingVertical: 10,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: modeStr === 'dark' ? '#111' : '#e6e6e6',
                        alignItems: 'center',
                        alignSelf: 'stretch'   // <-- ensures it fills the wrapper
                    }}>
                        <Text style={{ color: c.text, fontWeight: 'bold', fontSize: 16 }}>+ Add Event</Text>
                    </View>
                </TouchableOpacity>
            </View>

            <Modal visible={modalVisible} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: c.card }]}> 
                        <Text style={[styles.text1, { marginBottom: 8 }]}>New Event</Text>
                        <TextInput placeholder="What's the move?" placeholderTextColor={modeStr === 'dark' ? '#ccc' : '#666'} value={title} onChangeText={setTitle} style={[styles.input, { color: c.text }]} />
                        <TextInput placeholder="When?" placeholderTextColor={modeStr === 'dark' ? '#ccc' : '#666'} value={date} onChangeText={setDate} style={[styles.input, { color: c.text }]} />
                        <TextInput placeholder="Drop the addy" placeholderTextColor={modeStr === 'dark' ? '#ccc' : '#666'} value={location} onChangeText={setLocation} style={[styles.input, { color: c.text }]} />
                        <TextInput placeholder="What's the word?" placeholderTextColor={modeStr === 'dark' ? '#ccc' : '#666'} value={description} onChangeText={setDescription} style={[styles.input, { color: c.text, height: 80 }]} multiline />

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, width: '100%' }}>
                            <Pressable onPress={() => { setModalVisible(false); resetForm(); }} style={[styles.modalButton, { backgroundColor: 'transparent', borderColor: modeStr === 'dark' ? '#444' : '#ccc' }]}>
                                <Text style={{ color: c.text }}>Cancel</Text>
                            </Pressable>
                            <Pressable onPress={saveEvent} style={[styles.modalButton, { backgroundColor: c.tint }]}>
                                <Text style={{ color: modeStr === 'dark' ? '#000' : '#fff' }}>Save</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
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
            display: 'flex',
            flexGrow: 1,
            width: '100%',
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
            marginVertical: 8,
            fontWeight: 'bold',
            lineHeight: 18,
        },
        text2: {
            color: c.text,
            fontSize: 14,
            marginVertical: 8,
            lineHeight: 16,
        },
        separator: {
            height: 1,
            backgroundColor: modeStr === 'dark' ? '#666' : '#ddd',
            marginVertical: 1,
        },
        eventbox: {
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            backgroundColor: c.card,
            borderRadius: 8,
            paddingHorizontal: 8,
            paddingVertical: 4,
            marginTop: 8,
            width: '90%',
            borderColor: modeStr === 'dark' ? '#111' : '#e6e6e6',
            borderWidth: 1,
        },
        modalOverlay: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.4)',
            padding: 16,
        },
        modalContent: {
            width: '100%',
            borderRadius: 8,
            padding: 12,
            alignItems: 'center',
        },
        input: {
            width: '100%',
            borderWidth: 1,
            borderRadius: 6,
            paddingHorizontal: 8,
            paddingVertical: 6,
            marginVertical: 6,
        },
        modalButton: {
            width: '48%',
            paddingVertical: 10,
            borderRadius: 6,
            borderWidth: 1,
            alignItems: 'center',
        },
    });
};