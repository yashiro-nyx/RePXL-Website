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
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { FAQS, FAQ_CATEGORIES } from '../data/faqs';
import {
  QUICK_PROMPTS,
  PROMPT_CATEGORIES,
  generateAiResponse,
  type AiAction,
} from '../data/ai-concierge';
import { getSafeTopInset } from '../src/utils/layout';

type SupportTab = 'ai' | 'faq' | 'contact';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  suggestedFollowUps?: string[];
  action?: AiAction;
}

function FormattedAiMessage({ text }: { text: string }) {
  const lines = text.split('\n');

  const renderFormattedInline = (lineText: string, keyPrefix: string) => {
    const parts = lineText.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <Text key={`${keyPrefix}-${idx}`} style={styles.boldText}>
            {part.slice(2, -2)}
          </Text>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <Text key={`${keyPrefix}-${idx}`} style={styles.codeText}>
            {part.slice(1, -1)}
          </Text>
        );
      }
      return <Text key={`${keyPrefix}-${idx}`}>{part}</Text>;
    });
  };

  return (
    <View style={styles.formattedContainer}>
      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <View key={index} style={{ height: 6 }} />;
        }

        // Callout box
        if (trimmed.startsWith('💡') || trimmed.startsWith('⚠️') || trimmed.startsWith('🚨')) {
          return (
            <View key={index} style={styles.calloutBox}>
              <Text style={styles.calloutText}>
                {renderFormattedInline(trimmed, `callout-${index}`)}
              </Text>
            </View>
          );
        }

        // Bullet point
        if (trimmed.startsWith('• ') || trimmed.startsWith('- ')) {
          const bulletContent = trimmed.slice(2);
          return (
            <View key={index} style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}>
                {renderFormattedInline(bulletContent, `bullet-${index}`)}
              </Text>
            </View>
          );
        }

        // Numbered list item
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          const num = numMatch[1];
          const content = numMatch[2];
          return (
            <View key={index} style={styles.numberedRow}>
              <View style={styles.numberedBadge}>
                <Text style={styles.numberedBadgeText}>{num}</Text>
              </View>
              <Text style={styles.numberedText}>
                {renderFormattedInline(content, `num-${index}`)}
              </Text>
            </View>
          );
        }

        // Regular paragraph line
        return (
          <Text key={index} style={styles.assistantMessageText}>
            {renderFormattedInline(trimmed, `p-${index}`)}
          </Text>
        );
      })}
    </View>
  );
}

export default function SupportScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tab?: SupportTab; query?: string }>();
  const { profile, user, contactSupport } = useApp();

  const [activeTab, setActiveTab] = useState<SupportTab>(params.tab || 'ai');

  // AI Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `👋 Hello! I am your RePXL Vintage Camera AI Concierge.

How can I help you today? Feel free to ask about:
• Condition grading tiers & optical inspection
• Y2K CCD camera recommendations for your aesthetic
• Batteries, SD card limits & photo transfer tips
• Order tracking, shipping timeframes & 14-day returns`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestedFollowUps: [
        'Recommend a CCD camera',
        'How does condition grading work?',
        'Where is my order?',
        'What memory card size should I use?',
      ],
      action: { type: 'browse', label: 'Explore Vintage Cameras' },
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activePromptCat, setActivePromptCat] = useState<string>('popular');
  const [feedbackMap, setFeedbackMap] = useState<Record<string, 'up' | 'down'>>({});
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

  const currentPrompts = useMemo(() => {
    const found = PROMPT_CATEGORIES.find((c) => c.id === activePromptCat);
    return found ? found.prompts : QUICK_PROMPTS;
  }, [activePromptCat]);

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
      const reply = generateAiResponse(text);
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: reply.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedFollowUps: reply.suggestedFollowUps,
        action: reply.action,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setIsTyping(false);
    }, 600);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome',
        sender: 'assistant',
        text: `👋 Hello! I am your RePXL Vintage Camera AI Concierge.

