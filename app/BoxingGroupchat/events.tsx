import { Ionicons } from "@expo/vector-icons";
// AsyncStorage fallback removed — DB is now the source of truth
import { useFocusEffect } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { devVer } from "../index";
import { colorsFor, useThemeMode } from "../theme";

import { supabase } from "../supabase";
import { getUserId } from "../userUtils";

type Event = {
  id: string;
  title: string;
  date: string;
  location: string;
  description: string | null;
  user_id?: string;
};

type NewEvent = {
  title: string;
  date: string;
  location: string;
  description: string | null;
};

export default function Chat() {
  {
    /*for colors*/
  }
  const mode = useThemeMode();
  const styles = themedStyles(mode);
  const modeStr: "light" | "dark" =
    typeof mode === "string"
      ? (mode as "light" | "dark")
      : mode && (mode as any).mode
        ? (mode as any).mode
        : "light";
  const c = colorsFor(modeStr);

  // start empty; we'll load persisted events asynchronously
  const [events, setEvents] = useState<Event[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  // no device cache key — we don't fall back to AsyncStorage anymore

  async function loadEvents() {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, date, location, description, user_id")
        .order("date", { ascending: true })
        .limit(500);
      if (error) throw error;
      if (data && Array.isArray(data)) {
        const mapped = data.map((r: any) => ({
          id: String(r.id),
          title: r.title || "Untitled",
          date: r.date || new Date().toLocaleDateString(),
          location: r.location || "Unknown",
          description: r.description ?? null,
          user_id: r.user_id,
        }));
        setEvents(mapped);
        setDbError(null);
        console.log("events loaded from database:", mapped);
        return;
      }
      // no rows => empty list, clear any db error
      setEvents([]);
      setDbError(null);
    } catch (e: any) {
      console.warn("Supabase load failed:", e);
      setEvents([]); // clear UI when DB isn't reachable
      setDbError(
        "Could not reach database. Please check your network or try again.",
      );
    }
  }

  const resetForm = () => {
    setTitle("");
    setDate("");
    setLocation("");
    setDescription("");
  };

  async function loadUserId() {
    try {
      const id = await getUserId();
      setUserId(id);
    } catch (e) {
      console.warn("Failed to load user ID:", e);
    }
  }

  // Save a single event to Supabase and update local state
  async function saveEvent() {
    const e: NewEvent = {
      title: title || "Untitled",
      date: date || new Date().toLocaleDateString(),
      location: location || "Unknown",
      description: description.trim() ? description.trim() : null,
    };
    try {
      const { data, error } = await supabase
        .from("events")
        .insert([{ ...e, user_id: userId }])
        .select()
        .single();
      if (error) throw error;
      const created: Event = {
        id: String((data as any).id),
        title: (data as any).title,
        date: (data as any).date,
        location: (data as any).location,
        description: (data as any).description,
        user_id: (data as any).user_id,
      };
      // prepend newest at top to keep existing UI order
      setEvents((curr) => [created, ...curr]);
      setDbError(null);
    } catch (err: any) {
      console.warn("Failed to save event to database:", err);
      setDbError("Failed to save event to database.");
    } finally {
      setModalVisible(false);
      resetForm();
    }
  }

  // load on mount and whenever the screen gains focus (DB-only)
  useEffect(() => {
    loadEvents();
    loadUserId();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      // Re-fetch events from Supabase whenever the screen gains focus.
      loadEvents();
      loadUserId();
    }, []),
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {dbError ? (
        <View
          style={{
            width: "90%",
            alignSelf: "center",
            backgroundColor: "#2b0414",
            padding: 8,
            borderRadius: 6,
            marginTop: 8,
            marginBottom: 4,
          }}
        >
          <Text style={{ color: "#ffdddd", marginBottom: 6 }}>{dbError}</Text>
          <TouchableOpacity
            onPress={() => {
              setDbError(null);
              loadEvents();
            }}
            accessibilityRole="button"
          >
            <View
              style={{
                paddingVertical: 6,
                paddingHorizontal: 8,
                backgroundColor: "#40050a",
                borderRadius: 4,
                alignSelf: "flex-start",
              }}
            >
              <Text style={{ color: "#fff" }}>Retry</Text>
            </View>
          </TouchableOpacity>
        </View>
      ) : null}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            paddingHorizontal: 16,
            marginBottom: 8,
          }}
        >
          <Text style={styles.title}>Events</Text>
          <TouchableOpacity onPress={loadEvents} accessibilityRole="button" style={{ paddingTop: 8 }}>
            <Ionicons name="refresh" size={30} color={c.text} />
          </TouchableOpacity>
        </View>

        {/* Event Box */}

        {events.length === 0 ? (
          <View
            style={{
              height: 200,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: c.text, opacity: 0.8 }}>
              No events yet — tap &quot;+ Add Event&quot; to add one.
            </Text>
          </View>
        ) : (
          events.map((ev) => (
            <View key={ev.id} style={styles.eventbox}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text style={styles.text1}>{ev.title}</Text>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons
                    name="calendar-outline"
                    size={16}
                    color={c.text}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.text1}>{ev.date}</Text>
                </View>
              </View>
              <View style={styles.separator} />
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="location-outline" size={16} color={c.text} />
                <Text style={[styles.text2, { marginLeft: 8 }]}>
                  {ev.location}
                </Text>
              </View>
              <View style={styles.separator} />
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text style={styles.text2}>{ev.description}</Text>
                {devVer || ev.user_id === userId ? (
                  <Pressable
                    onPress={async () => {
                      try {
                        const { data, error } = await supabase
                          .from("events")
                          .delete()
                          .eq("id", ev.id)
                          .select("id");
                        if (error) throw error;
                        if (!data || data.length === 0) {
                          setDbError(
                            "Delete failed: event was not found in database.",
                          );
                          await loadEvents();
                          return;
                        }
                        const next = events.filter((item) => item.id !== ev.id);
                        setEvents(next);
                        setDbError(null);
                      } catch (err: any) {
                        console.warn("Failed to delete event from DB:", err);
                        setDbError("Failed to delete event from database.");
                      }
                    }}
                    accessibilityRole="button"
                    style={{ marginLeft: 8 }}
                  >
                    <Ionicons name="trash-outline" size={18} color={"red"} />
                  </Pressable>
                ) : null}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <View style={{ width: "100%", paddingHorizontal: 16, marginVertical: 8 }}>
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          accessibilityRole="button"
        >
          <View
            style={{
              backgroundColor: c.card,
              paddingVertical: 10,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: modeStr === "dark" ? "#111" : "#e6e6e6",
              alignItems: "center",
              alignSelf: "stretch", // <-- ensures it fills the wrapper
            }}
          >
            <Text style={{ color: c.text, fontWeight: "bold", fontSize: 16 }}>
              + Add Event
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <Modal visible={modalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: c.card }]}>
            <Text style={[styles.text1, { marginBottom: 8 }]}>Add Event</Text>
            <TextInput
              placeholder="What's the move?"
              placeholderTextColor={modeStr === "dark" ? "#ccc" : "#666"}
              value={title}
              onChangeText={setTitle}
              style={[styles.input, { color: c.text }]}
            />
            <TextInput
              placeholder="When?"
              placeholderTextColor={modeStr === "dark" ? "#ccc" : "#666"}
              value={date}
              onChangeText={setDate}
              style={[styles.input, { color: c.text }]}
            />
            <TextInput
              placeholder="Drop the addy"
              placeholderTextColor={modeStr === "dark" ? "#ccc" : "#666"}
              value={location}
              onChangeText={setLocation}
              style={[styles.input, { color: c.text }]}
            />
            <TextInput
              placeholder="What's the word?"
              placeholderTextColor={modeStr === "dark" ? "#ccc" : "#666"}
              value={description}
              onChangeText={setDescription}
              style={[styles.input, { color: c.text, height: 80 }]}
              multiline
            />

            <Text style={[styles.text2, { marginTop: 4, marginBottom: 0, lineHeight: 20 }]}>When you post an event, everyone will be notified via email.</Text>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 12,
                width: "100%",
              }}
            >
              <Pressable
                onPress={() => {
                  setModalVisible(false);
                  resetForm();
                }}
                style={[
                  styles.modalButton,
                  {
                    backgroundColor: "transparent",
                    borderColor: modeStr === "dark" ? "#444" : "#ccc",
                  },
                ]}
              >
                <Text style={{ color: c.text }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={saveEvent}
                style={[styles.modalButton, { backgroundColor: c.tint }]}
              >
                <Text style={{ color: modeStr === "dark" ? "#000" : "#fff" }}>
                  Save
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const themedStyles = (mode: any) => {
  const modeStr: "light" | "dark" =
    typeof mode === "string"
      ? (mode as "light" | "dark")
      : mode && (mode as any).mode
        ? (mode as any).mode
        : "light";
  const c = colorsFor(modeStr);
  return StyleSheet.create({
    container: {
      display: "flex",
      flexGrow: 1,
      width: "100%",
      flexDirection: "column",
      justifyContent: "flex-start",
      alignItems: "center",
      backgroundColor: c.bg,
    },
    title: {
      color: c.text,
      fontSize: 28,
      marginTop: 8,
      marginLeft: 8,
      fontWeight: "bold",
    },
    text1: {
      color: c.text,
      fontSize: 18,
      marginVertical: 8,
      fontWeight: "bold",
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
      backgroundColor: modeStr === "dark" ? "#666" : "#ddd",
      marginVertical: 1,
    },
    eventbox: {
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      backgroundColor: c.card,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
      marginTop: 8,
      width: "90%",
      borderColor: modeStr === "dark" ? "#111" : "#e6e6e6",
      borderWidth: 1,
    },
    modalOverlay: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(0,0,0,0.4)",
      padding: 16,
    },
    modalContent: {
      width: "100%",
      borderRadius: 8,
      padding: 12,
      alignItems: "center",
    },
    input: {
      width: "100%",
      borderWidth: 1,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 6,
      marginVertical: 6,
    },
    modalButton: {
      width: "48%",
      paddingVertical: 10,
      borderRadius: 6,
      borderWidth: 1,
      alignItems: "center",
    },
  });
};
