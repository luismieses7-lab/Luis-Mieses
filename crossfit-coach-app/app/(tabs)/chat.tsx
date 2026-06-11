import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { C } from '../../constants/theme';
import { sendMessage } from '../../lib/claude';
import { getChatHistory, saveChatHistory, clearChatHistory, getApiKey } from '../../lib/storage';
import type { ChatMessage } from '../../lib/types';

const QUICK_PROMPTS = [
  '¿Cómo mejoro mi Fran?',
  'Prepárame mentalmente para la competencia',
  'Analiza mi semana de entreno',
  '¿Qué debilidades me ves?',
  'Box breathing antes del WOD',
  'Dame motivación ahora mismo',
];

function TypingIndicator() {
  const [dot, setDot] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setDot(d => (d+1)%4), 400);
    return () => clearInterval(t);
  }, []);
  return (
    <View style={[ti.bubble]}>
      <Text style={ti.txt}>{'●'.repeat(dot+1)}</Text>
    </View>
  );
}
const ti = StyleSheet.create({
  bubble: { alignSelf:'flex-start', backgroundColor:C.bgCard, borderRadius:16, borderBottomLeftRadius:4, paddingHorizontal:14, paddingVertical:10, maxWidth:'60%', borderWidth:1, borderColor:C.border, marginBottom:8 },
  txt: { color:C.textSec, fontSize:18, letterSpacing:4 },
});

function Bubble({ msg }: { msg: ChatMessage }) {
  const isMe = msg.role === 'user';
  return (
    <View style={[b.row, isMe && b.rowMe]}>
      {!isMe && (
        <View style={b.avatar}>
          <Text style={b.avatarTxt}>CF</Text>
        </View>
      )}
      <View style={[b.bubble, isMe ? b.bubbleMe : b.bubbleCoach]}>
        <Text style={[b.txt, isMe && b.txtMe]}>{msg.content}</Text>
        <Text style={[b.time, isMe && b.timeMe]}>
          {new Date(msg.timestamp).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}
        </Text>
      </View>
    </View>
  );
}
const b = StyleSheet.create({
  row:        { flexDirection:'row', alignItems:'flex-end', marginBottom:8, gap:8, paddingHorizontal:16 },
  rowMe:      { flexDirection:'row-reverse' },
  avatar:     { width:28, height:28, borderRadius:8, backgroundColor:C.lime, alignItems:'center', justifyContent:'center', flexShrink:0 },
  avatarTxt:  { fontSize:9, fontWeight:'900', color:'#071220' },
  bubble:     { maxWidth:'76%', borderRadius:16, padding:12 },
  bubbleCoach:{ backgroundColor:C.bgCard, borderBottomLeftRadius:4, borderWidth:1, borderColor:C.border },
  bubbleMe:   { backgroundColor:C.lime, borderBottomRightRadius:4 },
  txt:        { fontSize:14.5, lineHeight:21, color:C.text },
  txtMe:      { color:'#071220', fontWeight:'600' },
  time:       { fontSize:10, color:C.textDim, marginTop:5, alignSelf:'flex-end' },
  timeMe:     { color:'rgba(7,18,32,0.45)' },
});

