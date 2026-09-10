import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';

const FIELDS = [
  { key: 'name', label: 'FULL NAME', placeholder: 'Alex Reyes', type: 'default' },
  { key: 'email', label: 'EMAIL ADDRESS', placeholder: 'you@example.com', type: 'email-address' },
  { key: 'password', label: 'PASSWORD', placeholder: 'Min. 8 characters', type: 'password' },
  { key: 'confirm', label: 'CONFIRM PASSWORD', placeholder: 'Repeat password', type: 'password' },
] as const;

export default function SignupScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useApp();
  const [vals, setVals] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');

  const set = (k: keyof typeof vals) => (v: string) => { setVals((p) => ({ ...p, [k]: v })); setError(''); };

  const handleSignup = () => {
    if (!vals.name || !vals.email || !vals.password || !vals.confirm) { setError('Please fill in all fields.'); return; }
    if (vals.password !== vals.confirm) { setError('Passwords do not match.'); return; }
    if (vals.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    login({ name: vals.name, email: vals.email, joined: 'September 2026' });
    router.replace('/(tabs)/account');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <LinearGradient colors={['#5a1010', '#2a0505', 'transparent']} start={{ x: 0.8, y: 0 }} end={{ x: 0, y: 1 }} style={styles.gradient} />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} style={{ alignSelf: 'flex-start', marginBottom: 32 }}>
            <Feather name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>

          <View style={styles.logoRow}>
            <Text style={styles.logoText}>RePXL</Text>
            <View style={styles.logoDot} />
          </View>

          <Text style={styles.heading}>Create account</Text>
          <Text style={styles.sub}>Join the RePXL community today</Text>

          {FIELDS.map(({ key, label, placeholder, type }) => (
            <View key={key} style={styles.field}>
              <Text style={styles.fieldLabel}>{label}</Text>
              <TextInput
                value={vals[key]}
                onChangeText={set(key)}
                placeholder={placeholder}
                placeholderTextColor="#444"
                style={styles.input}
                keyboardType={type === 'email-address' ? 'email-address' : 'default'}
                secureTextEntry={type === 'password'}
                autoCapitalize={type === 'default' ? 'words' : 'none'}
              />
            </View>
          ))}

          <Text style={styles.terms}>
            By creating an account, you agree to our{' '}
            <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>

          {!!error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity style={styles.primaryBtn} onPress={handleSignup} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>Create Account</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/login')} style={{ marginTop: 20, alignSelf: 'center' }}>
            <Text style={styles.switchText}>
              Already have an account? <Text style={styles.switchLink}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  gradient: { position: 'absolute', top: 0, right: 0, width: 280, height: 280 },
  content: { paddingHorizontal: 24, paddingBottom: 48, paddingTop: 20 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 24 },
  logoText: { fontFamily: 'Inter_800ExtraBold', fontSize: 20, color: '#fff', borderWidth: 1.5, borderColor: '#fff', paddingHorizontal: 6, paddingVertical: 2 },
  logoDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#c62828', marginLeft: 3 },
  heading: { fontFamily: 'Inter_800ExtraBold', fontSize: 28, color: '#fff', marginBottom: 6 },
  sub: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#666', marginBottom: 28 },
  field: { marginBottom: 16 },
  fieldLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#888', letterSpacing: 0.5, marginBottom: 8 },
  input: { backgroundColor: '#1c1c1e', borderWidth: 1, borderColor: '#2c2c2e', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#fff', fontFamily: 'Inter_400Regular' },
  terms: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#555', textAlign: 'center', lineHeight: 18, marginBottom: 16 },
  termsLink: { color: '#c62828' },
  error: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#f44336', textAlign: 'center', marginBottom: 8 },
  primaryBtn: { backgroundColor: '#c62828', borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  primaryBtnText: { fontFamily: 'Inter_700Bold', fontSize: 15, color: '#fff', letterSpacing: 0.3 },
  switchText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#666' },
  switchLink: { fontFamily: 'Inter_700Bold', color: '#c62828' },
});
