import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, TextInput,
  ScrollView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { C } from '../../constants/theme';
import { getCompetitions, saveCompetition, deleteCompetition } from '../../lib/storage';
import type { Competition } from '../../lib/types';

function daysUntil(dateStr: string) {
  const d = new Date(dateStr); d.setHours(0,0,0,0);
  const n = new Date(); n.setHours(0,0,0,0);
  return Math.ceil((d.getTime() - n.getTime()) / 86400000);
}

function CompCard({ comp, onPress, onDelete }: { comp: Competition; onPress: ()=>void; onDelete: ()=>void }) {
  const days = daysUntil(comp.date);
  const past = days < 0;
  return (
    <TouchableOpacity style={[cc.card, past && cc.cardPast]} onPress={onPress} activeOpacity={0.8}>
      <View style={cc.top}>
        {past ? (
          <Text style={cc.pastBadge}>COMPLETADA</Text>
        ) : days === 0 ? (
          <Text style={cc.todayBadge}>HOY</Text>
        ) : (
          <View style={cc.countdown}>
            <Text style={cc.countNum}>{days}</Text>
            <Text style={cc.countLabel}>días</Text>
          </View>
        )}
        <TouchableOpacity onPress={onDelete} hitSlop={{top:8,bottom:8,left:8,right:8}}>
          <Ionicons name="trash-outline" size={15} color={C.textDim} />
        </TouchableOpacity>
      </View>
      <Text style={cc.name}>{comp.name}</Text>
      <View style={cc.meta}>
        <Text style={cc.date}>
          {new Date(comp.date).toLocaleDateString('es-ES',{weekday:'short',day:'numeric',month:'long',year:'numeric'})}
        </Text>
        {comp.location && <Text style={cc.loc}>📍 {comp.location}</Text>}
        {comp.category && <Text style={cc.cat}>{comp.category}</Text>}
      </View>
      {comp.result && <Text style={cc.result}>Resultado: {comp.result}</Text>}
      <View style={cc.pills}>
        {comp.strategy && <View style={cc.pill}><Ionicons name="map-outline" size={10} color={C.blue}/><Text style={cc.pillTxt}>Estrategia</Text></View>}
        {comp.mentalNotes && <View style={cc.pill}><Ionicons name="brain" size={10} color={C.purple}/><Text style={[cc.pillTxt,{color:C.purple}]}>Mental</Text></View>}
      </View>
    </TouchableOpacity>
  );
}
const cc = StyleSheet.create({
  card:       { backgroundColor:C.bgCard, borderRadius:14, borderWidth:1, borderColor:'rgba(200,245,0,0.2)', padding:14, marginBottom:10, ...C.shadow },
  cardPast:   { borderColor:C.border, opacity:0.65 },
  top:        { flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 },
  countdown:  { alignItems:'center' },
  countNum:   { fontSize:32, fontWeight:'900', color:C.lime, lineHeight:34 },
  countLabel: { fontSize:10, fontWeight:'800', color:C.textSec },
  todayBadge: { fontSize:12, fontWeight:'900', color:'#071220', backgroundColor:C.lime, borderRadius:6, paddingHorizontal:10, paddingVertical:3 },
  pastBadge:  { fontSize:10, fontWeight:'800', color:C.textDim, letterSpacing:1 },
  name:       { fontSize:19, fontWeight:'900', color:C.text, marginBottom:6 },
  meta:       { gap:3, marginBottom:6 },
  date:       { fontSize:12, color:C.textSec, fontWeight:'600', textTransform:'capitalize' },
  loc:        { fontSize:12, color:C.textSec },
  cat:        { fontSize:11, color:C.blue, fontWeight:'700' },
  result:     { fontSize:13, color:C.green, fontWeight:'700', marginBottom:6 },
  pills:      { flexDirection:'row', gap:6 },
  pill:       { flexDirection:'row', alignItems:'center', gap:4, backgroundColor:C.blueDim, borderWidth:1, borderColor:'rgba(56,189,248,0.2)', borderRadius:20, paddingHorizontal:8, paddingVertical:3 },
  pillTxt:    { fontSize:10, fontWeight:'700', color:C.blue },
});

const BLANK: Omit<Competition,'id'> = {
  name:'', date: new Date().toISOString().slice(0,10), location:'', category:'', strategy:'', mentalNotes:'', completed:false, result:'',
};