How can I help you today? Feel free to ask about:
• Condition grading tiers & optical inspection
• Y2K CCD camera recommendations for your aesthetic
• Batteries, SD card limits & photo transfer tips
• Order tracking, shipping timeframes & 14-day returns`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedFollowUps: [
          'Recommend a CCD camera',
          'How does condition grading work?',
          'Where is my order?',
          'What memory card size should I use?',
        ],
        action: { type: 'browse', label: 'Explore Vintage Cameras' },
      },
    ]);
    setFeedbackMap({});
  };

  const handleActionPress = (action: AiAction) => {
    switch (action.type) {
      case 'orders':
        router.push('/order');
        break;
      case 'browse':
        router.push('/(tabs)/browse');
        break;
      case 'faq':
        setActiveTab('faq');
        break;
      case 'contact':
        setActiveTab('contact');
        break;
      case 'compare':
        router.push('/compare');
        break;
    }
  };

  const handleFeedback = (messageId: string, rating: 'up' | 'down') => {
    setFeedbackMap((prev) => ({
      ...prev,
      [messageId]: rating,
    }));
  };

  useEffect(() => {
    if (params.query) {
      handleSendMessage(params.query);
    }
  }, [params.query]);

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

  const safeTop = getSafeTopInset(insets);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { paddingTop: safeTop }]}>
        <LinearGradient
          colors={['#4a0808', '#1a0202', 'transparent']}
          start={{ x: 0.3, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
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
            {/* Status Banner with Clear / Restart Chat Button */}
            <View style={styles.aiStatusBanner}>
              <View style={styles.aiStatusLeft}>
                <View style={styles.statusDotLive} />
                <Text style={styles.aiStatusText}>RePXL Concierge • Online & Ready</Text>
              </View>
              <TouchableOpacity
                style={styles.clearChatBtn}
                onPress={handleClearChat}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="rotate-ccw" size={12} color="#999" />
                <Text style={styles.clearChatText}>Restart Chat</Text>
              </TouchableOpacity>
            </View>

            {/* Prompt Categories & Quick Prompts Selector */}
            <View style={styles.promptSection}>
              {/* Category Pills */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.promptCatScroll}
              >
                {PROMPT_CATEGORIES.map((cat) => {
                  const isSelected = activePromptCat === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[styles.promptCatChip, isSelected && styles.promptCatChipActive]}
                      onPress={() => setActivePromptCat(cat.id)}
                      activeOpacity={0.7}
                    >
                      <Feather
                        name={cat.icon as any}
                        size={12}
                        color={isSelected ? '#fff' : '#888'}
                      />
                      <Text
                        style={[
                          styles.promptCatChipText,
                          isSelected && styles.promptCatChipTextActive,
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Category Prompts */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.promptScroll}
              >
                {currentPrompts.map((prompt, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.promptChip}
                    onPress={() => handleSendMessage(prompt)}
                    activeOpacity={0.7}
                  >
                    <Feather name="message-circle" size={11} color="#e53935" />
                    <Text style={styles.promptChipText}>{prompt}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Messages Scroll Area */}
            <ScrollView
              ref={chatScrollRef}
              contentContainerStyle={styles.chatScroll}
              keyboardShouldPersistTaps="handled"
            >
              {/* Welcome Hero Card for fresh chat */}
              {messages.length <= 1 && (
                <View style={styles.welcomeHeroCard}>
                  <LinearGradient
                    colors={['#240909', '#151518']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.welcomeGradient}
                  >
                    <View style={styles.welcomeHeader}>
                      <View style={styles.welcomeIconCircle}>
                        <Feather name="camera" size={20} color="#ff5252" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.welcomeTitle}>Vintage Digicam Specialist</Text>
                        <Text style={styles.welcomeSub}>
                          Trained on 2000s CCD color science, battery care, condition grading & RePXL orders.
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.starterGridTitle}>SUGGESTED STARTING TOPICS</Text>
                    <View style={styles.starterGrid}>
                      <TouchableOpacity
                        style={styles.starterCard}
                        onPress={() => handleSendMessage('Recommend a CCD camera')}
                        activeOpacity={0.8}
                      >
                        <Feather name="aperture" size={15} color="#e53935" />
                        <Text style={styles.starterCardTitle}>CCD Camera Guide</Text>
                        <Text style={styles.starterCardSub}>Y2K flash & film tones</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.starterCard}
                        onPress={() => handleSendMessage('How does condition grading work?')}
                        activeOpacity={0.8}
                      >
                        <Feather name="award" size={15} color="#e53935" />
                        <Text style={styles.starterCardTitle}>Condition Grading</Text>
                        <Text style={styles.starterCardSub}>Mint, Excellent, Good, Fair</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.starterCard}
                        onPress={() => handleSendMessage('What memory card size should I use?')}
                        activeOpacity={0.8}
                      >
                        <Feather name="hard-drive" size={15} color="#e53935" />
                        <Text style={styles.starterCardTitle}>Batteries & Cards</Text>
                        <Text style={styles.starterCardSub}>SD sizes & photo transfer</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.starterCard}
                        onPress={() => handleSendMessage('Where is my order?')}
                        activeOpacity={0.8}
                      >
                        <Feather name="truck" size={15} color="#e53935" />
                        <Text style={styles.starterCardTitle}>Track & Delivery</Text>
                        <Text style={styles.starterCardSub}>Shipping times & returns</Text>
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>
                </View>
              )}

              {/* Message List */}
              {messages.map((msg) => {
                if (msg.sender === 'user') {
                  return (
                    <View key={msg.id} style={styles.userBubble}>
                      <Text style={styles.userMessageText}>{msg.text}</Text>
                      <View style={styles.userMetaRow}>
                        <Text style={styles.userMessageTime}>{msg.timestamp}</Text>
                        <Feather name="check" size={11} color="rgba(255, 255, 255, 0.7)" />
                      </View>
                    </View>
                  );
                }

                // Assistant Bubble
                return (
                  <View key={msg.id} style={styles.assistantBubbleWrapper}>
                    <View style={styles.assistantBubble}>
                      {/* Assistant Header Row */}
                      <View style={styles.assistantHeaderRow}>
                        <View style={styles.avatarMini}>
                          <Feather name="cpu" size={13} color="#fff" />
                        </View>
                        <Text style={styles.assistantNameText}>RePXL Concierge</Text>
                        <View style={styles.aiTag}>
                          <Text style={styles.aiTagText}>AI EXPERT</Text>
                        </View>
                        <Text style={styles.messageTime}>{msg.timestamp}</Text>
                      </View>

                      {/* Rich Content */}
                      <FormattedAiMessage text={msg.text} />

                      {/* Action Button */}
                      {msg.action && (
                        <TouchableOpacity
                          style={styles.actionBtn}
                          onPress={() => handleActionPress(msg.action!)}
                          activeOpacity={0.85}
                        >
                          <Feather
                            name={
                              msg.action.type === 'orders'
                                ? 'package'
                                : msg.action.type === 'browse'
                                ? 'camera'
                                : msg.action.type === 'faq'
                                ? 'help-circle'
                                : msg.action.type === 'contact'
                                ? 'mail'
                                : 'sliders'
                            }
                            size={14}
                            color="#ffcdd2"
                          />
                          <Text style={styles.actionBtnText}>{msg.action.label}</Text>
                          <Feather name="arrow-right" size={13} color="#ffcdd2" />
                        </TouchableOpacity>
                      )}

                      {/* Feedback Row */}
                      <View style={styles.feedbackRow}>
                        <Text style={styles.feedbackLabel}>Helpful?</Text>
                        <TouchableOpacity
                          style={[
                            styles.feedbackBtn,
                            feedbackMap[msg.id] === 'up' && styles.feedbackBtnActive,
                          ]}
                          onPress={() => handleFeedback(msg.id, 'up')}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Feather
                            name="thumbs-up"
                            size={11}
                            color={feedbackMap[msg.id] === 'up' ? '#4caf50' : '#777'}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.feedbackBtn,
                            feedbackMap[msg.id] === 'down' && styles.feedbackBtnActive,
                          ]}
                          onPress={() => handleFeedback(msg.id, 'down')}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Feather
                            name="thumbs-down"
                            size={11}
                            color={feedbackMap[msg.id] === 'down' ? '#f44336' : '#777'}
                          />
                        </TouchableOpacity>
                        {feedbackMap[msg.id] && (
                          <Text style={styles.feedbackAck}>
                            {feedbackMap[msg.id] === 'up' ? 'Glad to help!' : 'Thanks for feedback'}
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Follow-up Suggestion Chips directly under Assistant Bubble */}
                    {msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                      <View style={styles.followUpsWrap}>
                        <Text style={styles.followUpTitle}>SUGGESTED FOLLOW-UPS</Text>
                        <View style={styles.followUpChipsRow}>
                          {msg.suggestedFollowUps.map((chip, idx) => (
                            <TouchableOpacity
                              key={idx}
                              style={styles.followUpChip}
                              onPress={() => handleSendMessage(chip)}
                              activeOpacity={0.75}
                            >
                              <Feather name="corner-down-right" size={11} color="#e53935" />
                              <Text style={styles.followUpChipText}>{chip}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}

              {/* Typing State */}
              {isTyping && (
                <View style={styles.assistantBubbleWrapper}>
                  <View style={[styles.assistantBubble, styles.typingBubble]}>
                    <View style={styles.assistantHeaderRow}>
                      <View style={styles.avatarMini}>
                        <Feather name="cpu" size={13} color="#fff" />
                      </View>
                      <Text style={styles.assistantNameText}>RePXL Concierge</Text>
                      <View style={styles.aiTag}>
                        <Text style={styles.aiTagText}>AI EXPERT</Text>
                      </View>
                    </View>
                    <View style={styles.typingIndicatorRow}>
                      <ActivityIndicator size="small" color="#c62828" />
                      <Text style={styles.typingText}>Searching vintage digicam archives...</Text>
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Input Bar */}
            <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
              <View style={styles.inputContainer}>
                <Feather name="search" size={15} color="#777" style={{ marginLeft: 12 }} />
                <TextInput
                  value={chatInput}
                  onChangeText={setChatInput}
                  placeholder="Ask about cameras, shipping, grading..."
                  placeholderTextColor="#666"
                  style={styles.chatTextInput}
                  onSubmitEditing={() => handleSendMessage()}
                  returnKeyType="send"
                />
                {!!chatInput && (
                  <TouchableOpacity
                    onPress={() => setChatInput('')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{ marginRight: 10 }}
                  >
                    <Feather name="x-circle" size={15} color="#888" />
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                style={[styles.sendBtn, !chatInput.trim() && { opacity: 0.4 }]}
                onPress={() => handleSendMessage()}
                disabled={!chatInput.trim()}
                activeOpacity={0.8}
              >
                <Feather name="arrow-up" size={18} color="#fff" />
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
              style={styles.categoryViewport}
              contentContainerStyle={styles.categoryScroll}
              keyboardShouldPersistTaps="handled"
            >
              {FAQ_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catChip, faqCategory === cat && styles.catChipActive]}
                  onPress={() => setFaqCategory(cat)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityState={{ selected: faqCategory === cat }}
                >
                  <Text style={[styles.catChipText, faqCategory === cat && styles.catChipTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* FAQ Items */}
            <ScrollView
              style={styles.faqViewport}
              contentContainerStyle={[styles.faqList, { paddingBottom: insets.bottom + 24 }]}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
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

  // AI Status Banner
  aiStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1c1c1f',
  },
  aiStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDotLive: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#4caf50',
  },
  aiStatusText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#aaa',
  },
  clearChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#1a1a1d',
  },
  clearChatText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#888',
  },

  // Prompt Selector Section
  promptSection: {
    backgroundColor: '#121214',
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e22',
    paddingBottom: 6,
  },
  promptCatScroll: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
    gap: 6,
  },
  promptCatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1a1a1d',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#26262a',
  },
  promptCatChipActive: {
    backgroundColor: '#991b1b',
    borderColor: '#b91c1c',
  },
  promptCatChipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#888',
  },
  promptCatChipTextActive: {
    color: '#fff',
  },
  promptScroll: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 8,
  },
  promptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1a1a1d',
    borderWidth: 1,
    borderColor: '#2c2c30',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  promptChipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11.5,
    color: '#ddd',
  },

  // Chat Scroll Area
  chatScroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 16,
  },

  // Welcome Hero Card
  welcomeHeroCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#381616',
    marginBottom: 4,
  },
  welcomeGradient: {
    padding: 16,
  },
  welcomeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  welcomeIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(198, 40, 40, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(198, 40, 40, 0.4)',
  },
  welcomeTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: '#fff',
  },
  welcomeSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    color: '#aaa',
    lineHeight: 16,
    marginTop: 2,
  },
  starterGridTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: '#e53935',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  starterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  starterCard: {
    width: '48.5%',
    backgroundColor: '#1c1c20',
    borderWidth: 1,
    borderColor: '#2b2b30',
    borderRadius: 10,
    padding: 10,
    gap: 3,
  },
  starterCardTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#eee',
    marginTop: 2,
  },
  starterCardSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: '#777',
  },

  // Message Bubbles
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#8b1111',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 3,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '82%',
    borderWidth: 1,
    borderColor: '#a31515',
  },
  userMessageText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: '#fff',
  },
  userMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 4,
  },
  userMessageTime: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
  },

  assistantBubbleWrapper: {
    alignSelf: 'flex-start',
    maxWidth: '92%',
    gap: 6,
  },
  assistantBubble: {
    backgroundColor: '#151518',
    borderWidth: 1,
    borderColor: '#26262a',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    padding: 14,
    gap: 8,
  },
  typingBubble: {
    paddingVertical: 12,
  },
  assistantHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  avatarMini: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#c62828',
    alignItems: 'center',
    justifyContent: 'center',
  },
  assistantNameText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: '#f0f0f0',
  },
  aiTag: {
    backgroundColor: 'rgba(198, 40, 40, 0.2)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(198, 40, 40, 0.4)',
  },
  aiTagText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 8.5,
    color: '#ff8a80',
    letterSpacing: 0.5,
  },
  messageTime: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: '#777',
    marginLeft: 'auto',
  },

  // Formatted Assistant Message Styles
  formattedContainer: {
    gap: 3,
  },
  assistantMessageText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13.5,
    lineHeight: 20,
    color: '#d4d4d8',
  },
  boldText: {
    fontFamily: 'Inter_700Bold',
    color: '#ffffff',
  },
  codeText: {
    fontFamily: 'Inter_600SemiBold',
    color: '#ff8a80',
    backgroundColor: '#261717',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    fontSize: 12,
  },
  calloutBox: {
    backgroundColor: 'rgba(198, 40, 40, 0.1)',
    borderColor: 'rgba(198, 40, 40, 0.3)',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginVertical: 4,
  },
  calloutText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    lineHeight: 18,
    color: '#ffcdd2',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginVertical: 2,
    paddingLeft: 2,
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#c62828',
    marginTop: 7,
  },
  bulletText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 19,
    color: '#d4d4d8',
  },
  numberedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginVertical: 3,
  },
  numberedBadge: {
    width: 17,
    height: 17,
    borderRadius: 8.5,
    backgroundColor: '#222226',
    borderWidth: 1,
    borderColor: '#383840',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  numberedBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9.5,
    color: '#ff8a80',
  },
  numberedText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 19,
    color: '#e4e4e7',
  },

  // Action Button inside Assistant Bubble
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#241212',
    borderWidth: 1,
    borderColor: '#4d1919',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 14,
    marginTop: 4,
  },
  actionBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#ffcdd2',
  },

  // Feedback Row
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#202024',
  },
  feedbackLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10.5,
    color: '#666',
  },
  feedbackBtn: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: '#1b1b1e',
  },
  feedbackBtnActive: {
    backgroundColor: '#2b2b30',
  },
  feedbackAck: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: '#9e9e9e',
    marginLeft: 4,
  },

  // Follow-up Suggestions
  followUpsWrap: {
    paddingLeft: 4,
    gap: 6,
    marginTop: 2,
  },
  followUpTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9.5,
    color: '#888',
    letterSpacing: 0.6,
  },
  followUpChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  followUpChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#19191d',
    borderWidth: 1,
    borderColor: '#2b2b30',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  followUpChipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#ccc',
  },

  // Typing Indicator
  typingIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  typingText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#888',
  },

  // Input Bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#141416',
    borderTopWidth: 1,
    borderTopColor: '#202024',
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e22',
    borderWidth: 1,
    borderColor: '#2c2c30',
    borderRadius: 22,
  },
  chatTextInput: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 9,
    color: '#fff',
    fontSize: 13.5,
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
  // Keep this horizontal scroller from sharing the FAQ list's remaining height.
  categoryViewport: { flexGrow: 0, flexShrink: 0 },
  categoryScroll: { paddingHorizontal: 16, paddingVertical: 12, gap: 8, alignItems: 'center' },
  catChip: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1c',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#262628',
  },
  catChipActive: { backgroundColor: '#c62828', borderColor: '#c62828' },
  catChipText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: '#aaa' },
  catChipTextActive: { color: '#fff' },
  faqViewport: { flex: 1 },
  faqList: { paddingHorizontal: 16, gap: 10 },
  faqCard: {
    backgroundColor: '#161618',
    borderWidth: 1,
    borderColor: '#242426',
    borderRadius: 12,
    padding: 14,
    elevation: 2,
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
    elevation: 2,
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
