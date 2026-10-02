import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  AppState,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { api } from '../src/services/api'
import { useScreenSync } from '../src/hooks/useScreenSync'
import { getSafeTopInset } from '../src/utils/layout'
import {
  canRecordReturnShipment,
  isWithinReturnWindow,
  REASON_OPTIONS,
  validateReturnInput,
  validateReturnShipment,
  type ReturnInput,
  type ReturnRequest,
  type ReturnReason,
} from '../src/utils/returns'
import {
  calculateReturnQuote,
  getReturnStage,
  getReturnTimeline,
} from '../src/utils/return-workflow'
import type { Order } from '../types'

type Evidence = { uri: string; publicId: string }

export default function ReturnRequestScreen() {
  const { orderNumber } = useLocalSearchParams<{ orderNumber: string }>()
  const insets = useSafeAreaInsets()
  const [order, setOrder] = useState<Order | null>(null)
  const [request, setRequest] = useState<ReturnRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [reason, setReason] = useState<ReturnReason | ''>('')
  const [details, setDetails] = useState('')
  const [images, setImages] = useState<Evidence[]>([])
  const [busy, setBusy] = useState(false)
  const [step, setStep] = useState(1)
  const [retrying, setRetrying] = useState(false)
  const [carrier, setCarrier] = useState('')
  const [tracking, setTracking] = useState('')
  const [notice, setNotice] = useState('')
  const scrollRef = useRef<ScrollView>(null)
  const actionLock = useRef(false)
  const load = useCallback(async () => {
    if (!orderNumber) {
      setError('Order number is missing.')
      setLoading(false)
      return
    }
    try {
      setError('')
      const [nextOrder, nextRequest] = await Promise.all([
        api.order(orderNumber),
        api.returnRequest(orderNumber),
      ])
      setOrder(nextOrder)
      setRequest(nextRequest)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to load return details.'
      )
    } finally {
      setLoading(false)
    }
  }, [orderNumber])
  useEffect(() => {
    void load()
  }, [load])
  useScreenSync({ onSync: load })
  useFocusEffect(
    useCallback(() => {
      const subscription = AppState.addEventListener('change', (state) => {
        if (state === 'active' && !actionLock.current) void load()
      })
      const timer = setInterval(() => {
        if (
          AppState.currentState === 'active' &&
          !actionLock.current &&
          request &&
          request.status !== 'REJECTED' &&
          request.status !== 'REFUNDED'
        )
          void load()
      }, 15000)
      return () => {
        subscription.remove()
        clearInterval(timer)
      }
    }, [load, request])
  )
  const eligible =
    order && isWithinReturnWindow(order) && order.paymentStatus !== 'REFUNDED'
  const canSubmit =
    eligible && (!request || (request.status === 'REJECTED' && retrying))
  const photoRequired = REASON_OPTIONS.find(
    (option) => option.value === reason
  )?.evidenceRequired
  const selectedItems =
    order?.items.filter((item) => selected.includes(item.id)) ?? []
  let quote: ReturnType<typeof calculateReturnQuote> | null = null
  if (
    order &&
    selectedItems.length &&
    order.discount != null &&
    order.shippingCost != null
  ) {
    try {
      quote = calculateReturnQuote(
        {
          ...order,
          discount: order.discount,
          shippingCost: order.shippingCost,
        },
        selectedItems.map((item) => ({
          orderItemId: item.id,
          quantity: item.quantity,
        }))
      )
    } catch {
      /* Missing or invalid pricing cannot be presented as a refund estimate. */
    }
  }
  const money = (amount: number) => `PHP ${amount.toFixed(2)}`
  const changeStep = (value: number) => {
    setStep(value)
    setError('')
    scrollRef.current?.scrollTo({ y: 0, animated: true })
  }
  const next = () => {
    const validation =
      step === 1
        ? !selected.length
          ? 'Select at least one item to return.'
          : null
        : validateReturnInput({
            orderNumber,
            selectedItemIds: selected,
            reason: reason as ReturnReason,
            details: details.trim() || undefined,
            imagePublicIds: images.map((image) => image.publicId),
          })
    if (validation) {
      setError(validation)
      return
    }
    changeStep(step + 1)
  }

  const addPhoto = async () => {
    if (actionLock.current || images.length >= 5) return
    actionLock.current = true
    setBusy(true)
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      })
      if (result.canceled) return
      const asset = result.assets[0]
      const mimeType =
        asset.mimeType ||
        (asset.uri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg')
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType))
        throw new Error('Choose a JPG, PNG, or WebP image.')
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024)
        throw new Error('Each image must be 5 MB or smaller.')
      const form = new FormData()
      if (Platform.OS === 'web') {
        const blob = await (await fetch(asset.uri)).blob()
        form.append('file', blob, asset.fileName || 'evidence.jpg')
      } else {
        // React Native's FormData accepts file descriptors for native URIs.
        form.append('file', {
          uri: asset.uri,
          name: asset.fileName || 'evidence.jpg',
          type: mimeType,
        } as unknown as Blob)
      }
      const uploaded = await api.uploadReturnImage(form)
      setImages((current) => [
        ...current,
        { uri: asset.uri, publicId: uploaded.publicId },
      ])
    } catch (err) {
      Alert.alert(
        'Photo upload failed',
        err instanceof Error ? err.message : 'Please try again.'
      )
    } finally {
      actionLock.current = false
      setBusy(false)
    }
  }
  const removePhoto = async (image: Evidence) => {
    if (actionLock.current) return
    actionLock.current = true
    setBusy(true)
    try {
      await api.deleteReturnImage(image.publicId)
      setImages((current) =>
        current.filter((entry) => entry.publicId !== image.publicId)
      )
    } catch (err) {
      Alert.alert(
        'Unable to remove photo',
        err instanceof Error ? err.message : 'Please try again.'
      )
    } finally {
      actionLock.current = false
      setBusy(false)
    }
  }
  const submit = async () => {
    if (actionLock.current || !order || !canSubmit) return
    const input: ReturnInput = {
      orderNumber: order.orderNumber,
      selectedItemIds: selected,
      reason: reason as ReturnReason,
      details: details.trim() || undefined,
      imagePublicIds: images.map((image) => image.publicId),
    }
    const validation = validateReturnInput(input)
    if (validation) {
      setError(validation)
      return
    }
    actionLock.current = true
    setBusy(true)
    setError('')
    try {
      setRequest(await api.submitReturn(input))
      setImages([])
      setRetrying(false)
      setNotice(
        'Request received. Wait for approval and return instructions before sending any items.'
      )
      await load()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Submission failed. Please try again.'
      )
    } finally {
      actionLock.current = false
      setBusy(false)
    }
  }
  const saveTracking = async () => {
    if (actionLock.current || !request || !canRecordReturnShipment(request))
      return
    const input = {
      returnRequestId: request.id,
      returnCarrier: carrier.trim(),
      returnTrackingNumber: tracking.trim(),
    }
    const validation = validateReturnShipment(input)
    if (validation) {
      setError(validation)
      return
    }
    actionLock.current = true
    setBusy(true)
    setError('')
    try {
      await api.recordReturnShipment(orderNumber, input)
      setNotice(
        'Return tracking saved. Our team will update this page when the items arrive.'
      )
      setCarrier('')
      setTracking('')
      await load()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to save tracking. Your entries are preserved; please try again.'
      )
    } finally {
      actionLock.current = false
      setBusy(false)
    }
  }
  const back = () => {
    if (busy) return
    if (router.canGoBack()) router.back()
    else router.replace({ pathname: '/order', params: { orderNumber } })
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { paddingTop: getSafeTopInset(insets) }]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={back}
          disabled={busy}
          accessibilityLabel="Back to order"
        >
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Return / Refund</Text>
        <TouchableOpacity
          onPress={() => void load()}
          disabled={busy}
          accessibilityLabel="Refresh return status"
        >
          <Feather name="refresh-cw" size={20} color="#c62828" />
        </TouchableOpacity>
      </View>
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: 20,
          gap: 16,
          paddingBottom: Math.max(insets.bottom, 24) + 20,
        }}
      >
        {loading && <ActivityIndicator color="#c62828" />}
        {!!error && (
          <View style={styles.card}>
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
            <TouchableOpacity onPress={() => void load()} disabled={busy}>
              <Text style={styles.link}>Refresh details</Text>
            </TouchableOpacity>
          </View>
        )}
        {order && <Text style={styles.text}>{order.orderNumber}</Text>}
        {!!notice && (
          <Text accessibilityRole="alert" style={styles.success}>
            {notice}
          </Text>
        )}
        {request && !retrying && (
          <>
            <View style={styles.card}>
              <Text style={styles.title}>{getReturnStage(request)}</Text>
              {getReturnTimeline(request).map((milestone, index) => (
                <View key={milestone.label} style={styles.option}>
                  <Feather
                    name={milestone.date ? 'check-circle' : 'circle'}
                    size={20}
                    color={milestone.date ? '#4ade80' : '#777'}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.text}>
                      {index + 1}. {milestone.label}
                    </Text>
                    <Text style={styles.muted}>
                      {milestone.date
                        ? new Date(milestone.date).toLocaleString()
                        : request.status === 'REJECTED'
                          ? 'Not completed'
                          : 'Pending'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
            <View style={styles.card}>
              <Text style={styles.title}>Your request</Text>
              <Text style={styles.text}>{request.reason}</Text>
              {order?.items
                .filter(
                  (item) =>
                    !request.items?.length ||
                    request.items.some((entry) => entry.orderItemId === item.id)
                )
                .map((item) => (
                  <Text key={item.id} style={styles.text}>
                    {item.product.name} / Qty{' '}
                    {request.items?.find(
                      (entry) => entry.orderItemId === item.id
                    )?.quantity ?? item.quantity}
                  </Text>
                ))}
              <Text style={styles.muted}>
                Updated {new Date(request.updatedAt).toLocaleString()}
              </Text>
              {!!request.rejectionReason && (
                <Text style={styles.error}>
                  Reason: {request.rejectionReason}
                </Text>
              )}
              {request.status === 'APPROVED' && (
                <Text style={styles.text}>
                  {request.returnInstructions ||
                    'Our team will provide return instructions. Receipt and inspection are required before refunding.'}
                </Text>
              )}
              {request.refundStatus && request.status !== 'REFUNDED' && (
                <Text style={styles.text}>
                  Refund status: {request.refundStatus}. Completion is confirmed
                  separately.
                </Text>
              )}
              {request.refundAmount != null && (
                <Text style={styles.text}>
                  Refund amount: PHP {request.refundAmount.toFixed(2)}
                </Text>
              )}
              {request.refundAmount == null && request.refundQuote && (
                <Text style={styles.text}>
                  Estimated item refund:{' '}
                  {money(request.refundQuote.itemsAmount)}
                </Text>
              )}
              {request.refundStatus === 'unknown' && (
                <Text style={styles.muted}>
                  Our team is confirming the provider response. Your refund is
                  not yet complete.
                </Text>
              )}
              {request.refundStatus === 'failed' && (
                <Text style={styles.error}>
                  The refund needs attention. Our team will review it; contact
                  support if you need help.
                </Text>
              )}
              {request.status === 'REFUNDED' && (
                <Text style={styles.text}>
                  Your refund has been processed to your original payment
                  method.{' '}
                  {request.refundId ? `Reference: ${request.refundId}` : ''}
                </Text>
              )}
            </View>
            {request.returnTrackingNumber && (
              <View style={styles.card}>
                <Text style={styles.title}>Return shipment</Text>
                <Text style={styles.text}>
                  {request.returnCarrier} / {request.returnTrackingNumber}
                </Text>
              </View>
            )}
            {canRecordReturnShipment(request) && (
              <View style={styles.card}>
                <Text style={styles.title}>
                  {request.returnTrackingNumber
                    ? 'Update return tracking'
                    : 'Record return shipment'}
                </Text>
                <Text style={styles.muted}>
                  Follow the approved instructions before sending your items.
                  Record the actual carrier and tracking number after shipment.
                </Text>
                <TextInput
                  accessibilityLabel="Return carrier"
                  editable={!busy}
                  maxLength={100}
                  value={carrier}
                  onChangeText={setCarrier}
                  placeholder={request.returnCarrier || 'Carrier name'}
                  placeholderTextColor="#777"
                  style={[styles.input, styles.singleInput]}
                />
                <TextInput
                  accessibilityLabel="Return tracking number"
                  editable={!busy}
                  maxLength={150}
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={tracking}
                  onChangeText={setTracking}
                  placeholder={
                    request.returnTrackingNumber || 'Tracking number'
                  }
                  placeholderTextColor="#777"
                  style={[styles.input, styles.singleInput]}
                />
                <TouchableOpacity
                  accessibilityRole="button"
                  style={[styles.button, busy && { opacity: 0.5 }]}
                  disabled={busy}
                  onPress={() => void saveTracking()}
                >
                  <Text style={styles.buttonText}>
                    {busy ? 'Saving...' : 'Save tracking'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            {request.status === 'REJECTED' && eligible && (
              <TouchableOpacity
                accessibilityRole="button"
                style={styles.button}
                disabled={busy}
                onPress={() => {
                  setRetrying(true)
                  changeStep(1)
                }}
              >
                <Text style={styles.buttonText}>Submit a revised request</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => router.push('/support')}
            >
              <Text style={styles.link}>Contact support</Text>
            </TouchableOpacity>
          </>
        )}
        {order && !eligible && (!request || request.status === 'REJECTED') && (
          <Text style={styles.muted}>
            {order.paymentStatus === 'REFUNDED'
              ? 'This order has already been refunded.'
              : 'Returns are accepted within 30 days of delivery or completion.'}
          </Text>
        )}
        {canSubmit && order && (
          <>
            <View style={styles.card}>
              {['Select items', 'Reason & photos', 'Review request'].map(
                (label, index) => (
                  <Text
                    key={label}
                    style={index + 1 === step ? styles.success : styles.muted}
                  >
                    {index + 1}. {label}
                    {index + 1 === step ? ' (current step)' : ''}
                  </Text>
                )
              )}
            </View>
            {step === 1 && (
              <>
                <View style={styles.card}>
                  <Text style={styles.title}>Select items to return</Text>
                  {order.items.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      disabled={busy}
                      accessibilityRole="checkbox"
                      accessibilityState={{
                        checked: selected.includes(item.id),
                      }}
                      style={styles.option}
                      onPress={() =>
                        setSelected((current) =>
                          current.includes(item.id)
                            ? current.filter((id) => id !== item.id)
                            : [...current, item.id]
                        )
                      }
                    >
                      <Feather
                        name={
                          selected.includes(item.id) ? 'check-square' : 'square'
                        }
                        size={20}
                        color="#c62828"
                      />
                      <Text style={[styles.text, { flex: 1 }]}>
                        {item.product.name} (Qty: {item.quantity})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
            {step === 2 && (
              <>
                <View style={styles.card}>
                  <Text style={styles.title}>Reason for return</Text>
                  {REASON_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      disabled={busy}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: reason === option.value }}
                      style={styles.option}
                      onPress={() => setReason(option.value)}
                    >
                      <Feather
                        name={
                          reason === option.value ? 'check-circle' : 'circle'
                        }
                        size={20}
                        color="#c62828"
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.text}>{option.label}</Text>
                        {option.evidenceRequired && (
                          <Text style={styles.muted}>Photo required</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.card}>
                  <Text style={styles.title}>
                    Additional details (optional)
                  </Text>
                  <TextInput
                    accessibilityLabel="Additional return details"
                    editable={!busy}
                    multiline
                    maxLength={1000}
                    value={details}
                    onChangeText={setDetails}
                    placeholder="Describe the issue"
                    placeholderTextColor="#777"
                    style={styles.input}
                  />
                  <Text style={styles.muted}>{details.length}/1000</Text>
                </View>
                <View style={styles.card}>
                  <Text style={styles.title}>
                    Photo evidence {photoRequired ? '(required)' : '(optional)'}
                  </Text>
                  <Text style={styles.muted}>
                    Up to 5 JPG, PNG, or WebP images, 5 MB each.
                  </Text>
                  {images.map((image, index) => (
                    <View key={image.publicId} style={styles.option}>
                      <Image
                        source={{ uri: image.uri }}
                        style={{ width: 72, height: 72, borderRadius: 8 }}
                      />
                      <TouchableOpacity
                        disabled={busy}
                        onPress={() => void removePhoto(image)}
                        accessibilityLabel={`Remove photo ${index + 1}`}
                      >
                        <Text style={styles.link}>
                          Remove photo {index + 1}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity
                    disabled={busy || images.length >= 5}
                    onPress={() => void addPhoto()}
                  >
                    <Text style={styles.link}>
                      Add photo ({images.length}/5)
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
            {step === 3 && (
              <View style={styles.card}>
                <Text style={styles.title}>Review your request</Text>
                {selectedItems.map((item) => (
                  <Text key={item.id} style={styles.text}>
                    {item.product.name} / Qty {item.quantity}
                  </Text>
                ))}
                <Text style={styles.text}>
                  Reason:{' '}
                  {
                    REASON_OPTIONS.find((option) => option.value === reason)
                      ?.label
                  }
                </Text>
                {!!details.trim() && (
                  <Text style={styles.text}>{details.trim()}</Text>
                )}
                <Text style={styles.muted}>
                  {images.length} evidence photo(s) attached
                </Text>
                {images.map((image) => (
                  <Image
                    key={image.publicId}
                    source={{ uri: image.uri }}
                    style={{ width: 72, height: 72, borderRadius: 8 }}
                  />
                ))}
                <Text style={styles.text}>
                  {quote
                    ? `Estimated item refund: ${money(quote.itemsAmount)}`
                    : 'Our team will confirm the refundable amount after reviewing the order.'}
                </Text>
                <Text style={styles.muted}>
                  The estimate includes item discounts. Original shipping is
                  reviewed separately for whole-order returns. Approval,
                  receipt, and inspection are required. Refunds follow your
                  original payment method; COD repayments are arranged by our
                  team.
                </Text>
              </View>
            )}
            {busy && <ActivityIndicator color="#c62828" />}
            {step > 1 && (
              <TouchableOpacity
                accessibilityRole="button"
                disabled={busy}
                onPress={() => changeStep(step - 1)}
              >
                <Text style={styles.link}>Back</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              accessibilityRole="button"
              style={[styles.button, busy && { opacity: 0.5 }]}
              disabled={busy}
              onPress={() => (step < 3 ? next() : void submit())}
            >
              <Text style={styles.buttonText}>
                {step < 3
                  ? 'Continue'
                  : busy
                    ? 'Submitting...'
                    : 'Submit return request'}
              </Text>
            </TouchableOpacity>
            {retrying && (
              <TouchableOpacity
                accessibilityRole="button"
                disabled={busy}
                onPress={() => setRetrying(false)}
              >
                <Text style={styles.link}>View existing request</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  header: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#242424',
  },
  title: { color: '#fff', fontSize: 17, fontFamily: 'Inter_700Bold' },
  card: { backgroundColor: '#181818', borderRadius: 14, padding: 16, gap: 12 },
  text: { color: '#eee', fontSize: 14, lineHeight: 21 },
  muted: { color: '#999', fontSize: 12, lineHeight: 18 },
  error: { color: '#f87171', lineHeight: 20 },
  success: { color: '#4ade80', lineHeight: 21 },
  link: { color: '#ef5350', paddingVertical: 8 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  input: {
    color: '#fff',
    minHeight: 100,
    textAlignVertical: 'top',
    padding: 12,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
  },
  singleInput: { minHeight: 48, textAlignVertical: 'center' },
  button: {
    padding: 16,
    borderRadius: 10,
    backgroundColor: '#c62828',
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontFamily: 'Inter_700Bold' },
})
