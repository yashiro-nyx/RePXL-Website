import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { CONDITION_COLORS } from '../../data/products';
import type { Address, Product } from '../../types';

type Section = 'main' | 'profile' | 'purchases' | 'addresses' | 'reviews' | 'notifications' | 'wishlist';

function SignedOut() {
  return (
    <View style={styles.centeredFull}>
      <LinearGradient colors={['#4a0808', '#1a0202', 'transparent']} style={styles.topGradient} />
      <View style={styles.anonIcon}>
        <Feather name="user" size={34} color="#444" />
      </View>
      <Text style={styles.anonTitle}>Sign in to RePXL</Text>
      <Text style={styles.anonSub}>
        Access the same cart, orders, wishlist, and account records you use on the website.
      </Text>
      <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/login')}>
        <Text style={styles.primaryBtnText}>Sign In</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/signup')}>
        <Text style={styles.secondaryBtnText}>Create Account</Text>
      </TouchableOpacity>
    </View>
  );
}

function NavRow({
  icon,
  label,
  badge,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  badge?: number;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.navRow} activeOpacity={0.7}>
      <View style={styles.navIcon}>
        <Feather name={icon} size={16} color="#888" />
      </View>
      <Text style={styles.navLabel}>{label}</Text>
      {badge !== undefined && badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
      <Feather name="chevron-right" size={16} color="#3c3c3e" />
    </TouchableOpacity>
  );
}

function SubPage({
  title,
  onBack,
  rightAction,
  children,
}: {
  title: string;
  onBack: () => void;
  rightAction?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.container}>
      <LinearGradient colors={['#4a0808', '#1a0202', 'transparent']} style={styles.topGradient} />
      <View style={styles.subHeader}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.subHeaderTitle}>{title}</Text>
        <View style={{ marginLeft: 'auto' }}>{rightAction}</View>
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
  const [saving, setSaving] = useState(false);
  if (!profile) return null;

  const save = async () => {
    setStatus('');
    setSaving(true);
    try {
      await saveProfile({ firstName, lastName, username: username.trim() || undefined });
      setStatus('Saved to your RePXL account.');
    } catch (reason) {
      setStatus(reason instanceof Error ? reason.message : 'Unable to save your profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SubPage title="Profile Information" onBack={onBack}>
      <ScrollView contentContainerStyle={styles.pageContent} keyboardShouldPersistTaps="handled">
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarInitials}>
            {profile.firstName[0]}
            {profile.lastName[0]}
          </Text>
        </View>
        <Text style={styles.fieldLabel}>USERNAME</Text>
        <TextInput
          value={username}
          onChangeText={setUsername}
          style={styles.input}
          autoCapitalize="none"
        />
        <Text style={styles.fieldLabel}>FIRST NAME</Text>
        <TextInput value={firstName} onChangeText={setFirstName} style={styles.input} />
        <Text style={styles.fieldLabel}>LAST NAME</Text>
        <TextInput value={lastName} onChangeText={setLastName} style={styles.input} />
        <Text style={styles.fieldLabel}>EMAIL</Text>
        <View style={styles.readOnly}>
          <Text style={styles.readOnlyText}>{profile.email}</Text>
        </View>
        <Text style={styles.fieldLabel}>PHONE</Text>
        <View style={styles.readOnly}>
          <Text style={styles.readOnlyText}>{profile.maskedPhone || 'Not set'}</Text>
        </View>
        {!!status && <Text style={styles.statusMessage}>{status}</Text>}
        <TouchableOpacity
          style={[styles.primaryBtn, saving && { opacity: 0.6 }]}
          onPress={() => {
            void save();
          }}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Save Changes</Text>
          )}
        </TouchableOpacity>
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
          <TouchableOpacity
            key={order.id}
            style={styles.orderCard}
            onPress={() =>
              router.push({ pathname: '/order', params: { orderNumber: order.orderNumber } })
            }
            activeOpacity={0.8}
          >
            {order.items[0]?.product.image ? (
              <Image source={{ uri: order.items[0].product.image }} style={styles.orderImage} />
            ) : null}
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{order.items[0]?.product.name ?? 'RePXL order'}</Text>
              <Text style={styles.cardMeta}>
                {order.orderNumber} · {new Date(order.createdAt).toLocaleDateString()}
              </Text>
              <Text style={styles.cardMeta}>
                {order.deliveryStatus} · Payment {order.paymentStatus.toLowerCase()}
              </Text>
              <Text style={styles.orderTotal}>₱{order.total.toLocaleString()}</Text>
            </View>
            <Feather name="chevron-right" size={16} color="#555" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SubPage>
  );
}

