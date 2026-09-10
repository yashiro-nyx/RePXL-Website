import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = () => {
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    login({ name: 'Alex Reyes', email, joined: 'September 2026' });
    router.replace('/(tabs)/account');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <LinearGradient colors={['#5a1010', '#2a0505', 'transparent']} start={{ x: 0.3, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradient} />

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} style={{ alignSelf: 'flex-start', marginBottom: 32 }}>
            <Feather name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>

          {/* Logo */}
          <View style={styles.logoRow}>
            <Text style={styles.logoText}>RePXL</Text>
            <View style={styles.logoDot} />
          </View>

          <Text style={styles.heading}>Welcome back</Text>
          <Text style={styles.sub}>Sign in to your RePXL account</Text>

          {/* Fields */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
            <TextInput value={email} onChangeText={(t) => { setEmail(t); setError(''); }} placeholder="you@example.com" placeholderTextColor="#444" style={styles.input} keyboardType="email-address" autoCapitalize="none" />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>PASSWORD</Text>
            <View style={styles.pwWrap}>
              <TextInput value={password} onChangeText={(t) => { setPassword(t); setError(''); }} placeholder="••••••••" placeholderTextColor="#444" style={[styles.input, { flex: 1, borderWidth: 0 }]} secureTextEntry={!showPw} />
              <TouchableOpacity onPress={() => setShowPw((v) => !v)} style={{ paddingRight: 14 }}>
                <Feather name={showPw ? 'eye-off' : 'eye'} size={17} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={{ alignSelf: 'flex-end' }}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          {!!error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity style={styles.primaryBtn} onPress={handleLogin} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>Sign In</Text>
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.divider} />
          </View>

          <TouchableOpacity style={styles.googleBtn} activeOpacity={0.85}>
            <Text style={{ fontSize: 18 }}>G</Text>
            <Text style={styles.googleBtnText}>Continue with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/signup')} style={{ marginTop: 24, alignSelf: 'center' }}>
            <Text style={styles.switchText}>
              Don't have an account? <Text style={styles.switchLink}>Sign up</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  gradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 300 },
  content: { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 20 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 24 },
  logoText: { fontFamily: 'Inter_800ExtraBold', fontSize: 20, color: '#fff', borderWidth: 1.5, borderColor: '#fff', paddingHorizontal: 6, paddingVertical: 2 },
  logoDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#c62828', marginLeft: 3 },
  heading: { fontFamily: 'Inter_800ExtraBold', fontSize: 28, color: '#fff', marginBottom: 6 },
  sub: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#666', marginBottom: 28 },
  field: { marginBottom: 16 },
  fieldLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#888', letterSpacing: 0.5, marginBottom: 8 },
  input: { backgroundColor: '#1c1c1e', borderWidth: 1, borderColor: '#2c2c2e', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#fff', fontFamily: 'Inter_400Regular' },
  pwWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1c1c1e', borderWidth: 1, borderColor: '#2c2c2e', borderRadius: 10 },
  forgotText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#c62828', marginBottom: 16 },
  error: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#f44336', textAlign: 'center', marginBottom: 8 },
  primaryBtn: { backgroundColor: '#c62828', borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  primaryBtnText: { fontFamily: 'Inter_700Bold', fontSize: 15, color: '#fff', letterSpacing: 0.3 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 20 },
  divider: { flex: 1, height: 1, backgroundColor: '#2c2c2e' },
  dividerText: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#555' },
  googleBtn: { backgroundColor: '#1c1c1e', borderWidth: 1, borderColor: '#2c2c2e', borderRadius: 12, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  googleBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#fff' },
  switchText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#666' },
  switchLink: { fontFamily: 'Inter_700Bold', color: '#c62828' },
});
