import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, TextInput,
  ScrollView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { C, WORKOUT_TYPE_COLORS } from '../../constants/theme';
import { getWorkouts, saveWorkout, deleteWorkout } from '../../lib/storage';
import type { Workout, WorkoutType } from '../../lib/types';

const TYPES: WorkoutType[] = ['AMRAP','EMOM','FOR_TIME','STRENGTH','SKILL','CHIPPER','HERO','BENCHMARK'];
const TYPE_LABELS: Record<WorkoutType,string> = {
  AMRAP:'AMRAP', EMOM:'EMOM', FOR_TIME:'For Time', STRENGTH:'Strength',
  SKILL:'Skill', CHIPPER:'Chipper', HERO:'Hero WOD', BENCHMARK:'Benchmark',
};

function WorkoutCard({ workout, onDelete }: { workout: Workout; onDelete: () => void }) {
  const tc = WORKOUT_TYPE_COLORS[workout.type] ?? WORKOUT_TYPE_COLORS.AMRAP;
  return (
    <View style={wc.card}>
      <View style={wc.top}>
        <View style={[wc.badge, { backgroundColor: tc.bg, borderColor: tc.border }]}>
          <Text style={[wc.badgeTxt, { color: tc.text }]}>{TYPE_LABELS[workout.type]}</Text>
        </View>
        <View style={wc.topRight}>
          {workout.rxd && <Text style={wc.rx}>RX</Text>}
          <Text style={wc.date}>
            {new Date(workout.date).toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'2-digit'})}
          </Text>
          <TouchableOpacity onPress={onDelete} hitSlop={{top:8,bottom:8,left:8,right:8}}>
            <Ionicons name="trash-outline" size={15} color={C.textDim} />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={wc.name}>{workout.name || 'Sin nombre'}</Text>
      {workout.description ? <Text style={wc.desc} numberOfLines={2}>{workout.description}</Text> : null}
      {workout.result ? <Text style={wc.result}>✓ {workout.result}</Text> : null}
      {workout.rpe !== undefined && (
        <View style={wc.rpeRow}>
          {Array.from({length:10},(_,i)=>(
            <View key={i} style={[wc.rpeDot, i<(workout.rpe??0) && wc.rpeDotOn]} />
          ))}
          <Text style={wc.rpeLabel}>RPE {workout.rpe}/10</Text>
        </View>
      )}
      {workout.notes ? <Text style={wc.notes}>"{workout.notes}"</Text> : null}
    </View>
  );
}
const wc = StyleSheet.create({
  card:     { backgroundColor:C.bgCard, borderRadius:14, borderWidth:1, borderColor:C.border, padding:14, marginBottom:10, ...C.shadow },
  top:      { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:8 },
  badge:    { borderWidth:1, borderRadius:6, paddingHorizontal:8, paddingVertical:3 },
  badgeTxt: { fontSize:10, fontWeight:'800', letterSpacing:0.5 },
  topRight: { flexDirection:'row', alignItems:'center', gap:8 },
  rx:       { fontSize:10, fontWeight:'900', color:C.lime, backgroundColor:C.limeDim, borderWidth:1, borderColor:C.borderLime, borderRadius:4, paddingHorizontal:6, paddingVertical:2 },
  date:     { fontSize:11, color:C.textSec, fontWeight:'600' },
  name:     { fontSize:16, fontWeight:'800', color:C.text, marginBottom:4 },
  desc:     { fontSize:12, color:C.textSec, lineHeight:18, marginBottom:4 },
  result:   { fontSize:13, color:C.green, fontWeight:'700', marginBottom:4 },
  rpeRow:   { flexDirection:'row', alignItems:'center', gap:4, marginTop:6 },
  rpeDot:   { width:7, height:7, borderRadius:4, backgroundColor:C.bgInner },
  rpeDotOn: { backgroundColor:C.lime },
  rpeLabel: { fontSize:10, color:C.textSec, fontWeight:'600', marginLeft:4 },
  notes:    { fontSize:12, color:C.textDim, fontStyle:'italic', marginTop:6 },
});

const BLANK: Omit<Workout,'id'> = {
  date: new Date().toISOString().slice(0,10), type:'AMRAP', name:'', description:'', result:'', rpe:7, notes:'', rxd:false,
};

