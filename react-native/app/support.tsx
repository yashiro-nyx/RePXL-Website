import { useState, useMemo, useRef, useEffect } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
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
import { FAQS, FAQ_CATEGORIES, type FAQItem } from '../data/faqs';
import { QUICK_PROMPTS, generateAiResponse } from '../data/ai-concierge';

type SupportTab = 'ai' | 'faq' | 'contact';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export default function SupportScreen() {
  const insets = useSafeAreaInsets();
  const { profile, user, contactSupport } = useApp();

  const [activeTab, setActiveTab] = useState<SupportTab>('ai');

  // AI Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Hello! I am your RePXL Vintage Camera AI Concierge. How can I help you today? Feel free to ask about condition grading, order tracking, camera recommendations, or store policies.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatScrollRef = useRef<ScrollView>(null);

  // FAQ State
  const [faqCategory, setFaqCategory] = useState<(typeof FAQ_CATEGORIES)[number]>('All');
  const [faqSearch, setFaqSearch] = useState('');
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>('1');

  // Contact Form State
  const [contactName, setContactName] = useState(profile?.name || user?.name || '');
  const [contactEmail, setContactEmail] = useState(profile?.email || user?.email || '');
  const [contactSubject, setContactSubject] = useState('General Inquiry');
  const [contactMessage, setContactMessage] = useState('');
  const [submittingContact, setSubmittingContact] = useState(false);
  const [contactError, setContactError] = useState('');
  const [contactSuccess, setContactSuccess] = useState('');

  const filteredFaqs = useMemo(() => {
    const q = faqSearch.trim().toLowerCase();
    return FAQS.filter((item) => {
      const matchesCategory = faqCategory === 'All' || item.category === faqCategory;
      const matchesSearch =
        !q || item.question.toLowerCase().includes(q) || item.answer.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [faqCategory, faqSearch]);

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || chatInput).trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setChatInput('');
    setIsTyping(true);

    setTimeout(() => {
      const replyText = generateAiResponse(text);
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setIsTyping(false);
    }, 600);
  };

  useEffect(() => {
    if (activeTab === 'ai') {
      setTimeout(() => {
        chatScrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, isTyping, activeTab]);

  const handleSubmitContact = async () => {
    if (!contactName.trim()) {
      setContactError('Please enter your name.');
      return;
    }
    if (!contactEmail.trim() || !contactEmail.includes('@')) {
      setContactError('Please enter a valid email address.');
      return;
    }
    if (!contactMessage.trim() || contactMessage.trim().length < 10) {
      setContactError('Message must be at least 10 characters.');
      return;
    }

    setSubmittingContact(true);
    setContactError('');
    setContactSuccess('');

    try {
      const msg = await contactSupport({
        name: contactName.trim(),
        email: contactEmail.trim().toLowerCase(),
        subject: contactSubject,
        message: contactMessage.trim(),
      });
      setContactSuccess(msg);
      setContactMessage('');
    } catch (err) {
      setContactError(err instanceof Error ? err.message : 'Unable to submit contact form.');
    } finally {
      setSubmittingContact(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <LinearGradient
          colors={['#4a0808', '#1a0202', 'transparent']}
          start={{ x: 0.3, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerTitle}>Customer Support</Text>
            <Text style={styles.headerSub}>Help Center & AI Concierge</Text>
          </View>
        </View>

        {/* Tab Navigation */}
        <View style={styles.navTabs}>
          <TouchableOpacity
            style={[styles.navTab, activeTab === 'ai' && styles.navTabActive]}
            onPress={() => setActiveTab('ai')}
            activeOpacity={0.7}
          >
            <Feather name="message-square" size={14} color={activeTab === 'ai' ? '#fff' : '#777'} />
            <Text style={[styles.navTabText, activeTab === 'ai' && styles.navTabTextActive]}>
              AI Assistant
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navTab, activeTab === 'faq' && styles.navTabActive]}
            onPress={() => setActiveTab('faq')}
            activeOpacity={0.7}
          >
            <Feather name="help-circle" size={14} color={activeTab === 'faq' ? '#fff' : '#777'} />
            <Text style={[styles.navTabText, activeTab === 'faq' && styles.navTabTextActive]}>
              FAQs
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navTab, activeTab === 'contact' && styles.navTabActive]}
            onPress={() => setActiveTab('contact')}
            activeOpacity={0.7}
          >
            <Feather name="mail" size={14} color={activeTab === 'contact' ? '#fff' : '#777'} />
            <Text style={[styles.navTabText, activeTab === 'contact' && styles.navTabTextActive]}>
              Contact Us
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content Area */}
        {activeTab === 'ai' && (
          <View style={styles.tabContentFull}>
            {/* Quick Prompts Bar */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.promptScroll}
            >
              {QUICK_PROMPTS.map((prompt, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.promptChip}
                  onPress={() => handleSendMessage(prompt)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.promptChipText}>{prompt}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Messages Scroll Area */}
            <ScrollView
              ref={chatScrollRef}
              contentContainerStyle={styles.chatScroll}
              keyboardShouldPersistTaps="handled"
            >
              {messages.map((msg) => (
                <View
                  key={msg.id}
                  style={[
                    styles.messageBubble,
                    msg.sender === 'user' ? styles.userBubble : styles.assistantBubble,
                  ]}
                >
                  {msg.sender === 'assistant' && (
                    <View style={styles.avatarMini}>
                      <Text style={styles.avatarMiniText}>R</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.messageText,
                        msg.sender === 'user' ? styles.userMessageText : styles.assistantMessageText,
                      ]}
                    >
                      {msg.text}
                    </Text>
                    <Text
                      style={[
                        styles.messageTime,
                        msg.sender === 'user' ? { textAlign: 'right' } : { textAlign: 'left' },
                      ]}
                    >
                      {msg.timestamp}
                    </Text>
                  </View>
                </View>
              ))}

              {isTyping && (
                <View style={[styles.messageBubble, styles.assistantBubble]}>
                  <View style={styles.avatarMini}>
                    <Text style={styles.avatarMiniText}>R</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 }}>
                    <ActivityIndicator size="small" color="#c62828" />
                    <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: '#888' }}>
                      RePXL AI is typing...
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Input Bar */}
            <View style={[styles.inputBar, { paddingBottom: insets.bottom > 0 ? insets.bottom : 12 }]}>
              <TextInput
                value={chatInput}
                onChangeText={setChatInput}
                placeholder="Ask about cameras, shipping, grading..."
                placeholderTextColor="#555"
                style={styles.chatTextInput}
                onSubmitEditing={() => handleSendMessage()}
              />
              <TouchableOpacity
                style={[styles.sendBtn, !chatInput.trim() && { opacity: 0.4 }]}
                onPress={() => handleSendMessage()}
                disabled={!chatInput.trim()}
                activeOpacity={0.8}
              >
                <Feather name="send" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {activeTab === 'faq' && (
          <View style={styles.tabContentFull}>
            {/* Search Input */}
            <View style={styles.searchWrap}>
              <Feather name="search" size={16} color="#777" />
              <TextInput
                value={faqSearch}
                onChangeText={setFaqSearch}
                placeholder="Search FAQs..."
                placeholderTextColor="#666"
                style={styles.searchInput}
              />
              {!!faqSearch && (
                <TouchableOpacity onPress={() => setFaqSearch('')}>
                  <Feather name="x" size={16} color="#777" />
                </TouchableOpacity>
              )}
            </View>

            {/* Category Pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScroll}
            >
              {FAQ_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catChip, faqCategory === cat && styles.catChipActive]}
                  onPress={() => setFaqCategory(cat)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.catChipText, faqCategory === cat && styles.catChipTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* FAQ Items */}
            <ScrollView contentContainerStyle={styles.faqList}>
              {filteredFaqs.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <Feather name="search" size={32} color="#444" />
                  <Text style={styles.emptyText}>No matching questions found.</Text>
                </View>
              ) : (
                filteredFaqs.map((faq) => {
                  const isOpen = expandedFaqId === faq.id;
                  return (
                    <TouchableOpacity
                      key={faq.id}
                      style={styles.faqCard}
                      onPress={() => setExpandedFaqId(isOpen ? null : faq.id)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.faqCardHeader}>
                        <Text style={styles.faqQuestion}>{faq.question}</Text>
                        <Feather
                          name={isOpen ? 'chevron-up' : 'chevron-down'}
                          size={18}
                          color={isOpen ? '#c62828' : '#777'}
                        />
                      </View>
                      {isOpen && (
                        <View style={styles.faqCardBody}>
                          <Text style={styles.faqAnswer}>{faq.answer}</Text>
                          <Text style={styles.faqCategoryLabel}>{faq.category}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        )}

        {activeTab === 'contact' && (
          <ScrollView contentContainerStyle={styles.contactScroll} keyboardShouldPersistTaps="handled">
            {/* Direct Contact Cards */}
            <View style={styles.infoRow}>
              <TouchableOpacity
                style={styles.infoCard}
                onPress={() => Linking.openURL('mailto:support@repxl.com')}
                activeOpacity={0.8}
              >
                <Feather name="mail" size={18} color="#c62828" />
                <Text style={styles.infoCardTitle}>Email Support</Text>
                <Text style={styles.infoCardValue}>support@repxl.com</Text>
              </TouchableOpacity>

              <View style={styles.infoCard}>
                <Feather name="clock" size={18} color="#c62828" />
                <Text style={styles.infoCardTitle}>Response Time</Text>
                <Text style={styles.infoCardValue}>Within 24 hours</Text>
              </View>
            </View>

            {/* Form */}
            <View style={styles.contactForm}>
              <Text style={styles.formHeading}>Send us a Message</Text>
              <Text style={styles.formSub}>
                Have a question about a camera or an order? Fill out the form below.
              </Text>

              <Text style={styles.fieldLabel}>YOUR NAME</Text>
              <TextInput
                value={contactName}
                onChangeText={setContactName}
                placeholder="Juan Dela Cruz"
                placeholderTextColor="#555"
                style={styles.formInput}
              />

              <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
              <TextInput
                value={contactEmail}
                onChangeText={setContactEmail}
                placeholder="juan@example.com"
                placeholderTextColor="#555"
                style={styles.formInput}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.fieldLabel}>SUBJECT</Text>
              <View style={styles.subjectRow}>
                {['General Inquiry', 'Order Issue', 'Condition Concern', 'Selling'].map((subj) => (
                  <TouchableOpacity
                    key={subj}
                    style={[styles.subjectChip, contactSubject === subj && styles.subjectChipActive]}
                    onPress={() => setContactSubject(subj)}
                  >
                    <Text
                      style={[
                        styles.subjectChipText,
                        contactSubject === subj && styles.subjectChipTextActive,
                      ]}
                    >
                      {subj}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>MESSAGE</Text>
              <TextInput
                value={contactMessage}
                onChangeText={setContactMessage}
                placeholder="Describe your inquiry with as much detail as possible..."
                placeholderTextColor="#555"
                style={[styles.formInput, styles.formTextarea]}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              {!!contactError && <Text style={styles.formError}>{contactError}</Text>}
              {!!contactSuccess && (
                <View style={styles.successBox}>
                  <Feather name="check-circle" size={18} color="#4caf50" />
                  <Text style={styles.successText}>{contactSuccess}</Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleSubmitContact}
                disabled={submittingContact}
                activeOpacity={0.85}
              >
                {submittingContact ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Submit Message</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  gradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 260 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: { fontFamily: 'Inter_800ExtraBold', fontSize: 20, color: '#fff' },
  headerSub: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#888' },
  navTabs: {
    flexDirection: 'row',
    backgroundColor: '#161618',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 3,
  },
  navTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 9,
  },
  navTabActive: { backgroundColor: '#262628' },
  navTabText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#777' },
  navTabTextActive: { color: '#fff' },
  tabContentFull: { flex: 1 },

  // AI Chat Styles
  promptScroll: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  promptChip: {
    backgroundColor: '#1a1a1c',
    borderWidth: 1,
    borderColor: '#2e2e30',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  promptChipText: { fontFamily: 'Inter_500Medium', fontSize: 11, color: '#ccc' },
  chatScroll: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  messageBubble: {
    flexDirection: 'row',
    gap: 10,
    maxWidth: '86%',
    padding: 12,
    borderRadius: 14,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#1a1a1c',
    borderWidth: 1,
    borderColor: '#262628',
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#7f1d1d',
  },
  avatarMini: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#c62828',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMiniText: { fontFamily: 'Inter_800ExtraBold', fontSize: 12, color: '#fff' },
  messageText: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 20 },
  assistantMessageText: { color: '#e0e0e0' },
  userMessageText: { color: '#fff' },
  messageTime: { fontFamily: 'Inter_400Regular', fontSize: 10, color: '#888', marginTop: 4 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#141416',
    borderTopWidth: 1,
    borderTopColor: '#202022',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  chatTextInput: {
    flex: 1,
    backgroundColor: '#1e1e20',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#c62828',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // FAQ Styles
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1a1a1c',
    borderWidth: 1,
    borderColor: '#2c2c2e',
    borderRadius: 10,
    marginHorizontal: 16,
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: { flex: 1, color: '#fff', fontFamily: 'Inter_400Regular', fontSize: 14 },
  categoryScroll: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  catChip: {
    backgroundColor: '#1a1a1c',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#262628',
  },
  catChipActive: { backgroundColor: '#c62828', borderColor: '#c62828' },
  catChipText: { fontFamily: 'Inter_500Medium', fontSize: 11, color: '#888' },
  catChipTextActive: { color: '#fff' },
  faqList: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
  faqCard: {
    backgroundColor: '#161618',
    borderWidth: 1,
    borderColor: '#242426',
    borderRadius: 12,
    padding: 14,
  },
  faqCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  faqQuestion: { flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#eee', paddingRight: 8 },
  faqCardBody: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#222', paddingTop: 10 },
  faqAnswer: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#aaa', lineHeight: 19 },
  faqCategoryLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: '#c62828',
    marginTop: 8,
    textTransform: 'uppercase',
  },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#666' },

  // Contact Form Styles
  contactScroll: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 4 },
  infoRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  infoCard: {
    flex: 1,
    backgroundColor: '#161618',
    borderWidth: 1,
    borderColor: '#242426',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  infoCardTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#888', marginTop: 2 },
  infoCardValue: { fontFamily: 'Inter_700Bold', fontSize: 12, color: '#fff' },
  contactForm: {
    backgroundColor: '#161618',
    borderWidth: 1,
    borderColor: '#242426',
    borderRadius: 14,
    padding: 16,
  },
  formHeading: { fontFamily: 'Inter_700Bold', fontSize: 16, color: '#fff', marginBottom: 4 },
  formSub: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#888', marginBottom: 16 },
  fieldLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#888', letterSpacing: 0.5, marginBottom: 6 },
  formInput: {
    backgroundColor: '#1e1e20',
    borderWidth: 1,
    borderColor: '#2e2e30',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#fff',
    fontFamily: 'Inter_400Regular',
    marginBottom: 12,
  },
  formTextarea: { height: 90 },
  subjectRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  subjectChip: {
    backgroundColor: '#1e1e20',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#2e2e30',
  },
  subjectChipActive: { backgroundColor: '#c62828', borderColor: '#c62828' },
  subjectChipText: { fontFamily: 'Inter_500Medium', fontSize: 11, color: '#888' },
  subjectChipTextActive: { color: '#fff' },
  formError: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#f44336', textAlign: 'center', marginBottom: 10 },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(76, 175, 80, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  successText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 12, color: '#81c784' },
  submitBtn: {
    backgroundColor: '#c62828',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
  },
  submitBtnText: { fontFamily: 'Inter_700Bold', fontSize: 14, color: '#fff' },
});

