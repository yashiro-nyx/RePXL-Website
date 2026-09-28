import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import { useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import type { FilterPreset } from '../data/colorProfiles';

// Mounted only while Try the Look is open. Closing it releases the camera.
export function LiveLookPreview({ preset }: { preset: FilterPreset }) {
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [compare, setCompare] = useState(false);
  const prompted = useRef(false);
  const [focused, setFocused] = useState(true);
  useFocusEffect(useCallback(() => {
    setFocused(true);
    return () => { setFocused(false); setReady(false); };
  }, []));

  async function askPermission() {
    setRequesting(true);
    setError('');
    try {
      await requestPermission();
    } catch {
      setError('Camera access could not be requested. Please try again.');
    } finally {
      setRequesting(false);
    }
  }

  useEffect(() => {
    if (!permission || prompted.current) return;
    prompted.current = true;
    if (!permission.granted && permission.canAskAgain) void askPermission();
  }, [permission]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      setAppActive(state === 'active');
      setReady(false);
      setCompare(false);
      if (state === 'active') {
        void getPermission().catch(() => setError('Could not check camera access. Please try again.'));
      }
    });
    return () => subscription.remove();
  }, [getPermission]);

  const live = permission?.granted && focused && appActive;
  const filtered = preset.id !== 'none' && !compare;

  return (
    <View style={{ gap: 10 }}>
      <View style={styles.preview}>
        {live && !error ? (
          <>
            <CameraView
              key={`${facing}-${attempt}`}
              style={StyleSheet.absoluteFill}
              facing={facing}
              mirror={facing === 'front'}
              mode="picture"
              onCameraReady={() => setReady(true)}
              onMountError={() => {
                setReady(false);
                setError('Camera unavailable. Close other camera apps or try another camera.');
              }}
            />
            {ready && filtered && (
              <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: preset.previewTint ?? '#ffffff', opacity: 0.28 }]} />
            )}
            {!ready && <View style={styles.message}><ActivityIndicator color="#fff" /><Text style={styles.text}>Opening camera…</Text></View>}
            {ready && <Text style={styles.badge}>{filtered ? preset.name : 'Original'} · LIVE</Text>}
          </>
        ) : (
          <View style={styles.message}>
            <Feather name="camera" size={30} color="#fff" />
            <Text style={styles.text}>{error || (!permission || requesting ? 'Checking camera access…' : !permission.granted ? 'Allow camera access to try sample looks on your surroundings.' : 'Camera preview paused.')}</Text>
            {(!permission || requesting) && <ActivityIndicator color="#fff" />}
            {permission && !permission.granted && !requesting && (
              <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={() => {
                if (permission.canAskAgain) void askPermission();
                else void Linking.openSettings().catch(() => setError('Open your device Settings and allow camera access for RePXL.'));
              }}>
                <Text style={styles.buttonText}>{permission.canAskAgain ? 'Allow camera' : 'Open Settings'}</Text>
              </TouchableOpacity>
            )}
            {permission?.granted && !!error && (
              <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={() => { setError(''); setReady(false); setAttempt((value) => value + 1); }}>
                <Text style={styles.buttonText}>Retry camera</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
      <View style={styles.controls}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Switch front and back camera" disabled={!live} style={styles.button} onPress={() => { setReady(false); setError(''); setFacing((value) => value === 'back' ? 'front' : 'back'); }}>
          <Feather name="refresh-cw" size={16} color="#fff" /><Text style={styles.buttonText}>Flip camera</Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected: compare }} disabled={!live || !ready} style={styles.button} onPress={() => setCompare((value) => !value)}>
          <Text style={styles.buttonText}>{compare ? 'Show sample look' : 'Show original'}</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.note}>Live color-tint approximation. Actual camera output and available built-in modes vary by model. No photos are captured or uploaded.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  preview: { width: '100%', aspectRatio: 4 / 3, borderRadius: 14, overflow: 'hidden', backgroundColor: '#111', justifyContent: 'center' },
  message: { padding: 24, gap: 14, alignItems: 'center' },
  text: { color: '#ddd', textAlign: 'center', fontFamily: 'Inter_400Regular', fontSize: 14 },
  badge: { position: 'absolute', bottom: 12, left: 12, right: 12, alignSelf: 'flex-start', padding: 8, borderRadius: 6, backgroundColor: '#000b', color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 12 },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' },
  button: { minHeight: 44, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10, backgroundColor: '#363639', flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#fff', fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  note: { color: '#aaa', fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18 },
});
