import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ScrollView, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { MOCK_ORDERS } from '../../data/products';

type Section = 'main' | 'profile' | 'purchases' | 'other';

/* ─── Signed-out gate ─── */
function SignedOut() {
  return (
    <View style={styles.centeredFull}>
      <LinearGradient colors={['#4a0808', '#1a0202', 'transparent']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 250 }} />
      <View style={styles.anonIcon}><Feather name="user" size={34} color="#444" /></View>
      <Text style={styles.anonTitle}>Sign in to RePXL</Text>
      <Text style={styles.anonSub}>Access your orders, wishlist, and account settings.</Text>
      <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/login')} activeOpacity={0.85}>
        <Text style={styles.primaryBtnText}>Sign In</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/signup')} activeOpacity={0.85}>
        <Text style={styles.secondaryBtnText}>Create Account</Text>
      </TouchableOpacity>
    </View>
  );
}

/* ─── Nav row ─── */
function NavRow({ icon, label, badge, onPress }: { icon: React.ReactNode; label: string; badge?: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.navRow} activeOpacity={0.7}>
      <View style={styles.navIcon}>{icon}</View>
      <Text style={styles.navLabel}>{label}</Text>
      {badge && <View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View>}
      <Feather name="chevron-right" size={16} color="#3c3c3e" />
    </TouchableOpacity>
  );
}

/* ─── Profile edit ─── */
function ProfileView({ onBack }: { onBack: () => void }) {
  const { user } = useApp();
  if (!user) return null;
  const initials = user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  const [firstName, setFirstName] = useState(user.name.split(' ')[0] ?? '');
  const [lastName, setLastName] = useState(user.name.split(' ').slice(1).join(' ') ?? '');
  const [username, setUsername] = useState('');
  const [saved, setSaved] = useState(false);
  const masked = user.email.replace(/(.{1}).+(@.+)/, '$1*************$2');

  return (
    <View style={{ flex: 1, backgroundColor: '#0d0d0d' }}>
      <LinearGradient colors={['#4a0808', '#1a0202', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 160 }} />
      <View style={styles.subHeader}>
        <TouchableOpacity onPress={onBack}><Feather name="arrow-left" size={22} color="#fff" /></TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 11, color: '#c62828', letterSpacing: 0.5 }}>→ EDIT YOUR INFO</Text>
          <Text style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 18, color: '#fff' }}>Profile Information</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        {/* Avatar */}
        <View style={styles.avatarBlock}>
          <View style={styles.avatarLarge}><Text style={styles.avatarInitials}>{initials}</Text></View>
          <TouchableOpacity style={styles.uploadBtn}><Text style={styles.uploadBtnText}>Upload Photo</Text></TouchableOpacity>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: '#555' }}>JPG, PNG or WebP · Max 5 MB</Text>
        </View>
        {/* Fields */}
        <View style={{ gap: 14 }}>
          <View>
            <Text style={styles.fLabel}>Username <Text style={{ color: '#888', fontFamily: 'Inter_400Regular' }}>(optional)</Text></Text>
            <View style={styles.prefixInput}>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: '#666', paddingLeft: 14, paddingRight: 4 }}>@</Text>
              <TextInput value={username} onChangeText={setUsername} placeholder="your_handle" placeholderTextColor="#444" style={[styles.fInput, { flex: 1, borderWidth: 0 }]} autoCapitalize="none" />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fLabel}>First Name</Text>
              <TextInput value={firstName} onChangeText={setFirstName} placeholder="First" placeholderTextColor="#444" style={styles.fInput} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fLabel}>Last Name</Text>
              <TextInput value={lastName} onChangeText={setLastName} placeholder="Last" placeholderTextColor="#444" style={styles.fInput} />
            </View>
          </View>
          <View>
            <Text style={styles.fLabel}>Email Address</Text>
            <View style={styles.prefixInput}>
              <Text style={[styles.fInput, { flex: 1, borderWidth: 0, color: '#888', fontFamily: 'Inter_400Regular' }]}>{masked}</Text>
              <TouchableOpacity style={styles.changeBtn}><Text style={styles.changeBtnText}>Change</Text></TouchableOpacity>
            </View>
          </View>
          <View>
            <Text style={styles.fLabel}>Phone Number</Text>
            <View style={styles.prefixInput}>
              <Text style={[styles.fInput, { flex: 1, borderWidth: 0, color: '#888', fontFamily: 'Inter_400Regular' }]}>–</Text>
              <TouchableOpacity style={styles.changeBtn}><Text style={styles.changeBtnText}>Change</Text></TouchableOpacity>
            </View>
          </View>
          <View>
            <Text style={styles.fLabel}>Gender <Text style={{ color: '#888', fontFamily: 'Inter_400Regular' }}>(optional)</Text></Text>
            <View style={[styles.fInput, { justifyContent: 'center' }]}><Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: '#fff' }}>Prefer not to say</Text></View>
          </View>
          <View>
            <Text style={styles.fLabel}>Date of Birth</Text>
            <View style={styles.prefixInput}>
              <Text style={[styles.fInput, { flex: 1, borderWidth: 0, color: '#888', fontFamily: 'Inter_400Regular' }]}>–</Text>
              <TouchableOpacity style={styles.changeBtn}><Text style={styles.changeBtnText}>Change</Text></TouchableOpacity>
            </View>
          </View>
          <View>
            <Text style={styles.fLabel}>Member Since</Text>
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#c62828', marginTop: 4 }}>{user.joined}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.primaryBtn, { marginTop: 28, backgroundColor: saved ? '#2e7d32' : '#c62828' }]}
          onPress={() => { setSaved(true); setTimeout(() => setSaved(false), 2000); }}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>{saved ? '✓  Saved!' : 'Save Changes'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

/* ─── My Purchases ─── */
function PurchasesView({ onBack }: { onBack: () => void }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#0d0d0d' }}>
      <LinearGradient colors={['#4a0808', '#1a0202', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 160 }} />
      <View style={styles.subHeader}>
        <TouchableOpacity onPress={onBack}><Feather name="arrow-left" size={22} color="#fff" /></TouchableOpacity>
        <Text style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 18, color: '#fff', marginLeft: 12 }}>My Purchases</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, gap: 12 }}>
        {MOCK_ORDERS.map((order) => (
          <View key={order.id} style={styles.orderCard}>
            <Image source={{ uri: order.img }} style={styles.orderImg} resizeMode="cover" />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 13, color: '#fff' }} numberOfLines={1}>{order.item}</Text>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: '#555' }}>{order.id} · {order.date}</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                <View style={styles.statusBadge}><Text style={styles.statusText}>{order.status.toUpperCase()}</Text></View>
                <Text style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: '#fff' }}>₱{order.total.toLocaleString()}</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