function DetailModal({ comp, onClose, onSave, onAskCoach }: {
  comp: Competition; onClose: ()=>void; onSave: (c:Competition)=>void; onAskCoach: (c:Competition)=>void;
}) {
  const [form, setForm] = useState(comp);
  const days = daysUntil(comp.date);

  return (
    <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
      <SafeAreaView style={dm.safe} edges={['top','bottom']}>
        <View style={dm.header}>
          <View style={{flex:1}}>
            <Text style={dm.title} numberOfLines={1}>{comp.name}</Text>
            {days >= 0
              ? <Text style={dm.sub}>{days === 0 ? '¡Es hoy!' : `Faltan ${days} días`}</Text>
              : <Text style={dm.sub}>Competencia pasada</Text>}
          </View>
          <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={C.textSec}/></TouchableOpacity>
        </View>
        <ScrollView style={dm.scroll} contentContainerStyle={dm.content}>

          {/* Ask Coach CTA */}
          <TouchableOpacity style={dm.coachBtn} onPress={() => { onClose(); onAskCoach(comp); }}>
            <Ionicons name="chatbubble-ellipses" size={16} color="#071220"/>
            <Text style={dm.coachBtnTxt}>Pedir prep mental al Coach</Text>
          </TouchableOpacity>

          <Text style={dm.label}>Estrategia de competencia</Text>
          <TextInput style={[dm.input,dm.textarea]} value={form.strategy}
            onChangeText={v=>setForm(f=>({...f,strategy:v}))} multiline
            placeholder="Calentamiento, ritmo de heats, movimientos clave..." placeholderTextColor={C.textDim}/>

          <Text style={dm.label}>Notas de preparación mental</Text>
          <TextInput style={[dm.input,dm.textarea]} value={form.mentalNotes}
            onChangeText={v=>setForm(f=>({...f,mentalNotes:v}))} multiline
            placeholder="Rutina pre-competencia, mantras, mindset..." placeholderTextColor={C.textDim}/>

          {days < 0 && (
            <>
              <Text style={dm.label}>Resultado obtenido</Text>
              <TextInput style={dm.input} value={form.result}
                onChangeText={v=>setForm(f=>({...f,result:v}))}
                placeholder="Posición, tiempo, puntos..." placeholderTextColor={C.textDim}/>
            </>
          )}

          {/* Mental checklist */}
          <Text style={dm.sectionHd}>Checklist día de competencia</Text>
          {[
            '✓ Descanso de 8h la noche anterior',
            '✓ Calentamiento específico listo',
            '✓ Alimentación e hidratación planificadas',
            '✓ Equipo preparado (zapatos, ropa, cinta...)',
            '✓ Rutina de visualización completada',
            '✓ Box breathing practicado',
            '✓ Self-talk positivo activado',
          ].map((item) => (
            <View key={item} style={dm.checkRow}>
              <Ionicons name="checkmark-circle-outline" size={16} color={C.textDim}/>
              <Text style={dm.checkTxt}>{item}</Text>
            </View>
          ))}

        </ScrollView>
        <View style={dm.footer}>
          <TouchableOpacity style={dm.saveBtn} onPress={() => onSave(form)}>
            <Text style={dm.saveTxt}>Guardar Cambios</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
const dm = StyleSheet.create({
  safe:       { flex:1, backgroundColor:C.bg },
  header:     { flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:16, borderBottomWidth:1, borderColor:C.border },
  title:      { fontSize:18, fontWeight:'900', color:C.text },
  sub:        { fontSize:12, color:C.lime, fontWeight:'700', marginTop:3 },
  scroll:     { flex:1 },
  content:    { padding:16 },
  coachBtn:   { flexDirection:'row', alignItems:'center', gap:8, backgroundColor:C.lime, borderRadius:12, padding:14, marginBottom:20, justifyContent:'center' },
  coachBtnTxt:{ fontSize:14, fontWeight:'900', color:'#071220' },
  label:      { fontSize:11, fontWeight:'800', color:C.textDim, textTransform:'uppercase', letterSpacing:1.5, marginBottom:8, marginTop:4 },
  input:      { backgroundColor:C.bgCard, borderWidth:1, borderColor:C.border, borderRadius:10, color:C.text, fontSize:14, paddingHorizontal:14, paddingVertical:12, marginBottom:14 },
  textarea:   { minHeight:100, textAlignVertical:'top' },
  sectionHd:  { fontSize:11, fontWeight:'800', color:C.textDim, textTransform:'uppercase', letterSpacing:1.5, marginTop:8, marginBottom:12 },
  checkRow:   { flexDirection:'row', alignItems:'center', gap:8, paddingVertical:6 },
  checkTxt:   { fontSize:13, color:C.textSec, flex:1 },
  footer:     { padding:16, borderTopWidth:1, borderColor:C.border },
  saveBtn:    { backgroundColor:C.lime, borderRadius:12, padding:16, alignItems:'center' },
  saveTxt:    { fontSize:15, fontWeight:'900', color:'#071220' },
});

export default function CompeteScreen() {
  const router = useRouter();
  const [comps, setComps] = useState<Competition[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<Competition|null>(null);
  const [form, setForm] = useState<Omit<Competition,'id'>>(BLANK);

  const load = useCallback(async () => {
    const list = await getCompetitions();
    list.sort((a,b) => {
      const da = daysUntil(a.date), db = daysUntil(b.date);
      if (da >= 0 && db >= 0) return da - db;
      if (da >= 0) return -1; if (db >= 0) return 1;
      return db - da;
    });
    setComps(list);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const confirmDelete = (id: string) => {
    Alert.alert('Eliminar competencia', '¿Seguro?', [
      { text:'Cancelar', style:'cancel' },
      { text:'Eliminar', style:'destructive', onPress: async () => { await deleteCompetition(id); load(); }},
    ]);
  };

  const addComp = async () => {
    if (!form.name.trim()) return;
    await saveCompetition({ ...form, id: Date.now().toString() });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowAdd(false); setForm(BLANK); load();
  };

  const updateComp = async (c: Competition) => {
    await saveCompetition(c);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSelected(null); load();
  };

  const askCoachAboutComp = (c: Competition) => {
    const days = daysUntil(c.date);
    const prompt = days === 0
      ? `¡Hoy es mi competencia "${c.name}"! Dame tu rutina completa de preparación mental para hoy.`
      : `En ${days} días tengo la competencia "${c.name}"${c.location ? ` en ${c.location}` : ''}. Ayúdame a prepararme mentalmente y dame una estrategia para rendir al máximo.`;
    router.push({ pathname: '/(tabs)/chat', params: { prompt } } as any);
  };

  const upcoming = comps.filter(c => daysUntil(c.date) >= 0);
  const past = comps.filter(c => daysUntil(c.date) < 0);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>🏆 Competencias</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowAdd(true)}>
          <Ionicons name="add" size={20} color="#071220" />
          <Text style={s.addTxt}>Agregar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        {upcoming.length > 0 && (
          <>
            <Text style={s.sectionHd}>PRÓXIMAS</Text>
            {upcoming.map(c => (
              <CompCard key={c.id} comp={c} onPress={() => setSelected(c)} onDelete={() => confirmDelete(c.id)} />
            ))}
          </>
        )}
        {past.length > 0 && (
          <>
            <Text style={[s.sectionHd,{marginTop:16}]}>HISTORIAL</Text>
            {past.map(c => (
              <CompCard key={c.id} comp={c} onPress={() => setSelected(c)} onDelete={() => confirmDelete(c.id)} />
            ))}
          </>
        )}
        {comps.length === 0 && (
          <View style={s.empty}>
            <Ionicons name="trophy-outline" size={40} color={C.textDim}/>
            <Text style={s.emptyTxt}>Agrega tu primera competencia</Text>
            <Text style={s.emptySub}>Tu coach te ayudará a prepararte</Text>
          </View>
        )}
      </ScrollView>

      {/* Add modal */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>setShowAdd(false)}>
        <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
          <SafeAreaView style={dm.safe} edges={['top','bottom']}>
            <View style={dm.header}>
              <Text style={dm.title}>Nueva Competencia</Text>
              <TouchableOpacity onPress={()=>setShowAdd(false)}><Ionicons name="close" size={24} color={C.textSec}/></TouchableOpacity>
            </View>
            <ScrollView style={dm.scroll} contentContainerStyle={dm.content}>
              <Text style={dm.label}>Nombre *</Text>
              <TextInput style={dm.input} value={form.name} onChangeText={v=>setForm(f=>({...f,name:v}))} placeholder="CrossFit Regionals, Open 25.1..." placeholderTextColor={C.textDim}/>
              <Text style={dm.label}>Fecha *</Text>
              <TextInput style={dm.input} value={form.date} onChangeText={v=>setForm(f=>({...f,date:v}))} placeholder="YYYY-MM-DD" placeholderTextColor={C.textDim}/>
              <Text style={dm.label}>Lugar</Text>
              <TextInput style={dm.input} value={form.location} onChangeText={v=>setForm(f=>({...f,location:v}))} placeholder="Ciudad, Box..." placeholderTextColor={C.textDim}/>
              <Text style={dm.label}>Categoría</Text>
              <TextInput style={dm.input} value={form.category} onChangeText={v=>setForm(f=>({...f,category:v}))} placeholder="RX, Scaled, Masters 35+..." placeholderTextColor={C.textDim}/>
            </ScrollView>
            <View style={dm.footer}>
              <TouchableOpacity style={[dm.saveBtn, !form.name.trim() && {opacity:0.4}]} onPress={addComp} disabled={!form.name.trim()}>
                <Text style={dm.saveTxt}>Agregar Competencia</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Detail modal */}
      {selected && (
        <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>setSelected(null)}>
          <DetailModal comp={selected} onClose={()=>setSelected(null)} onSave={updateComp} onAskCoach={askCoachAboutComp}/>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:       { flex:1, backgroundColor:C.bg },
  header:     { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:16, paddingVertical:14 },
  title:      { fontSize:20, fontWeight:'900', color:C.text },
  addBtn:     { flexDirection:'row', alignItems:'center', gap:5, backgroundColor:C.lime, borderRadius:10, paddingHorizontal:14, paddingVertical:8 },
  addTxt:     { fontSize:13, fontWeight:'800', color:'#071220' },
  scroll:     { flex:1 },
  content:    { paddingHorizontal:16, paddingBottom:24 },
  sectionHd:  { fontSize:10, fontWeight:'800', color:C.textDim, letterSpacing:2, textTransform:'uppercase', marginBottom:10 },
  empty:      { alignItems:'center', paddingTop:60, gap:10 },
  emptyTxt:   { fontSize:16, fontWeight:'800', color:C.textDim },
  emptySub:   { fontSize:13, color:C.textDim },
});
