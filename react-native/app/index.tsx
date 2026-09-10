import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height } = Dimensions.get('window');

export default function SplashScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#5a1010', '#2a0505', '#0d0d0d']}
        start={{ x: 0.6, y: 0 }}
        end={{ x: 0.2, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <Image
        source={{ uri: 'https://images.unsplash.com/photo-1516961642265-531546e84af2?w=500&h=700&fit=crop&auto=format' }}
        style={styles.heroImage}
        resizeMode="cover"
      />

      <LinearGradient
        colors={['transparent', 'rgba(13,13,13,0.85)', '#0d0d0d']}
        style={styles.fadeOverlay}
      />

      <View style={[styles.content, { paddingBottom: insets.bottom + 48 }]}>
        <View style={styles.logoRow}>
          <View style={styles.bracket} />
          <Text style={styles.logoText}>RePXL</Text>
          <View style={styles.dot} />
          <View style={styles.bracket} />
        </View>

        <Text style={styles.tagline}>
          Your trusted marketplace for vintage digital cameras.
        </Text>

        <TouchableOpacity
          style={styles.startBtn}
          onPress={() => router.replace('/(tabs)/home')}
          activeOpacity={0.85}
        >
          <Text style={styles.startBtnText}>Start</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  heroImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.65,
    opacity: 0.55,
  },
  fadeOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.5,
  },
  content: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bracket: {
    width: 12,
    height: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 2,
  },
  logoText: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 26,
    color: '#fff',
    letterSpacing: -0.5,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#c62828',
  },
  tagline: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 22,
  },
  startBtn: {
    marginTop: 8,
    backgroundColor: '#c62828',
    paddingVertical: 14,
    paddingHorizontal: 52,
    borderRadius: 10,
  },
  startBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: '#fff',
    letterSpacing: 0.3,
  },
});
