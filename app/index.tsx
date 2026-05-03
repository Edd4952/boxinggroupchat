import { EvilIcons, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { Link, router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "./supabase";
import { colorsFor, useThemeMode } from "./theme";

////////////////ITS RIGHT HERE///////////////////////////
export const devVer: boolean = false;
/////////////////////////////////////////////////////////

const HomePage = () => {
  const mode = useThemeMode();
  const modeStr: "light" | "dark" =
    typeof mode === "string"
      ? (mode as "light" | "dark")
      : mode && (mode as any).mode
        ? (mode as any).mode
        : "light";
  const c = colorsFor(modeStr);
  const fade1 = useRef(new Animated.Value(0)).current;
  const fade2 = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<any>(null);
  const emailSpinnerRotation = useRef(new Animated.Value(0)).current;
  const emailSpinnerOpacity = useRef(new Animated.Value(1)).current;

  useFocusEffect(
    React.useCallback(() => {
      // reset
      fade1.setValue(0);
      fade2.setValue(0);
      // sequence: fade in first, then second, then the rest of the UI
      Animated.timing(fade1, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start(() => {
        Animated.timing(fade2, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }).start(() => {});
      });
      return () => {
        fade1.setValue(0);
        fade2.setValue(0);
      };
    }, [fade1, fade2]),
  );
  const PROFILE_KEY = "@boxinggroupchat_profile_v1";
  const EMAIL_PREF_KEY = "@boxinggroupchat_email_pref_v1";
  const EMAIL_ROW_ID_KEY = "@boxinggroupchat_email_row_id_v1";
  const [profileName, setProfileName] = useState("");
  const [profileColor, setProfileColor] = useState("#ffffff");
  const [email, setEmail] = useState("");
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [emailRowId, setEmailRowId] = useState<number | null>(null);
  const [savingEmail, setSavingEmail] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastError, setToastError] = useState(false);
  const [showEmailSpinner, setShowEmailSpinner] = useState(true);

  const emailSpinnerRotate = emailSpinnerRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  function showToast(msg: string, isError = false) {
    setToastMsg(msg);
    setToastError(isError);
    setToastVisible(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 2500);
  }

  function isValidEmail(value: string) {
    const normalized = value.trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
  }

  function normalizeEmail(value: string) {
    return value.trim().toLowerCase();
  }

  async function saveEmailPreferenceLocal(
    nextEmail: string,
    nextStatus: boolean,
  ) {
    try {
      const obj = { email: nextEmail, status: nextStatus };
      await AsyncStorage.setItem(EMAIL_PREF_KEY, JSON.stringify(obj));
    } catch (e) {
      console.warn("Failed to save local email preference:", e);
    }
  }

  async function loadEmailPreferenceLocal() {
    try {
      const rawPref = await AsyncStorage.getItem(EMAIL_PREF_KEY);
      if (rawPref) {
        const parsed = JSON.parse(rawPref) as {
          email?: string;
          status?: boolean;
        } | null;
        if (parsed?.email) setEmail(parsed.email);
        if (typeof parsed?.status === "boolean") setEmailEnabled(parsed.status);
      }
      const rawId = await AsyncStorage.getItem(EMAIL_ROW_ID_KEY);
      if (rawId) {
        const parsedId = Number(rawId);
        if (!Number.isNaN(parsedId)) setEmailRowId(parsedId);
      }
    } catch (e) {
      console.warn("Failed to load local email preference:", e);
    }
  }

  async function insertEmailRecord(nextEmail: string, nextStatus: boolean) {
    const normalizedEmail = normalizeEmail(nextEmail);
    const { data, error } = await supabase
      .from("emails")
      .insert([{ email: normalizedEmail, status: nextStatus }])
      .select("id")
      .single();
    if (error) throw error;
    const insertedId = Number((data as any)?.id);
    if (!Number.isNaN(insertedId)) {
      setEmailRowId(insertedId);
      await AsyncStorage.setItem(EMAIL_ROW_ID_KEY, String(insertedId));
    }
  }

  async function findLatestEmailRowIdByEmail(emailAddress: string) {
    const normalizedEmail = normalizeEmail(emailAddress);
    const { data, error } = await supabase
      .from("emails")
      .select("id")
      .ilike("email", normalizedEmail)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    const latestId = Number((data as any)?.id);
    return Number.isNaN(latestId) ? null : latestId;
  }

  async function updateEmailStatusInDb(
    nextStatus: boolean,
    emailAddress: string,
  ) {
    const targetEmail = normalizeEmail(emailAddress);
    if (!targetEmail) {
      throw new Error("Please submit an email address first.");
    }

    if (emailRowId !== null) {
      const { error } = await supabase
        .from("emails")
        .update({ status: nextStatus })
        .eq("id", emailRowId);
      if (!error) return;
    }

    const latestId = await findLatestEmailRowIdByEmail(targetEmail);
    if (latestId !== null) {
      const { error: updateErr } = await supabase
        .from("emails")
        .update({ status: nextStatus })
        .eq("id", latestId);
      if (updateErr) throw updateErr;
      setEmailRowId(latestId);
      await AsyncStorage.setItem(EMAIL_ROW_ID_KEY, String(latestId));
      return;
    }

    await insertEmailRecord(targetEmail, nextStatus);
  }

  async function submitEmail() {
    const normalized = normalizeEmail(email);
    if (!normalized) {
      showToast("Please enter your email address.", true);
      return;
    }
    if (!isValidEmail(normalized)) {
      showToast("Please enter a valid email address.", true);
      return;
    }

    setSavingEmail(true);
    try {
      const existingId = await findLatestEmailRowIdByEmail(normalized);
      if (existingId !== null) {
        const { error: existingUpdateErr } = await supabase
          .from("emails")
          .update({ status: true })
          .eq("id", existingId);

        if (existingUpdateErr) throw existingUpdateErr;

        setEmailRowId(existingId);
        setEmail(normalized);
        setEmailEnabled(true);
        await AsyncStorage.setItem(EMAIL_ROW_ID_KEY, String(existingId));
        await saveEmailPreferenceLocal(normalized, true);
        showToast("That email already exists. Notifications are enabled.");
        return;
      }

      await insertEmailRecord(normalized, true);
      setEmail(normalized);
      setEmailEnabled(true);
      await saveEmailPreferenceLocal(normalized, true);
      showToast("Email notifications are now enabled.");
    } catch (e: any) {
      const parts = [
        e?.message || String(e),
        e?.code ? `code: ${e.code}` : null,
        e?.details ? `details: ${e.details}` : null,
        e?.hint ? `hint: ${e.hint}` : null,
      ].filter(Boolean);
      const msg = parts.join("\n");
      console.error("Email insert error:", e);
      showToast(msg, true);
    } finally {
      setSavingEmail(false);
    }
  }

  async function toggleEmailNotifications(next: boolean) {
    const normalized = normalizeEmail(email);
    if (!normalized) {
      showToast("Please submit an email address first.", true);
      return;
    }

    setEmailEnabled(next);
    await saveEmailPreferenceLocal(normalized, next);
    try {
      await updateEmailStatusInDb(next, normalized);
    } catch (e: any) {
      const msg = e?.message || String(e);
      showToast(msg, true);
      setEmailEnabled(!next);
      await saveEmailPreferenceLocal(normalized, !next);
    }
  }

  async function saveProfile(name?: string, color?: string) {
    try {
      const obj = { name: name ?? profileName, color: color ?? profileColor };
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(obj));
    } catch (e) {
      console.warn("Failed to save profile:", e);
    }
  }

  async function loadProfile() {
    try {
      const raw = await AsyncStorage.getItem(PROFILE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        name?: string;
        color?: string;
      } | null;
      if (!parsed) return;
      if (parsed.name) setProfileName(parsed.name);
      if (parsed.color) setProfileColor(parsed.color);
    } catch (e) {
      console.warn("Failed to load profile:", e);
    }
  }

  useEffect(() => {
    loadProfile();
    loadEmailPreferenceLocal();
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!showEmailSpinner) return;

    const rotationLoop = Animated.loop(
      Animated.timing(emailSpinnerRotation, {
        toValue: 1,
        duration: 2400,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    rotationLoop.start();

    return () => {
      rotationLoop.stop();
      emailSpinnerRotation.stopAnimation();
    };
  }, [emailSpinnerRotation, showEmailSpinner]);

  useEffect(() => {
    if (!showEmailSpinner) return;

    const timeoutId = setTimeout(() => {
      Animated.timing(emailSpinnerOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setShowEmailSpinner(false);
          emailSpinnerOpacity.setValue(1);
        }
      });
    }, 5000);

    return () => {
      clearTimeout(timeoutId);
      emailSpinnerOpacity.stopAnimation();
    };
  }, [emailSpinnerOpacity, showEmailSpinner]);

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <Animated.Text style={[styles.text, { color: c.text, opacity: fade1 }]}>
        Welcome to
      </Animated.Text>
      <Animated.Text
        style={[
          styles.text,
          {
            fontSize: 36,
            fontWeight: "bold",
            color: c.text,
            marginBottom: 16,
            opacity: fade2,
          },
        ]}
      >
        Boxing Group Chat
      </Animated.Text>
      <View style={{ width: "100%", paddingHorizontal: 16, marginBottom: 12 }}>
        <Text style={{ color: c.text, marginBottom: 6 }}>Name</Text>
        <TextInput
          placeholder="Your name"
          placeholderTextColor={modeStr === "dark" ? "#ccc" : "#666"}
          value={profileName}
          onChangeText={(text) => {
            setProfileName(text);
            saveProfile(text, undefined);
          }}
          onBlur={() => {
            saveProfile();
          }}
          style={{
            backgroundColor: c.card,
            color: c.text,
            paddingHorizontal: 10,
            paddingVertical: 8,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: modeStr === "dark" ? "#111" : "#e6e6e6",
            marginBottom: 8,
          }}
        />
        <Text style={{ color: c.text, marginBottom: 12 }}>Color</Text>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 0,
          }}
        >
          {[
            "#4f46e5",
            "#ef4444",
            "#f59e0b",
            "#10b981",
            "#06b6d4",
            "#a78bfa",
          ].map((col) => (
            <TouchableOpacity
              key={col}
              onPress={() => {
                setProfileColor(col);
                saveProfile(undefined, col);
              }}
              accessibilityRole="button"
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: col,
                  borderWidth: profileColor === col ? 3 : 1,
                  borderColor:
                    profileColor === col
                      ? modeStr === "dark"
                        ? "#fff"
                        : "#000"
                      : "#ccc",
                }}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Link
        style={[styles.button]}
        href={{ pathname: "/BoxingGroupchat/chat", params: { id: "1" } }}
      >
        <Text style={[styles.text, { color: c.text }]}>Open chat</Text>
      </Link>
      {Platform.OS === "web" && <></>}
      <Pressable
        style={[styles.button2]}
        onPress={() => router.push({ pathname: "/BoxingGroupchat/events" })}
      >
        <Text style={[styles.text, { color: c.text }]}>View events</Text>
      </Pressable>
      <Pressable
        style={[styles.button2]}
        onPress={() => router.push({ pathname: "/BoxingGroupchat/about" })}
      >
        <Text style={[styles.text, { color: c.text }]}>About Page</Text>
      </Pressable>
      <View
        style={{
          width: "100%",
          paddingHorizontal: 16,
        }}
      >
        <View
          style={{
            backgroundColor: c.card,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: modeStr === "dark" ? "#111" : "#e6e6e6",
            padding: 8,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <View style={{ position: "relative", width: 22, height: 22 }}>
                {showEmailSpinner ? (
                  <Animated.View
                    pointerEvents="none"
                    style={{
                      position: "absolute",
                      top: -28,
                      left: -26,
                      zIndex: 999,
                      elevation: 10,
                      opacity: emailSpinnerOpacity,
                      transform: [{ rotate: emailSpinnerRotate }],
                    }}
                  >
                    <EvilIcons name="spinner" size={72} color="red" />
                  </Animated.View>
                ) : null}
                <Ionicons
                  name="mail-outline"
                  size={22}
                  style={{ color: "#fff" }}
                />
              </View>
              <Text
                style={{
                  color: c.text,
                  fontSize: 16,
                  fontWeight: "bold",
                }}
              >
                GET NOTIFIED
              </Text>
            </View>
            <Switch
              value={emailEnabled}
              onValueChange={toggleEmailNotifications}
              disabled={savingEmail}
            />
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "stretch",
            }}
          >
            <TextInput
              placeholder="you@example.com"
              placeholderTextColor={modeStr === "dark" ? "#ccc" : "#666"}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
              onBlur={() =>
                saveEmailPreferenceLocal(email.trim(), emailEnabled)
              }
              style={{
                flex: 5,
                backgroundColor: c.bg,
                color: c.text,
                paddingHorizontal: 10,
                paddingVertical: 8,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: modeStr === "dark" ? "#111" : "#e6e6e6",
                marginRight: 6,
                zIndex: 0,
              }}
            />
            <TouchableOpacity
              accessibilityRole="button"
              onPress={submitEmail}
              disabled={savingEmail}
              style={{ flex: 1, alignSelf: "stretch" }}
            >
              <View
                style={{
                  flex: 1,
                  backgroundColor: "#007AFF",
                  opacity: savingEmail ? 0.7 : 1,
                  borderRadius: 8,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {savingEmail ? (
                  <Ionicons name="hourglass-outline" size={22} color="#fff" />
                ) : (
                  <Ionicons name="return-down-forward" size={22} color="#fff" />
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      {toastVisible ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            bottom: 40,
            alignSelf: "center",
            backgroundColor: toastError ? "#dc3545" : "#28a745",
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 12,
            elevation: 6,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            zIndex: 9999,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "600" }}>{toastMsg}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#222",
    gap: 8,
  },
  text: {
    color: "white",
    fontSize: 28,
  },
  link: {
    color: "#007AFF",
    fontSize: 18,
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#007AFF",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  button2: {
    backgroundColor: "grey",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
});

export default HomePage;
