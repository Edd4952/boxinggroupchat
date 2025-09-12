import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { colorsFor, useThemeMode } from '../theme';

const About = () => {
    const { id } = useLocalSearchParams();
    const { mode } = useThemeMode();
    const styles = themedStyles(mode);

    return (
        <View style={styles.container}>
            <View style={styles.topic}>
                <Text style={styles.title}>About Page</Text>
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
                <Text style={styles.title}>Found a bug?</Text>
                <Text style={[styles.title, {marginTop: 0}]}>Recommendations?</Text>
                <Text style={[styles.title, {marginTop: 0}]}>Questions?</Text>
                <Text style={styles.text2}>
                    Reach out to our skilled team of professionals!{'\n\n'}
                    Email: zilbert3dward@gmail.com
                    {'\n'}1-(847) 533-7331
                </Text>
            </View>
        </View>
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
            margin: 8,
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
            marginTop: 16,
            width: '90%',
            borderColor: mode === 'dark' ? '#111' : '#e6e6e6',
            borderWidth: 1,
            gap: 8,
        },
    });
};

export default About;