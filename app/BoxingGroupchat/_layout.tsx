import { Tabs } from "expo-router";
import { HeaderTitle } from "@react-navigation/elements";
import { Ionicons } from '@expo/vector-icons';

const RootLayout = () => {
  return (
    <Tabs>
      <Tabs.Screen name="chat" options={{
        headerTitle: "Chat",
        headerShown: false,
        tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" color={color} size={size} />
          ),
      }} />
      <Tabs.Screen name="events" options={{
        headerTitle: "Events",
        headerShown: false,
        tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" color={color} size={size} />
          ),
      }} />
      <Tabs.Screen name="about" options={{
        headerTitle: "About",
        headerShown: false,
        tabBarIcon: ({ color, size }) => (
            <Ionicons name="information-circle" color={color} size={size} />
          ),
      }} />
    </Tabs>
  );
};

export default RootLayout;