export default function ChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ prompt?: string }>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasKey, setHasKey] = useState(true);
  const listRef = useRef<FlatList>(null);

  useFocusEffect(useCallback(() => {
    (async () => {
      const [hist, key] = await Promise.all([getChatHistory(), getApiKey()]);
      setMessages(hist);
      setHasKey(!!key);
      if (params.prompt && hist.length === 0) {
        setInput(params.prompt);
      }
    })();
  }, []));

  const send = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInput('');

    const userMsg: ChatMessage = { id: Date.now().toString(), role:'user', content, timestamp: Date.now() };
    const next = [...messages, userMsg];
    setMessages(next);
    setLoading(true);

    try {
      const reply = await sendMessage(next);
      const aiMsg: ChatMessage = { id: (Date.now()+1).toString(), role:'assistant', content: reply, timestamp: Date.now() };
      const final = [...next, aiMsg];
      setMessages(final);
      await saveChatHistory(final);
    } catch (err: any) {
      const msg = err.message === 'API_KEY_MISSING' || err.message === 'API_KEY_INVALID'
        ? '🔑 API Key no configurada o inválida. Ve a Ajustes para configurarla.'
        : `⚠ Error al conectar: ${err.message}`;
      const aiMsg: ChatMessage = { id:(Date.now()+1).toString(), role:'assistant', content: msg, timestamp: Date.now() };
      const final = [...next, aiMsg];
      setMessages(final);
      await saveChatHistory(final);
    } finally {
      setLoading(false);
    }
  }, [input, messages, loading]);

  const clearChat = () => {
    Alert.alert('Limpiar chat', '¿Borrar todo el historial del chat?', [
      { text: 'Cancelar', style:'cancel' },
      { text: 'Borrar', style:'destructive', onPress: async () => {
        await clearChatHistory(); setMessages([]);
      }},
    ]);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <View style={s.coachBadge}><Text style={s.coachBadgeTxt}>CF</Text></View>
          <View>
            <Text style={s.headerTitle}>Coach Randy</Text>
            <View style={s.onlineRow}>
              <View style={s.onlineDot} />
              <Text style={s.onlineTxt}>CrossFit L1 · Performance</Text>
            </View>
          </View>
        </View>
        <View style={s.headerActions}>
          <TouchableOpacity style={s.iconBtn} onPress={clearChat}>
            <Ionicons name="trash-outline" size={18} color={C.textSec} />
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn} onPress={() => router.push('/settings')}>
            <Ionicons name="settings-outline" size={18} color={C.textSec} />
          </TouchableOpacity>
        </View>
      </View>

      {/* No API key banner */}
      {!hasKey && (
        <TouchableOpacity style={s.keyBanner} onPress={() => router.push('/settings')}>
          <Ionicons name="key-outline" size={14} color={C.lime} />
          <Text style={s.keyBannerTxt}>Configura tu API Key en Ajustes para activar el coach →</Text>
        </TouchableOpacity>
      )}

      {/* Quick prompts - show only when chat is empty */}
      {messages.length === 0 && (
        <View style={s.welcome}>
          <Text style={s.welcomeTitle}>¿En qué te ayudo hoy?</Text>
          <View style={s.promptsWrap}>
            {QUICK_PROMPTS.map(p => (
              <TouchableOpacity key={p} style={s.promptChip} onPress={() => send(p)}>
                <Text style={s.promptTxt}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={m => m.id}
        renderItem={({ item }) => <Bubble msg={item} />}
        inverted={false}
        style={s.list}
        contentContainerStyle={s.listContent}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListFooterComponent={loading ? (
          <View style={{ paddingHorizontal: 16, paddingBottom: 4 }}>
            <TypingIndicator />
          </View>
        ) : null}
      />

      {/* Quick prompts strip (when chat has messages) */}
      {messages.length > 0 && (
        <View style={s.promptStrip}>
          {QUICK_PROMPTS.slice(0,4).map(p => (
            <TouchableOpacity key={p} style={s.stripChip} onPress={() => send(p)}>
              <Text style={s.stripTxt}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Input */}
      <KeyboardAvoidingView behavior={Platform.OS==='ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        <View style={s.inputRow}>
          <TextInput
            style={s.input}
            placeholder="Pregunta a tu coach..."
            placeholderTextColor={C.textDim}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={800}
            onSubmitEditing={() => send()}
            returnKeyType="send"
            blurOnSubmit
          />
          <TouchableOpacity
            style={[s.sendBtn, (!input.trim() || loading) && s.sendBtnDisabled]}
            onPress={() => send()}
            disabled={!input.trim() || loading}
          >
            {loading
              ? <ActivityIndicator size="small" color="#071220" />
              : <Ionicons name="arrow-up" size={18} color="#071220" />
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:          { flex:1, backgroundColor:C.bg },
  header:        { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:16, paddingVertical:12, borderBottomWidth:1, borderColor:C.border },
  headerLeft:    { flexDirection:'row', alignItems:'center', gap:10 },
  coachBadge:    { width:36, height:36, borderRadius:10, backgroundColor:C.lime, alignItems:'center', justifyContent:'center' },
  coachBadgeTxt: { fontSize:11, fontWeight:'900', color:'#071220' },
  headerTitle:   { fontSize:16, fontWeight:'800', color:C.text },
  onlineRow:     { flexDirection:'row', alignItems:'center', gap:5, marginTop:2 },
  onlineDot:     { width:7, height:7, borderRadius:4, backgroundColor:C.green },
  onlineTxt:     { fontSize:11, color:C.textSec, fontWeight:'600' },
  headerActions: { flexDirection:'row', gap:8 },
  iconBtn:       { width:34, height:34, borderRadius:8, backgroundColor:C.bgCard, borderWidth:1, borderColor:C.border, alignItems:'center', justifyContent:'center' },
  keyBanner:     { flexDirection:'row', alignItems:'center', gap:8, backgroundColor:C.limeDim, borderBottomWidth:1, borderColor:C.borderLime, padding:10, paddingHorizontal:16 },
  keyBannerTxt:  { color:C.lime, fontSize:12, fontWeight:'600', flex:1 },
  welcome:       { flex:1, padding:20 },
  welcomeTitle:  { fontSize:18, fontWeight:'800', color:C.text, marginBottom:16, textAlign:'center' },
  promptsWrap:   { flexDirection:'row', flexWrap:'wrap', gap:8, justifyContent:'center' },
  promptChip:    { backgroundColor:C.bgCard, borderWidth:1, borderColor:C.border, borderRadius:20, paddingHorizontal:14, paddingVertical:9 },
  promptTxt:     { color:C.textSec, fontSize:13, fontWeight:'600' },
  list:          { flex:1 },
  listContent:   { paddingTop:12, paddingBottom:8 },
  promptStrip:   { flexDirection:'row', paddingHorizontal:12, paddingVertical:8, gap:6 },
  stripChip:     { backgroundColor:C.bgCard, borderWidth:1, borderColor:C.border, borderRadius:16, paddingHorizontal:11, paddingVertical:6 },
  stripTxt:      { color:C.textSec, fontSize:11, fontWeight:'600' },
  inputRow:      { flexDirection:'row', alignItems:'flex-end', gap:8, padding:12, borderTopWidth:1, borderColor:C.border, backgroundColor:C.bg },
  input:         { flex:1, backgroundColor:C.bgCard, borderWidth:1, borderColor:C.border, borderRadius:14, color:C.text, fontSize:15, paddingHorizontal:14, paddingVertical:11, maxHeight:120 },
  sendBtn:       { width:42, height:42, borderRadius:12, backgroundColor:C.lime, alignItems:'center', justifyContent:'center' },
  sendBtnDisabled:{ opacity:0.4 },
});
