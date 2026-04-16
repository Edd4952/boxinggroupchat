import AsyncStorage from "@react-native-async-storage/async-storage";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";

const USER_ID_KEY = "@boxinggroupchat_user_id_v1";

/**
 * Get or create a persistent user ID for this device.
 * Generates a random UUID on first call and stores it in AsyncStorage.
 * All subsequent calls return the same ID.
 */
export async function getUserId(): Promise<string> {
  try {
    // Check if we already have a stored user_id
    const stored = await AsyncStorage.getItem(USER_ID_KEY);
    if (stored) {
      return stored;
    }

    // Generate a new user_id
    const newId = uuidv4();
    await AsyncStorage.setItem(USER_ID_KEY, newId);
    return newId;
  } catch (e) {
    console.warn("Failed to get/create user ID:", e);
    // Fallback: generate one but don't persist (won't be ideal but won't crash)
    return uuidv4();
  }
}

/**
 * Clear the stored user ID (mainly for testing/debugging)
 */
export async function clearUserId(): Promise<void> {
  try {
    await AsyncStorage.removeItem(USER_ID_KEY);
  } catch (e) {
    console.warn("Failed to clear user ID:", e);
  }
}
