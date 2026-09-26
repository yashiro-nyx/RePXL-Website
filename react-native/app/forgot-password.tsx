import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { getSafeTopInset } from '../src/utils/layout';

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const safeTop = getSafeTopInset(insets);
  const { forgotPassword, resetPassword } = useApp();

  const [mode, setMode] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleRequestReset = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError('Please enter your email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const msg = await forgotPassword(trimmed);
      setSuccessMessage(msg);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send reset instructions.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const trimmedToken = token.trim();
    if (!trimmedToken) {
      setError('Please provide your reset token.');
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      setError('Password must contain at least one uppercase letter.');
      return;
    }
    if (!/\d/.test(newPassword)) {
      setError('Password must contain at least one number.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const msg = await resetPassword(trimmedToken, newPassword);
      setSuccessMessage(msg);
      setTimeout(() => {
        router.replace('/login');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password. Token may be invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { paddingTop: safeTop }]}>
        <LinearGradient
          colors={['#5a1010', '#2a0505', 'transparent']}
          start={{ x: 0.3, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        />

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={styles.backButton}>
            <Feather name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>

          {/* Logo */}
          <View style={styles.logoRow}>
            <Text style={styles.logoText}>RePXL</Text>
            <View style={styles.logoDot} />
          </View>

          <Text style={styles.heading}>
            {mode === 'request' ? 'Reset Password' : 'Enter New Password'}
          </Text>
          <Text style={styles.sub}>
            {mode === 'request'
              ? "Enter your email address and we'll send you instructions to reset your password."
              : 'Paste your single-use reset token from email and create a new secure password.'}
          </Text>

          {/* Mode Switcher Tabs */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, mode === 'request' && styles.tabActive]}
              onPress={() => {
                setMode('request');
                setError('');
                setSuccessMessage('');
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, mode === 'request' && styles.tabTextActive]}>
                Request Link
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, mode === 'reset' && styles.tabActive]}
              onPress={() => {
                setMode('reset');
                setError('');
                setSuccessMessage('');
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, mode === 'reset' && styles.tabTextActive]}>
                I Have a Token
              </Text>
            </TouchableOpacity>
          </View>

          {mode === 'request' ? (
            <>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
                <TextInput
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    setError('');
                  }}
                  placeholder="you@example.com"
                  placeholderTextColor="#444"
                  style={styles.input}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              {!!error && <Text style={styles.error}>{error}</Text>}
              {!!successMessage && (
                <View style={styles.successBox}>
                  <Feather name="check-circle" size={18} color="#4caf50" />
                  <Text style={styles.successText}>{successMessage}</Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleRequestReset}
                activeOpacity={0.85}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Send Reset Instructions</Text>
                )}
              </TouchableOpacity>

              {!!successMessage && (
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={() => {
                    setMode('reset');
                    setError('');
                  }}
                >
                  <Text style={styles.secondaryBtnText}>Enter Token to Set New Password →</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>RESET TOKEN</Text>
                <TextInput
                  value={token}
                  onChangeText={(t) => {
                    setToken(t);
                    setError('');
                  }}
                  placeholder="Paste 64-character token from email"
                  placeholderTextColor="#444"
                  style={styles.input}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>NEW PASSWORD</Text>
                <View style={styles.pwWrap}>
                  <TextInput
                    value={newPassword}
                    onChangeText={(t) => {
                      setNewPassword(t);
                      setError('');
                    }}
                    placeholder="Min. 8 chars, 1 uppercase, 1 digit"
                    placeholderTextColor="#444"
                    style={[styles.input, { flex: 1, borderWidth: 0 }]}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={{ paddingRight: 14 }}>
                    <Feather name={showPassword ? 'eye-off' : 'eye'} size={17} color="#666" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>CONFIRM NEW PASSWORD</Text>
                <View style={styles.pwWrap}>
                  <TextInput
                    value={confirmPassword}
                    onChangeText={(t) => {
                      setConfirmPassword(t);
                      setError('');
                    }}
                    placeholder="Repeat new password"
                    placeholderTextColor="#444"
                    style={[styles.input, { flex: 1, borderWidth: 0 }]}
                    secureTextEntry={!showPassword}
                  />
                </View>
              </View>

              {!!error && <Text style={styles.error}>{error}</Text>}
              {!!successMessage && (
                <View style={styles.successBox}>
                  <Feather name="check-circle" size={18} color="#4caf50" />
                  <Text style={styles.successText}>{successMessage} Redirecting to login...</Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleResetPassword}
                activeOpacity={0.85}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Reset Password</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity onPress={() => router.replace('/login')} style={styles.backToLogin}>
            <Text style={styles.backToLoginText}>
              Remember your password? <Text style={styles.backToLoginLink}>Sign in</Text>
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
  content: { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 16 },
  backButton: { alignSelf: 'flex-start', marginBottom: 24 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 20 },
  logoText: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 20,
    color: '#fff',
    borderWidth: 1.5,
    borderColor: '#fff',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  logoDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#c62828', marginLeft: 3 },
  heading: { fontFamily: 'Inter_800ExtraBold', fontSize: 26, color: '#fff', marginBottom: 6 },
  sub: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#888', marginBottom: 24, lineHeight: 20 },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1c',
    borderRadius: 10,
    padding: 3,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#2c2c2e',
  },
  tabText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#777',
  },
  tabTextActive: {
    color: '#fff',
  },
  field: { marginBottom: 16 },
  fieldLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#888', letterSpacing: 0.5, marginBottom: 8 },
  input: {
    backgroundColor: '#1c1c1e',
    borderWidth: 1,
    borderColor: '#2c2c2e',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#fff',
    fontFamily: 'Inter_400Regular',
  },
  pwWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1c1e',
    borderWidth: 1,
    borderColor: '#2c2c2e',
    borderRadius: 10,
  },
  error: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#f44336', textAlign: 'center', marginBottom: 12 },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(76, 175, 80, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  successText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#81c784',
    lineHeight: 18,
  },
  primaryBtn: { backgroundColor: '#c62828', borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  primaryBtnText: { fontFamily: 'Inter_700Bold', fontSize: 15, color: '#fff', letterSpacing: 0.3 },
  secondaryBtn: {
    marginTop: 14,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#1c1c1e',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  secondaryBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#eee',
  },
  backToLogin: { marginTop: 28, alignSelf: 'center' },
  backToLoginText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#666' },
  backToLoginLink: { fontFamily: 'Inter_700Bold', color: '#c62828' },
});