export default function LogScreen() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [filter, setFilter] = useState<WorkoutType|'ALL'>('ALL');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Omit<Workout,'id'>>(BLANK);

  const load = useCallback(async () => { setWorkouts(await getWorkouts()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = filter === 'ALL' ? workouts : workouts.filter(w => w.type === filter);

  const confirmDelete = (id: string) => {
    Alert.alert('Eliminar entreno', '¿Seguro?', [
      { text:'Cancelar', style:'cancel' },
      { text:'Eliminar', style:'destructive', onPress: async () => {
        await deleteWorkout(id); load();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }},
    ]);
  };

  const saveForm = async () => {
    if (!form.name.trim() && !form.description.trim()) return;
    await saveWorkout({ ...form, id: Date.now().toString() });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowModal(false);
    setForm(BLANK);
    load();
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>📋 Log de Entrenos</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowModal(true)}>
          <Ionicons name="add" size={20} color="#071220" />
          <Text style={s.addTxt}>Agregar</Text>
        </TouchableOpacity>
      </View>

      {/* Filter tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={s.filterContent}>
        {(['ALL',...TYPES] as Array<WorkoutType|'ALL'>).map(t => (
          <TouchableOpacity key={t} style={[s.filterTab, filter===t && s.filterTabOn]} onPress={() => setFilter(t)}>
            <Text style={[s.filterTxt, filter===t && s.filterTxtOn]}>{t==='ALL' ? 'Todos' : TYPE_LABELS[t as WorkoutType]}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={w => w.id}
        renderItem={({ item }) => <WorkoutCard workout={item} onDelete={() => confirmDelete(item.id)} />}
        contentContainerStyle={s.listContent}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="barbell-outline" size={36} color={C.textDim} />
            <Text style={s.emptyTxt}>Sin entrenamientos</Text>
          </View>
        }
      />

      {/* Add Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
          <SafeAreaView style={m.safe} edges={['top','bottom']}>
            <View style={m.header}>
              <Text style={m.title}>Nuevo Entrenamiento</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={C.textSec} />
              </TouchableOpacity>
            </View>
            <ScrollView style={m.scroll} contentContainerStyle={m.content}>

              {/* Type selector */}
              <Text style={m.label}>Tipo</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:16}}>
                <View style={{flexDirection:'row',gap:8}}>
                  {TYPES.map(t => {
                    const tc = WORKOUT_TYPE_COLORS[t];
                    const on = form.type===t;
                    return (
                      <TouchableOpacity key={t} onPress={() => setForm(f=>({...f,type:t}))}
                        style={[m.typeChip, on && { backgroundColor: tc.bg, borderColor: tc.border }]}>
                        <Text style={[m.typeChipTxt, on && { color: tc.text }]}>{TYPE_LABELS[t]}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              {/* Date */}
              <Text style={m.label}>Fecha</Text>
              <TextInput style={m.input} value={form.date} onChangeText={v=>setForm(f=>({...f,date:v}))}
                placeholder="YYYY-MM-DD" placeholderTextColor={C.textDim} />

              {/* Name */}
              <Text style={m.label}>Nombre del WOD</Text>
              <TextInput style={m.input} value={form.name} onChangeText={v=>setForm(f=>({...f,name:v}))}
                placeholder="Ej: Fran, Karen, WOD del día..." placeholderTextColor={C.textDim} />

              {/* Description */}
              <Text style={m.label}>Descripción</Text>
              <TextInput style={[m.input,m.textarea]} value={form.description}
                onChangeText={v=>setForm(f=>({...f,description:v}))} multiline
                placeholder="21-15-9 Thrusters / Pull-ups..." placeholderTextColor={C.textDim} />

              {/* Result */}
              <Text style={m.label}>Resultado</Text>
              <TextInput style={m.input} value={form.result} onChangeText={v=>setForm(f=>({...f,result:v}))}
                placeholder="Ej: 4:32, 250 reps, 80kg..." placeholderTextColor={C.textDim} />

              {/* RPE */}
              <Text style={m.label}>RPE: {form.rpe}/10</Text>
              <View style={m.rpeRow}>
                {Array.from({length:10},(_,i)=>(
                  <TouchableOpacity key={i+1} onPress={()=>setForm(f=>({...f,rpe:i+1}))}
                    style={[m.rpeBtn, (form.rpe??0)>=i+1 && m.rpeBtnOn]}>
                    <Text style={[m.rpeBtnTxt,(form.rpe??0)>=i+1 && m.rpeBtnTxtOn]}>{i+1}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* RX */}
              <TouchableOpacity style={m.rxRow} onPress={()=>setForm(f=>({...f,rxd:!f.rxd}))}>
                <View style={[m.checkbox, form.rxd && m.checkboxOn]}>
                  {form.rxd && <Ionicons name="checkmark" size={14} color="#071220" />}
                </View>
                <Text style={m.rxLabel}>Completado como RX'd</Text>
              </TouchableOpacity>

              {/* Notes */}
              <Text style={m.label}>Notas personales</Text>
              <TextInput style={[m.input,m.textarea]} value={form.notes}
                onChangeText={v=>setForm(f=>({...f,notes:v}))} multiline
                placeholder="Cómo te sentiste, qué mejorar..." placeholderTextColor={C.textDim} />

            </ScrollView>

            <View style={m.footer}>
              <TouchableOpacity style={m.saveBtn} onPress={saveForm}>
                <Text style={m.saveTxt}>Guardar Entrenamiento</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex:1, backgroundColor:C.bg },
  header:       { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:16, paddingVertical:14 },
  title:        { fontSize:20, fontWeight:'900', color:C.text },
  addBtn:       { flexDirection:'row', alignItems:'center', gap:5, backgroundColor:C.lime, borderRadius:10, paddingHorizontal:14, paddingVertical:8 },
  addTxt:       { fontSize:13, fontWeight:'800', color:'#071220' },
  filterScroll: { flexGrow:0 },
  filterContent:{ paddingHorizontal:16, paddingBottom:12, gap:8, flexDirection:'row' },
  filterTab:    { borderRadius:20, borderWidth:1, borderColor:C.border, paddingHorizontal:14, paddingVertical:6 },
  filterTabOn:  { backgroundColor:C.limeDim, borderColor:C.borderLime },
  filterTxt:    { fontSize:12, fontWeight:'700', color:C.textDim },
  filterTxtOn:  { color:C.lime },
  listContent:  { paddingHorizontal:16, paddingBottom:24 },
  empty:        { alignItems:'center', paddingTop:60, gap:12 },
  emptyTxt:     { color:C.textDim, fontSize:14, fontWeight:'600' },
});
const m = StyleSheet.create({
  safe:         { flex:1, backgroundColor:C.bg },
  header:       { flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:16, borderBottomWidth:1, borderColor:C.border },
  title:        { fontSize:18, fontWeight:'900', color:C.text },
  scroll:       { flex:1 },
  content:      { padding:16 },
  label:        { fontSize:11, fontWeight:'800', color:C.textDim, textTransform:'uppercase', letterSpacing:1.5, marginBottom:8, marginTop:4 },
  input:        { backgroundColor:C.bgCard, borderWidth:1, borderColor:C.border, borderRadius:10, color:C.text, fontSize:15, paddingHorizontal:14, paddingVertical:12, marginBottom:14 },
  textarea:     { minHeight:80, textAlignVertical:'top' },
  typeChip:     { borderWidth:1, borderColor:C.border, borderRadius:8, paddingHorizontal:12, paddingVertical:7 },
  typeChipTxt:  { fontSize:12, fontWeight:'700', color:C.textDim },
  rpeRow:       { flexDirection:'row', gap:6, marginBottom:16, flexWrap:'wrap' },
  rpeBtn:       { width:30, height:30, borderRadius:8, backgroundColor:C.bgCard, borderWidth:1, borderColor:C.border, alignItems:'center', justifyContent:'center' },
  rpeBtnOn:     { backgroundColor:C.lime, borderColor:C.lime },
  rpeBtnTxt:    { fontSize:12, fontWeight:'800', color:C.textSec },
  rpeBtnTxtOn:  { color:'#071220' },
  rxRow:        { flexDirection:'row', alignItems:'center', gap:10, marginBottom:16 },
  checkbox:     { width:22, height:22, borderRadius:6, borderWidth:1, borderColor:C.border, backgroundColor:C.bgCard, alignItems:'center', justifyContent:'center' },
  checkboxOn:   { backgroundColor:C.lime, borderColor:C.lime },
  rxLabel:      { fontSize:14, fontWeight:'600', color:C.text },
  footer:       { padding:16, borderTopWidth:1, borderColor:C.border },
  saveBtn:      { backgroundColor:C.lime, borderRadius:12, padding:16, alignItems:'center' },
  saveTxt:      { fontSize:15, fontWeight:'900', color:'#071220' },
});