/* ─── Main account ─── */
export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useApp();
  const [section, setSection] = useState<Section>('main');

  if (!user) return <SignedOut />;
  if (section === 'profile') return <ProfileView onBack={() => setSection('main')} />;
  if (section === 'purchases') return <PurchasesView onBack={() => setSection('main')} />;
  if (section === 'other') {
    return (
      <View style={{ flex: 1, backgroundColor: '#0d0d0d' }}>
        <View style={styles.subHeader}>
          <TouchableOpacity onPress={() => setSection('main')}><Feather name="arrow-left" size={22} color="#fff" /></TouchableOpacity>
          <Text style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 18, color: '#fff', marginLeft: 12 }}>Coming Soon</Text>
        </View>
        <View style={styles.centeredFull}>
          <Feather name="clock" size={32} color="#444" />
          <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 16, color: '#fff', marginTop: 12 }}>Being built</Text>
        </View>
      </View>
    );
  }

  const initials = user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={['#4a0808', '#1a0202', 'transparent']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 220 }} />

      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>My Account</Text>
        <TouchableOpacity onPress={() => setSection('profile')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Feather name="edit-2" size={13} color="#c62828" />
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#c62828' }}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* User card */}
        <View style={styles.userCard}>
          <View style={styles.avatarMed}><Text style={styles.avatarMedText}>{initials}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: '#fff' }}>{user.name}</Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: '#666', marginTop: 2 }} numberOfLines={1}>{user.email}</Text>
          </View>
          <View style={styles.memberBadge}><Text style={styles.memberBadgeText}>Member</Text></View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[{ label: 'Orders', value: MOCK_ORDERS.length.toString() }, { label: 'Wishlist', value: '3' }, { label: 'Reviews', value: '5' }].map((s) => (
            <View key={s.label} style={styles.statBox}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Nav sections */}
        <Text style={styles.sectionLabel}>MY ACCOUNT</Text>
        <View style={styles.navGroup}>
          <NavRow icon={<Feather name="user" size={16} color="#888" />} label="Profile" onPress={() => setSection('profile')} />
          <NavRow icon={<Feather name="map-pin" size={16} color="#888" />} label="Addresses" onPress={() => setSection('other')} />
          <NavRow icon={<Feather name="lock" size={16} color="#888" />} label="Change Password" onPress={() => setSection('other')} />
          <NavRow icon={<Feather name="shield" size={16} color="#888" />} label="Security" onPress={() => setSection('other')} />
          <NavRow icon={<Feather name="bell" size={16} color="#888" />} label="Notification Settings" onPress={() => setSection('other')} />
        </View>

        <Text style={styles.sectionLabel}>MY PURCHASES</Text>
        <View style={styles.navGroup}>
          <NavRow icon={<Feather name="shopping-bag" size={16} color="#888" />} label="My Purchases" badge={MOCK_ORDERS.length.toString()} onPress={() => setSection('purchases')} />
        </View>

        <Text style={styles.sectionLabel}>PAYMENTS</Text>
        <View style={styles.navGroup}>
          <NavRow icon={<Feather name="credit-card" size={16} color="#888" />} label="Payments" onPress={() => setSection('other')} />
        </View>

        <Text style={styles.sectionLabel}>MY REVIEWS</Text>
        <View style={styles.navGroup}>
          <NavRow icon={<Feather name="star" size={16} color="#888" />} label="My Reviews" onPress={() => setSection('other')} />
        </View>

        <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
        <View style={styles.navGroup}>
          <NavRow icon={<Feather name="bell" size={16} color="#888" />} label="Notifications" onPress={() => setSection('other')} />
        </View>

        <Text style={styles.sectionLabel}>MY VOUCHERS</Text>
        <View style={styles.navGroup}>
          <NavRow icon={<Feather name="gift" size={16} color="#888" />} label="My Vouchers" onPress={() => setSection('other')} />
        </View>

        <TouchableOpacity onPress={logout} style={styles.logoutRow} activeOpacity={0.7}>
          <Feather name="log-out" size={17} color="#c62828" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  centeredFull: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 32 },
  anonIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#1c1c1e', borderWidth: 2, borderColor: '#2c2c2e', alignItems: 'center', justifyContent: 'center' },
  anonTitle: { fontFamily: 'Inter_800ExtraBold', fontSize: 20, color: '#fff' },
  anonSub: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 22 },
  primaryBtn: { width: '100%', backgroundColor: '#c62828', borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  primaryBtnText: { fontFamily: 'Inter_700Bold', fontSize: 15, color: '#fff' },
  secondaryBtn: { width: '100%', borderRadius: 14, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: '#2c2c2e' },
  secondaryBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#aaa' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 18 },
  topBarTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, color: '#fff' },
  userCard: { flexDirection: 'row', alignItems: 'center', gap: 14, marginHorizontal: 20, marginBottom: 12, padding: 14, backgroundColor: '#1c1c1e', borderRadius: 16, borderWidth: 1, borderColor: '#2c2c2e' },
  avatarMed: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#8b0000', alignItems: 'center', justifyContent: 'center' },
  avatarMedText: { fontFamily: 'Inter_800ExtraBold', fontSize: 19, color: '#fff' },
  memberBadge: { borderWidth: 1, borderColor: 'rgba(198,40,40,0.4)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  memberBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 10, color: '#c62828' },
  statsRow: { flexDirection: 'row', marginHorizontal: 20, gap: 8, marginBottom: 16 },
  statBox: { flex: 1, backgroundColor: '#1c1c1e', borderRadius: 12, borderWidth: 1, borderColor: '#2c2c2e', paddingVertical: 12, alignItems: 'center' },
  statValue: { fontFamily: 'Inter_800ExtraBold', fontSize: 19, color: '#fff' },
  statLabel: { fontFamily: 'Inter_400Regular', fontSize: 10, color: '#666', marginTop: 2 },
  sectionLabel: { fontFamily: 'Inter_700Bold', fontSize: 10, color: '#555', letterSpacing: 1.2, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 6 },
  navGroup: { backgroundColor: '#111', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#1e1e1e' },
  navRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  navIcon: { width: 28, alignItems: 'center' },
  navLabel: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 14, color: '#ccc' },
  badge: { backgroundColor: '#c62828', borderRadius: 99, paddingHorizontal: 7, paddingVertical: 1 },
  badgeText: { fontFamily: 'Inter_700Bold', fontSize: 11, color: '#fff' },
  logoutRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 18, marginTop: 8 },
  logoutText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#c62828' },
  subHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  avatarBlock: { alignItems: 'center', gap: 10, paddingVertical: 20 },
  avatarLarge: { width: 78, height: 78, borderRadius: 39, backgroundColor: '#8b0000', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#2c2c2e' },
  avatarInitials: { fontFamily: 'Inter_800ExtraBold', fontSize: 26, color: '#fff' },
  uploadBtn: { paddingHorizontal: 18, paddingVertical: 8, borderWidth: 1.5, borderColor: '#2c2c2e', borderRadius: 8 },
  uploadBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#ccc' },
  fLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#c62828', marginBottom: 6 },
  fInput: { backgroundColor: '#1c1c1e', borderWidth: 1, borderColor: '#2c2c2e', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, color: '#fff', fontFamily: 'Inter_400Regular' },
  prefixInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1c1c1e', borderWidth: 1, borderColor: '#2c2c2e', borderRadius: 10, overflow: 'hidden' },
  changeBtn: { margin: 4, backgroundColor: '#2c2c2e', borderRadius: 7, paddingHorizontal: 12, paddingVertical: 8 },
  changeBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#ccc' },
  orderCard: { flexDirection: 'row', gap: 14, backgroundColor: '#1c1c1e', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#2c2c2e' },
  orderImg: { width: 62, height: 62, borderRadius: 10, backgroundColor: '#111' },
  statusBadge: { borderWidth: 1, borderColor: '#4caf50', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  statusText: { fontFamily: 'Inter_700Bold', fontSize: 9, color: '#4caf50', letterSpacing: 0.5 },
});
