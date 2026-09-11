import { useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';

type Section = 'main' | 'profile' | 'purchases' | 'addresses' | 'reviews' | 'notifications';

function SignedOut() {
  return (
    <View style={styles.centeredFull}>
      <LinearGradient colors={['#4a0808', '#1a0202', 'transparent']} style={styles.topGradient} />
      <View style={styles.anonIcon}><Feather name="user" size={34} color="#444" /></View>
      <Text style={styles.anonTitle}>Sign in to RePXL</Text>
      <Text style={styles.anonSub}>Access the same cart, orders, wishlist, and account records you use on the website.</Text>
      <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/login')}><Text style={styles.primaryBtnText}>Sign In</Text></TouchableOpacity>
      <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/signup')}><Text style={styles.secondaryBtnText}>Create Account</Text></TouchableOpacity>
    </View>
  );
}

function NavRow({ icon, label, badge, onPress }: { icon: keyof typeof Feather.glyphMap; label: string; badge?: number; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.navRow}>
      <View style={styles.navIcon}><Feather name={icon} size={16} color="#888" /></View>
      <Text style={styles.navLabel}>{label}</Text>
      {badge !== undefined && <View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View>}
      <Feather name="chevron-right" size={16} color="#3c3c3e" />
    </TouchableOpacity>
  );
}

