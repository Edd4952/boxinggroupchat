import { Link, router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colorsFor, useThemeMode } from './theme';

const HomePage = () => {
  const { mode } = useThemeMode();
  const c = colorsFor(mode);

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