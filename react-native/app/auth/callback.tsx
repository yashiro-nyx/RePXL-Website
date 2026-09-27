import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../../context/AppContext';

export default function GoogleCallbackScreen() {
  const { ticket, error } = useLocalSearchParams<{ ticket?: string; error?: string }>();
  const { completeGoogleSignIn, loading } = useApp();
  const [message, setMessage] = useState(error || '');

  useEffect(() => {
    // Allow saved-session hydration to finish on a cold launch first.
    if (loading) return;
    if (error || !ticket) {
      setMessage(error || 'Google sign-in did not return a valid session ticket. Please try again.');
      return;
    }
    let active = true;
    completeGoogleSignIn(ticket).then((result) => {
      if (!active) return;
      if (result.mfaRequired && result.challenge) {
        router.replace({ pathname: '/login', params: { challenge: result.challenge } });
      } else {
        router.replace('/(tabs)/account');
      }
    }).catch((reason: unknown) => {
      if (active) setMessage(reason instanceof Error ? reason.message : 'Google sign-in failed. Please try again.');
    });
    return () => { active = false; };
  }, [ticket, error, loading, completeGoogleSignIn]);

  return (
    <View style={{ flex: 1, backgroundColor: '#0d0d0d', alignItems: 'center', justifyContent: 'center', padding: 28 }}>
      {message ? <>
        <Text style={{ color: '#fff', textAlign: 'center', marginBottom: 24 }}>{message}</Text>
        <TouchableOpacity onPress={() => router.replace('/login')} style={{ backgroundColor: '#c62828', padding: 16, borderRadius: 12 }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Back to sign in</Text>
        </TouchableOpacity>
      </> : <>
        <ActivityIndicator color="#c62828" />
        <Text style={{ color: '#fff', marginTop: 16 }}>Finishing Google sign-in…</Text>
      </>}
    </View>
  );
}