function SubPage({ title, onBack, children }: { title: string; onBack: () => void; children: React.ReactNode }) {
  return (
    <View style={styles.container}>
      <LinearGradient colors={['#4a0808', '#1a0202', 'transparent']} style={styles.topGradient} />
      <View style={styles.subHeader}>
        <TouchableOpacity onPress={onBack}><Feather name="arrow-left" size={22} color="#fff" /></TouchableOpacity>
        <Text style={styles.subHeaderTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function ProfileView({ onBack }: { onBack: () => void }) {
  const { profile, saveProfile } = useApp();
  const [firstName, setFirstName] = useState(profile?.firstName ?? '');
  const [lastName, setLastName] = useState(profile?.lastName ?? '');
  const [username, setUsername] = useState(profile?.username ?? '');
  const [status, setStatus] = useState('');
  if (!profile) return null;

  const save = async () => {
    setStatus('');
    try {
      await saveProfile({ firstName, lastName, username: username.trim() || undefined });
      setStatus('Saved to your RePXL account.');
    } catch (reason) {
      setStatus(reason instanceof Error ? reason.message : 'Unable to save your profile.');
    }
  };

  return (
    <SubPage title="Profile Information" onBack={onBack}>
      <ScrollView contentContainerStyle={styles.pageContent} keyboardShouldPersistTaps="handled">
        <View style={styles.avatarLarge}><Text style={styles.avatarInitials}>{profile.firstName[0]}{profile.lastName[0]}</Text></View>
        <Text style={styles.fieldLabel}>USERNAME</Text>
        <TextInput value={username} onChangeText={setUsername} style={styles.input} autoCapitalize="none" />
        <Text style={styles.fieldLabel}>FIRST NAME</Text>
        <TextInput value={firstName} onChangeText={setFirstName} style={styles.input} />
        <Text style={styles.fieldLabel}>LAST NAME</Text>
        <TextInput value={lastName} onChangeText={setLastName} style={styles.input} />
        <Text style={styles.fieldLabel}>EMAIL</Text>
        <View style={styles.readOnly}><Text style={styles.readOnlyText}>{profile.email}</Text></View>
        <Text style={styles.fieldLabel}>PHONE</Text>
        <View style={styles.readOnly}><Text style={styles.readOnlyText}>{profile.maskedPhone || 'Not set'}</Text></View>
        {!!status && <Text style={styles.statusMessage}>{status}</Text>}
        <TouchableOpacity style={styles.primaryBtn} onPress={() => { void save(); }}><Text style={styles.primaryBtnText}>Save Changes</Text></TouchableOpacity>
      </ScrollView>
    </SubPage>
  );
}

function PurchasesView({ onBack }: { onBack: () => void }) {
  const { orders } = useApp();
  return (
    <SubPage title="My Purchases" onBack={onBack}>
      <ScrollView contentContainerStyle={styles.cardList}>
        {orders.length === 0 && <Empty icon="shopping-bag" text="No orders yet." />}
        {orders.map((order) => (
          <TouchableOpacity key={order.id} style={styles.orderCard} onPress={() => router.push({ pathname: '/order', params: { orderNumber: order.orderNumber } })}>
            {order.items[0]?.product.image ? <Image source={{ uri: order.items[0].product.image }} style={styles.orderImage} /> : null}
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{order.items[0]?.product.name ?? 'RePXL order'}</Text>
              <Text style={styles.cardMeta}>{order.orderNumber} · {new Date(order.createdAt).toLocaleDateString()}</Text>
              <Text style={styles.cardMeta}>{order.deliveryStatus} · Payment {order.paymentStatus.toLowerCase()}</Text>
              <Text style={styles.orderTotal}>₱{order.total.toLocaleString()}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SubPage>
  );
}

function AddressesView({ onBack }: { onBack: () => void }) {
  const { addresses } = useApp();
  return (
    <SubPage title="Addresses" onBack={onBack}>
      <ScrollView contentContainerStyle={styles.cardList}>
        {addresses.length === 0 && <Empty icon="map-pin" text="No saved addresses. Add one on the RePXL website before checkout." />}
        {addresses.map((address) => (
          <View key={address.id} style={styles.infoCard}>
            <View style={styles.titleRow}><Text style={styles.cardTitle}>{address.fullName}</Text>{address.isDefault && <Text style={styles.defaultBadge}>DEFAULT</Text>}</View>
            <Text style={styles.cardMeta}>{address.address}, {address.barangay}</Text>
            <Text style={styles.cardMeta}>{address.city}, {address.province} {address.postalCode}</Text>
            <Text style={styles.cardMeta}>{address.phone}</Text>
          </View>
        ))}
      </ScrollView>
    </SubPage>
  );
}

function ReviewsView({ onBack }: { onBack: () => void }) {
  const { reviews } = useApp();
  return (
    <SubPage title="My Reviews" onBack={onBack}>
      <ScrollView contentContainerStyle={styles.cardList}>
        {reviews.length === 0 && <Empty icon="star" text="You have not reviewed a purchase yet." />}
        {reviews.map((review) => (
          <View key={review.id} style={styles.infoCard}>
            <Text style={styles.cardTitle}>{review.product?.name ?? 'Camera review'}</Text>
            <Text style={styles.rating}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</Text>
            <Text style={styles.cardBody}>{review.comment}</Text>
            <Text style={styles.cardMeta}>{review.verifiedPurchase ? 'Verified purchase' : 'Review'} · {new Date(review.createdAt).toLocaleDateString()}</Text>
          </View>
        ))}
      </ScrollView>
    </SubPage>
  );
}

function NotificationsView({ onBack }: { onBack: () => void }) {
  const { notifications, markNotificationRead } = useApp();
  return (
    <SubPage title="Notifications" onBack={onBack}>
      <ScrollView contentContainerStyle={styles.cardList}>
        {notifications.length === 0 && <Empty icon="bell" text="No notifications." />}
        {notifications.map((notification) => (
          <TouchableOpacity key={notification.id} style={[styles.infoCard, !notification.isRead && styles.unreadCard]} onPress={() => { if (!notification.isRead) void markNotificationRead(notification.id); }}>
            <Text style={styles.cardTitle}>{notification.event.replace(/_/g, ' ')}</Text>
            <Text style={styles.cardBody}>{notification.message}</Text>
            <Text style={styles.cardMeta}>{new Date(notification.createdAt).toLocaleString()}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SubPage>
  );
}

function Empty({ icon, text }: { icon: keyof typeof Feather.glyphMap; text: string }) {
  return <View style={styles.empty}><Feather name={icon} size={30} color="#444" /><Text style={styles.anonSub}>{text}</Text></View>;
}

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const { user, orders, wishlist, reviews, notifications, refreshing, refreshAccount, logout } = useApp();
  const [section, setSection] = useState<Section>('main');
  if (!user) return <SignedOut />;
  if (section === 'profile') return <ProfileView onBack={() => setSection('main')} />;
  if (section === 'purchases') return <PurchasesView onBack={() => setSection('main')} />;
  if (section === 'addresses') return <AddressesView onBack={() => setSection('main')} />;
  if (section === 'reviews') return <ReviewsView onBack={() => setSection('main')} />;
  if (section === 'notifications') return <NotificationsView onBack={() => setSection('main')} />;

  const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase();
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={['#4a0808', '#1a0202', 'transparent']} style={styles.topGradient} />
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>My Account</Text>
        <TouchableOpacity onPress={() => { void refreshAccount(); }}><Feather name="refresh-cw" size={17} color="#c62828" /></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.userCard}>
          <View style={styles.avatarMed}><Text style={styles.avatarMedText}>{initials}</Text></View>
          <View style={{ flex: 1 }}><Text style={styles.cardTitle}>{user.name}</Text><Text style={styles.cardMeta}>{user.email}</Text></View>
          {refreshing && <ActivityIndicator color="#c62828" />}
        </View>
        <View style={styles.statsRow}>
          {[['Orders', orders.length], ['Wishlist', wishlist.length], ['Reviews', reviews.length]].map(([label, value]) => (
            <View key={label} style={styles.statBox}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>
          ))}
        </View>
        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <View style={styles.navGroup}>
          <NavRow icon="user" label="Profile" onPress={() => setSection('profile')} />
          <NavRow icon="map-pin" label="Addresses" onPress={() => setSection('addresses')} />
          <NavRow icon="shopping-bag" label="My Purchases" badge={orders.length} onPress={() => setSection('purchases')} />
          <NavRow icon="star" label="My Reviews" badge={reviews.length} onPress={() => setSection('reviews')} />
          <NavRow icon="bell" label="Notifications" badge={notifications.filter((item) => !item.isRead).length} onPress={() => setSection('notifications')} />
        </View>
        <TouchableOpacity onPress={() => { void logout().then(() => router.replace('/(tabs)/home')); }} style={styles.logoutRow}>
          <Feather name="log-out" size={17} color="#c62828" /><Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 220 },
  centeredFull: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 32, backgroundColor: '#0d0d0d' },
  anonIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#1c1c1e', alignItems: 'center', justifyContent: 'center' },
  anonTitle: { fontFamily: 'Inter_800ExtraBold', fontSize: 20, color: '#fff' },
  anonSub: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#777', textAlign: 'center', lineHeight: 22 },
  primaryBtn: { width: '100%', backgroundColor: '#c62828', borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  primaryBtnText: { fontFamily: 'Inter_700Bold', fontSize: 15, color: '#fff' },
  secondaryBtn: { width: '100%', borderRadius: 14, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: '#2c2c2e' },
  secondaryBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#aaa' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 18 },
  topBarTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, color: '#fff' },
  userCard: { flexDirection: 'row', alignItems: 'center', gap: 14, marginHorizontal: 20, marginBottom: 12, padding: 14, backgroundColor: '#1c1c1e', borderRadius: 16, borderWidth: 1, borderColor: '#2c2c2e' },
  avatarMed: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#8b0000', alignItems: 'center', justifyContent: 'center' },
  avatarMedText: { fontFamily: 'Inter_800ExtraBold', fontSize: 19, color: '#fff' },
  statsRow: { flexDirection: 'row', marginHorizontal: 20, gap: 8, marginBottom: 16 },
  statBox: { flex: 1, backgroundColor: '#1c1c1e', borderRadius: 12, borderWidth: 1, borderColor: '#2c2c2e', paddingVertical: 12, alignItems: 'center' },
  statValue: { fontFamily: 'Inter_800ExtraBold', fontSize: 19, color: '#fff' },
  statLabel: { fontFamily: 'Inter_400Regular', fontSize: 10, color: '#666' },
  sectionLabel: { fontFamily: 'Inter_700Bold', fontSize: 10, color: '#555', letterSpacing: 1.2, paddingHorizontal: 20, paddingVertical: 8 },
  navGroup: { backgroundColor: '#111', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#1e1e1e' },
  navRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  navIcon: { width: 28, alignItems: 'center' },
  navLabel: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 14, color: '#ccc' },
  badge: { backgroundColor: '#c62828', borderRadius: 99, paddingHorizontal: 7, paddingVertical: 1 },
  badgeText: { fontFamily: 'Inter_700Bold', fontSize: 11, color: '#fff' },
  logoutRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingVertical: 18, marginTop: 8 },
  logoutText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#c62828' },
  subHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 54, paddingBottom: 16 },
  subHeaderTitle: { fontFamily: 'Inter_800ExtraBold', fontSize: 18, color: '#fff', marginLeft: 12 },
  pageContent: { paddingHorizontal: 20, paddingBottom: 48, gap: 10 },
  avatarLarge: { width: 78, height: 78, borderRadius: 39, backgroundColor: '#8b0000', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 10 },
  avatarInitials: { fontFamily: 'Inter_800ExtraBold', fontSize: 26, color: '#fff' },
  fieldLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#888', marginTop: 6 },
  input: { backgroundColor: '#1c1c1e', borderWidth: 1, borderColor: '#2c2c2e', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, color: '#fff' },
  readOnly: { backgroundColor: '#161618', borderRadius: 10, padding: 14 },
  readOnlyText: { color: '#888', fontFamily: 'Inter_400Regular' },
  statusMessage: { color: '#aaa', textAlign: 'center', marginVertical: 8 },
  cardList: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  infoCard: { backgroundColor: '#1c1c1e', borderRadius: 14, padding: 15, borderWidth: 1, borderColor: '#2c2c2e', gap: 6 },
  unreadCard: { borderColor: '#8b2020' },
  orderCard: { flexDirection: 'row', gap: 14, backgroundColor: '#1c1c1e', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#2c2c2e' },
  orderImage: { width: 64, height: 64, borderRadius: 10, backgroundColor: '#111' },
  cardTitle: { fontFamily: 'Inter_700Bold', fontSize: 14, color: '#fff' },
  cardMeta: { fontFamily: 'Inter_400Regular', fontSize: 11, color: '#777', marginTop: 3 },
  cardBody: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#bbb', lineHeight: 19 },
  orderTotal: { fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: '#fff', marginTop: 7 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between' },
  defaultBadge: { color: '#4caf50', fontSize: 9, fontFamily: 'Inter_700Bold' },
  rating: { color: '#f5a623', letterSpacing: 2 },
  empty: { alignItems: 'center', paddingVertical: 70, gap: 12 },
});