function AddressesView({ onBack }: { onBack: () => void }) {
  const { addresses, addAddress, updateAddress, deleteAddress, setDefaultAddress } = useApp();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [fullName, setFullName] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [barangay, setBarangay] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [phone, setPhone] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const openCreateModal = () => {
    setEditingAddress(null);
    setFullName('');
    setStreetAddress('');
    setBarangay('');
    setCity('');
    setProvince('');
    setPostalCode('');
    setPhone('');
    setIsDefault(addresses.length === 0);
    setFormError('');
    setModalVisible(true);
  };

  const openEditModal = (addr: Address) => {
    setEditingAddress(addr);
    setFullName(addr.fullName);
    setStreetAddress(addr.address);
    setBarangay(addr.barangay);
    setCity(addr.city);
    setProvince(addr.province);
    setPostalCode(addr.postalCode);
    setPhone(addr.phone);
    setIsDefault(addr.isDefault);
    setFormError('');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (
      !fullName.trim() ||
      !streetAddress.trim() ||
      !barangay.trim() ||
      !city.trim() ||
      !province.trim() ||
      !postalCode.trim() ||
      !phone.trim()
    ) {
      setFormError('Please fill in all address fields.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        fullName: fullName.trim(),
        address: streetAddress.trim(),
        barangay: barangay.trim(),
        city: city.trim(),
        province: province.trim(),
        postalCode: postalCode.trim(),
        phone: phone.trim(),
        isDefault,
      };
      if (editingAddress) {
        await updateAddress(editingAddress.id, payload);
      } else {
        await addAddress(payload);
      }
      setModalVisible(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to save address.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (addr: Address) => {
    Alert.alert('Delete Address', `Remove address for ${addr.fullName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void deleteAddress(addr.id);
        },
      },
    ]);
  };

  return (
    <SubPage
      title="Addresses"
      onBack={onBack}
      rightAction={
        <TouchableOpacity onPress={openCreateModal} style={styles.addIconBtn}>
          <Feather name="plus" size={18} color="#c62828" />
          <Text style={styles.addBtnText}>New</Text>
        </TouchableOpacity>
      }
    >
      <ScrollView contentContainerStyle={styles.cardList}>
        {addresses.length === 0 && (
          <View style={styles.empty}>
            <Feather name="map-pin" size={30} color="#444" />
            <Text style={styles.anonSub}>No saved addresses yet.</Text>
            <TouchableOpacity onPress={openCreateModal} style={styles.actionPill}>
              <Text style={styles.actionPillText}>+ Add First Address</Text>
            </TouchableOpacity>
          </View>
        )}
        {addresses.map((address) => (
          <View key={address.id} style={styles.infoCard}>
            <View style={styles.titleRow}>
              <Text style={styles.cardTitle}>{address.fullName}</Text>
              {address.isDefault && <Text style={styles.defaultBadge}>DEFAULT</Text>}
            </View>
            <Text style={styles.cardMeta}>
              {address.address}, {address.barangay}
            </Text>
            <Text style={styles.cardMeta}>
              {address.city}, {address.province} {address.postalCode}
            </Text>
            <Text style={styles.cardMeta}>{address.phone}</Text>

            <View style={styles.cardActionRow}>
              {!address.isDefault && (
                <TouchableOpacity
                  onPress={() => void setDefaultAddress(address.id)}
                  style={styles.cardActionBtn}
                >
                  <Text style={styles.cardActionText}>Set Default</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => openEditModal(address)}
                style={styles.cardActionBtn}
              >
                <Text style={styles.cardActionText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDelete(address)}
                style={[styles.cardActionBtn, { borderColor: 'rgba(244,67,54,0.3)' }]}
              >
                <Text style={[styles.cardActionText, { color: '#f44336' }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Address Form Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalSheetHeader}>
              <Text style={styles.modalSheetTitle}>
                {editingAddress ? 'Edit Address' : 'Add Delivery Address'}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="x" size={20} color="#888" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 24, gap: 8 }}>
              <Text style={styles.fieldLabel}>FULL NAME</Text>
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="Recipient's full name"
                placeholderTextColor="#555"
                style={styles.modalInput}
              />

              <Text style={styles.fieldLabel}>STREET ADDRESS</Text>
              <TextInput
                value={streetAddress}
                onChangeText={setStreetAddress}
                placeholder="House/Unit #, Street, Village"
                placeholderTextColor="#555"
                style={styles.modalInput}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>BARANGAY</Text>
                  <TextInput
                    value={barangay}
                    onChangeText={setBarangay}
                    placeholder="Barangay"
                    placeholderTextColor="#555"
                    style={styles.modalInput}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>CITY / MUNICIPALITY</Text>
                  <TextInput
                    value={city}
                    onChangeText={setCity}
                    placeholder="City"
                    placeholderTextColor="#555"
                    style={styles.modalInput}
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>PROVINCE</Text>
                  <TextInput
                    value={province}
                    onChangeText={setProvince}
                    placeholder="Province"
                    placeholderTextColor="#555"
                    style={styles.modalInput}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>POSTAL CODE</Text>
                  <TextInput
                    value={postalCode}
                    onChangeText={setPostalCode}
                    placeholder="e.g. 1000"
                    placeholderTextColor="#555"
                    keyboardType="numeric"
                    style={styles.modalInput}
                  />
                </View>
              </View>

              <Text style={styles.fieldLabel}>PHONE NUMBER</Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="0917XXXXXXX"
                placeholderTextColor="#555"
                keyboardType="phone-pad"
                style={styles.modalInput}
              />

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Set as default delivery address</Text>
                <Switch
                  value={isDefault}
                  onValueChange={setIsDefault}
                  trackColor={{ false: '#333', true: '#c62828' }}
                  thumbColor="#fff"
                />
              </View>

              {!!formError && <Text style={styles.formErrorText}>{formError}</Text>}

              <TouchableOpacity
                style={[styles.saveAddressBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveAddressText}>
                    {editingAddress ? 'Update Address' : 'Save Address'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SubPage>
  );
}

function ReviewsView({ onBack }: { onBack: () => void }) {
  const { reviews, removeReview } = useApp();

  const handleDelete = (id: string, title: string) => {
    Alert.alert('Delete Review', `Remove your review for ${title}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void removeReview(id);
        },
      },
    ]);
  };

  return (
    <SubPage title="My Reviews" onBack={onBack}>
      <ScrollView contentContainerStyle={styles.cardList}>
        {reviews.length === 0 && <Empty icon="star" text="You have not reviewed a purchase yet." />}
        {reviews.map((review) => (
          <View key={review.id} style={styles.infoCard}>
            <View style={styles.titleRow}>
              <TouchableOpacity
                onPress={() => {
                  if (review.product?.slug) {
                    router.push({ pathname: '/product', params: { slug: review.product.slug } });
                  }
                }}
                style={{ flex: 1 }}
              >
                <Text style={styles.cardTitle}>{review.product?.name ?? 'Camera review'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDelete(review.id, review.product?.name ?? 'camera')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="trash-2" size={15} color="#888" />
              </TouchableOpacity>
            </View>
            <Text style={styles.rating}>
              {'★'.repeat(review.rating)}
              {'☆'.repeat(5 - review.rating)}
            </Text>
            <Text style={styles.cardBody}>{review.comment}</Text>
            <Text style={styles.cardMeta}>
              {review.verifiedPurchase ? 'Verified purchase' : 'Review'} ·{' '}
              {new Date(review.createdAt).toLocaleDateString()}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SubPage>
  );
}

function WishlistView({ onBack }: { onBack: () => void }) {
  const { wishlist, products, addToCart, toggleWishlist, user } = useApp();
  const wishlistedProducts = products.filter((p) => wishlist.includes(p.id));

  return (
    <SubPage title="My Wishlist" onBack={onBack}>
      <ScrollView contentContainerStyle={styles.cardList}>
        {wishlistedProducts.length === 0 && (
          <View style={styles.empty}>
            <Feather name="heart" size={34} color="#444" />
            <Text style={styles.anonTitle}>Nothing saved yet</Text>
            <Text style={styles.anonSub}>
              Browse our collection of digicams and tap the heart icon to save your favorites here.
            </Text>
            <TouchableOpacity
              style={styles.actionPill}
              onPress={() => router.replace('/(tabs)/home')}
            >
              <Text style={styles.actionPillText}>Browse Cameras</Text>
            </TouchableOpacity>
          </View>
        )}
        {wishlistedProducts.map((product) => {
          const cond = CONDITION_COLORS[product.condition];
          return (
            <TouchableOpacity
              key={product.id}
              style={styles.wishCard}
              onPress={() =>
                router.push({ pathname: '/product', params: { slug: product.slug } })
              }
              activeOpacity={0.85}
            >
              <Image source={{ uri: product.image }} style={styles.wishImg} resizeMode="cover" />
              <View style={{ flex: 1, gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={styles.wishBrand}>{product.brand}</Text>
                  <TouchableOpacity
                    onPress={() => void toggleWishlist(product.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="heart" size={16} color="#c62828" fill="#c62828" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.wishName} numberOfLines={1}>
                  {product.name}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={[styles.condBadge, { borderColor: cond.border }]}>
                    <Text style={[styles.condBadgeText, { color: cond.text }]}>
                      {product.condition}
                    </Text>
                  </View>
                  <Text style={styles.stockLabel}>
                    {product.inStock ? 'In stock' : 'Out of stock'}
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: 4,
                  }}
                >
                  <Text style={styles.wishPrice}>₱{product.price.toLocaleString()}</Text>
                  <TouchableOpacity
                    style={styles.moveToCartBtn}
                    onPress={async () => {
                      if (!user) {
                        router.push('/login');
                        return;
                      }
                      await addToCart(product, 1);
                    }}
                    activeOpacity={0.8}
                  >
                    <Feather name="shopping-bag" size={12} color="#fff" />
                    <Text style={styles.moveToCartText}>Add to Cart</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
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
          <TouchableOpacity
            key={notification.id}
            style={[styles.infoCard, !notification.isRead && styles.unreadCard]}
            onPress={() => {
              if (!notification.isRead) void markNotificationRead(notification.id);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.cardTitle}>{notification.event.replace(/_/g, ' ')}</Text>
            <Text style={styles.cardBody}>{notification.message}</Text>
            <Text style={styles.cardMeta}>
              {new Date(notification.createdAt).toLocaleString()}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SubPage>
  );
}

function Empty({ icon, text }: { icon: keyof typeof Feather.glyphMap; text: string }) {
  return (
    <View style={styles.empty}>
      <Feather name={icon} size={30} color="#444" />
      <Text style={styles.anonSub}>{text}</Text>
    </View>
  );
}

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const {
    user,
    orders,
    wishlist,
    reviews,
    notifications,
    refreshing,
    refreshAccount,
    logout,
  } = useApp();

  const [section, setSection] = useState<Section>('main');
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  if (!user) return <SignedOut />;
  if (section === 'profile') return <ProfileView onBack={() => setSection('main')} />;
  if (section === 'purchases') return <PurchasesView onBack={() => setSection('main')} />;
  if (section === 'addresses') return <AddressesView onBack={() => setSection('main')} />;
  if (section === 'reviews') return <ReviewsView onBack={() => setSection('main')} />;
  if (section === 'notifications') return <NotificationsView onBack={() => setSection('main')} />;
  if (section === 'wishlist') return <WishlistView onBack={() => setSection('main')} />;

  const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={['#4a0808', '#1a0202', 'transparent']} style={styles.topGradient} />

      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>My Account</Text>
        <TouchableOpacity onPress={() => void refreshAccount()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="refresh-cw" size={17} color="#c62828" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.userCard}>
          <View style={styles.avatarMed}>
            <Text style={styles.avatarMedText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{user.name}</Text>
            <Text style={styles.cardMeta}>{user.email}</Text>
          </View>
          {refreshing && <ActivityIndicator color="#c62828" />}
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <TouchableOpacity
            style={styles.statBox}
            onPress={() => setSection('purchases')}
            activeOpacity={0.7}
          >
            <Text style={styles.statValue}>{orders.length}</Text>
            <Text style={styles.statLabel}>Orders</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statBox}
            onPress={() => setSection('wishlist')}
            activeOpacity={0.7}
          >
            <Text style={styles.statValue}>{wishlist.length}</Text>
            <Text style={styles.statLabel}>Wishlist</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statBox}
            onPress={() => setSection('reviews')}
            activeOpacity={0.7}
          >
            <Text style={styles.statValue}>{reviews.length}</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <View style={styles.navGroup}>
          <NavRow icon="user" label="Profile" onPress={() => setSection('profile')} />
          <NavRow icon="map-pin" label="Addresses" onPress={() => setSection('addresses')} />
          <NavRow
            icon="heart"
            label="My Wishlist"
            badge={wishlist.length}
            onPress={() => setSection('wishlist')}
          />
          <NavRow
            icon="shopping-bag"
            label="My Purchases"
            badge={orders.length}
            onPress={() => setSection('purchases')}
          />
          <NavRow
            icon="star"
            label="My Reviews"
            badge={reviews.length}
            onPress={() => setSection('reviews')}
          />
          <NavRow
            icon="bell"
            label="Notifications"
            badge={notifications.filter((item) => !item.isRead).length}
            onPress={() => setSection('notifications')}
          />
        </View>

        <TouchableOpacity
          onPress={() => setShowLogoutModal(true)}
          style={styles.logoutRow}
          activeOpacity={0.7}
        >
          <Feather name="log-out" size={17} color="#c62828" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Logout Confirmation Modal */}
      <Modal visible={showLogoutModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Feather name="log-out" size={24} color="#c62828" />
            </View>
            <Text style={styles.modalTitle}>Sign Out?</Text>
            <Text style={styles.modalSub}>
              Are you sure you want to sign out of your RePXL account?
            </Text>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowLogoutModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={async () => {
                  setShowLogoutModal(false);
                  await logout();
                  router.replace('/(tabs)/home');
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.modalConfirmText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 220 },
  centeredFull: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 32,
    backgroundColor: '#0d0d0d',
  },
  anonIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1c1c1e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  anonTitle: { fontFamily: 'Inter_800ExtraBold', fontSize: 20, color: '#fff' },
  anonSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
    lineHeight: 22,
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: '#c62828',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryBtnText: { fontFamily: 'Inter_700Bold', fontSize: 15, color: '#fff' },
  secondaryBtn: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2c2c2e',
  },
  secondaryBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#aaa' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  topBarTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, color: '#fff' },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 14,
    backgroundColor: '#1c1c1e',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2c2c2e',
  },
  avatarMed: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#8b0000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMedText: { fontFamily: 'Inter_800ExtraBold', fontSize: 19, color: '#fff' },
  statsRow: { flexDirection: 'row', marginHorizontal: 20, gap: 8, marginBottom: 16 },
  statBox: {
    flex: 1,
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2c2c2e',
    paddingVertical: 12,
    alignItems: 'center',
  },
  statValue: { fontFamily: 'Inter_800ExtraBold', fontSize: 19, color: '#fff' },
  statLabel: { fontFamily: 'Inter_400Regular', fontSize: 10, color: '#666' },
  sectionLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: '#555',
    letterSpacing: 1.2,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  navGroup: {
    backgroundColor: '#111',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#1e1e1e',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  navIcon: { width: 28, alignItems: 'center' },
  navLabel: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 14, color: '#ccc' },
  badge: {
    backgroundColor: '#c62828',
    borderRadius: 99,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  badgeText: { fontFamily: 'Inter_700Bold', fontSize: 11, color: '#fff' },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginTop: 8,
  },
  logoutText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#c62828' },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 16,
  },
  subHeaderTitle: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 18,
    color: '#fff',
    marginLeft: 12,
  },
  addIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c62828',
  },
  addBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: '#c62828',
  },
  pageContent: { paddingHorizontal: 20, paddingBottom: 48, gap: 10 },
  avatarLarge: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#8b0000',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 10,
  },
  avatarInitials: { fontFamily: 'Inter_800ExtraBold', fontSize: 26, color: '#fff' },
  fieldLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: '#888',
    marginTop: 6,
  },
  input: {
    backgroundColor: '#1c1c1e',
    borderWidth: 1,
    borderColor: '#2c2c2e',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    color: '#fff',
  },
  readOnly: { backgroundColor: '#161618', borderRadius: 10, padding: 14 },
  readOnlyText: { color: '#888', fontFamily: 'Inter_400Regular' },
  statusMessage: { color: '#aaa', textAlign: 'center', marginVertical: 8 },
  cardList: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  infoCard: {
    backgroundColor: '#1c1c1e',
    borderRadius: 14,
    padding: 15,
    borderWidth: 1,
    borderColor: '#2c2c2e',
    gap: 6,
  },
  unreadCard: { borderColor: '#8b2020' },
  orderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#1c1c1e',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2c2c2e',
  },
  orderImage: { width: 64, height: 64, borderRadius: 10, backgroundColor: '#111' },
  cardTitle: { fontFamily: 'Inter_700Bold', fontSize: 14, color: '#fff' },
  cardMeta: { fontFamily: 'Inter_400Regular', fontSize: 11, color: '#777', marginTop: 3 },
  cardBody: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#bbb', lineHeight: 19 },
  orderTotal: { fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: '#fff', marginTop: 7 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  defaultBadge: {
    color: '#4caf50',
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    borderWidth: 1,
    borderColor: '#4caf50',
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  rating: { color: '#f5a623', letterSpacing: 2 },
  empty: { alignItems: 'center', paddingVertical: 70, gap: 12 },
  actionPill: {
    backgroundColor: '#c62828',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginTop: 6,
  },
  actionPillText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: '#fff',
  },
  cardActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#252528',
  },
  cardActionBtn: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  cardActionText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: '#aaa',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#1c1c1e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 18,
    maxHeight: '85%',
  },
  modalSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2c2c2e',
  },
  modalSheetTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#fff',
  },
  modalInput: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#2c2c2e',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 10,
    paddingHorizontal: 2,
  },
  switchLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#ccc',
  },
  formErrorText: {
    color: '#f44336',
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    textAlign: 'center',
    marginVertical: 4,
  },
  saveAddressBtn: {
    backgroundColor: '#c62828',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveAddressText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#1c1c1e',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2c2c2e',
    padding: 22,
    alignItems: 'center',
    gap: 12,
  },
  modalIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(198, 40, 40, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 18,
    color: '#fff',
  },
  modalSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    lineHeight: 19,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2c2c2e',
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#aaa',
  },
  modalConfirmBtn: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#c62828',
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: '#fff',
  },
  wishCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#1c1c1e',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2c2c2e',
    alignItems: 'center',
  },
  wishImg: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: '#111',
  },
  wishBrand: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: '#666',
    letterSpacing: 0.5,
  },
  wishName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: '#fff',
  },
  condBadge: {
    borderWidth: 1,
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  condBadgeText: {
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
  },
  stockLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: '#4caf50',
  },
  wishPrice: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 14,
    color: '#fff',
  },
  moveToCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#c62828',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  moveToCartText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: '#fff',
  },
});
