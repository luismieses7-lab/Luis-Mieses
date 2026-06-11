import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../constants/theme';
import {
  getProfile, saveProfile, getApiKey, saveApiKey,
  getL1Context, saveL1Context,
} from '../lib/storage';
import type { UserProfile, AthleteLevel } from '../lib/types';

const LEVELS: AthleteLevel[] = ['Principiante','Intermedio','RX','Elite'];

const L1_PLACEHOLDER = `Pega aquí el contenido de tu CrossFit L1, L2 o cualquier material de entrenamiento.

Por ejemplo:
- Fundamentos técnicos de los movimientos
- Metodología de programación
- Principios de nutrición
- Protocolos de recuperación
- Notas de tu entrenador

Cuanto más detallado sea el contexto, más personalizado será el coaching.`;

export default function SettingsScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [level, setLevel] = useState<AthleteLevel>('Intermedio');
  const [goals, setGoals] = useState('');
  const [years, setYears] = useState('');
  const [box, setBox] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [l1, setL1] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const [p, k, ctx] = await Promise.all([getProfile(), getApiKey(), getL1Context()]);
      if (p) { setName(p.name); setLevel(p.level); setGoals(p.goals); setYears(p.yearsTraining??''); setBox(p.box??''); }
      setApiKey(k);
      setL1(ctx);
    })();
  }, []);

  const save = async () => {
    const profile: UserProfile = { name: name.trim(), level, goals: goals.trim(), yearsTraining: years.trim(), box: box.trim() };
    await Promise.all([saveProfile(profile), saveApiKey(apiKey.trim()), saveL1Context(l1)]);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS==='ios'?'padding':undefined}>
      <SafeAreaView style={s.safe} edges={['top','bottom']}>
        <View style={s.header}>
          <Text style={s.title}>⚙️ Ajustes</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={24} color={C.textSec} />
          </TouchableOpacity>
        </View>

        <ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

          {/* Profile */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>PERFIL DEL ATLETA</Text>

            <Text style={s.label}>Nombre</Text>
            <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Tu nombre" placeholderTextColor={C.textDim}/>

            <Text style={s.label}>Nivel</Text>
            <View style={s.levelRow}>
              {LEVELS.map(l => (
                <TouchableOpacity key={l} style={[s.levelBtn, level===l && s.levelBtnOn]} onPress={() => setLevel(l)}>
                  <Text style={[s.levelTxt, level===l && s.levelTxtOn]}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>Objetivos</Text>
            <TextInput style={[s.input,s.textarea]} value={goals} onChangeText={setGoals} multiline
              placeholder="Clasificar a Regionals, mejorar Fran, primer RX..." placeholderTextColor={C.textDim}/>

            <Text style={s.label}>Box / Gym</Text>
            <TextInput style={s.input} value={box} onChangeText={setBox} placeholder="Nombre de tu box" placeholderTextColor={C.textDim}/>

            <Text style={s.label}>Años entrenando CrossFit</Text>
            <TextInput style={s.input} value={years} onChangeText={setYears} placeholder="Ej: 2 años" placeholderTextColor={C.textDim}/>
          </View>

          {/* API Key */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>API KEY DE CLAUDE (ANTHROPIC)</Text>
            <Text style={s.sectionSub}>Obtén tu key gratis en console.anthropic.com → API Keys</Text>
            <View style={s.keyRow}>
              <TextInput
                style={[s.input,{flex:1,marginBottom:0}]}
                value={apiKey}
                onChangeText={setApiKey}
                placeholder="sk-ant-api03-..."
                placeholderTextColor={C.textDim}
                secureTextEntry={!showKey}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity style={s.eyeBtn} onPress={() => setShowKey(v=>!v)}>
                <Ionicons name={showKey ? 'eye-off-outline' : 'eye-outline'} size={18} color={C.textSec}/>
              </TouchableOpacity>
            </View>
          </View>

          {/* CrossFit Context */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>CONTEXTO CROSSFIT (L1, L2, NOTAS)</Text>
            <Text style={s.sectionSub}>
              Pega aquí el contenido de tu CrossFit L1/L2 o cualquier material de entrenamiento.
              El coach usará esto como base de conocimiento personalizado.
            </Text>
            <TextInput
              style={[s.input, s.l1Input]}
              value={l1}
              onChangeText={setL1}
              multiline
              placeholder={L1_PLACEHOLDER}
              placeholderTextColor={C.textDim}
            />
            {l1.length > 0 && (
              <Text style={s.charCount}>{l1.length.toLocaleString()} caracteres cargados</Text>
            )}
          </View>

          {/* Danger zone */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>DATOS</Text>
            <TouchableOpacity style={s.dangerBtn} onPress={() => {
              Alert.alert('¿Borrar todo?', 'Se eliminarán todos los entrenos, competencias y el chat. Esta acción no se puede deshacer.',
                [{ text:'Cancelar',style:'cancel' },
                 { text:'Borrar todo',style:'destructive', onPress: async () => {
                   const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                   await AsyncStorage.clear();
                   router.back();
                 }}]);
            }}>
              <Ionicons name="trash-outline" size={15} color={C.red}/>
              <Text style={s.dangerTxt}>Borrar todos los datos</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>

        <View style={s.footer}>
          <TouchableOpacity style={[s.saveBtn, saved && s.saveBtnDone]} onPress={save}>
            <Ionicons name={saved ? 'checkmark' : 'save-outline'} size={16} color="#071220"/>
            <Text style={s.saveTxt}>{saved ? '¡Guardado!' : 'Guardar Ajustes'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  safe:         { flex:1, backgroundColor:C.bg },
  header:       { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:16, paddingVertical:14, borderBottomWidth:1, borderColor:C.border },
  title:        { fontSize:20, fontWeight:'900', color:C.text },
  scroll:       { flex:1 },
  content:      { padding:16, paddingBottom:24 },
  section:      { backgroundColor:C.bgCard, borderRadius:14, borderWidth:1, borderColor:C.border, padding:16, marginBottom:14 },
  sectionTitle: { fontSize:10, fontWeight:'900', color:C.textDim, letterSpacing:2, textTransform:'uppercase', marginBottom:4 },
  sectionSub:   { fontSize:12, color:C.textDim, marginBottom:14, lineHeight:18 },
  label:        { fontSize:11, fontWeight:'700', color:C.textSec, marginBottom:6, marginTop:10 },
  input:        { backgroundColor:C.bgInner, borderWidth:1, borderColor:C.border, borderRadius:10, color:C.text, fontSize:14, paddingHorizontal:13, paddingVertical:11, marginBottom:4 },
  textarea:     { minHeight:70, textAlignVertical:'top' },
  l1Input:      { minHeight:180, textAlignVertical:'top', fontSize:13 },
  charCount:    { fontSize:11, color:C.lime, fontWeight:'700', marginTop:4 },
  levelRow:     { flexDirection:'row', gap:8, flexWrap:'wrap', marginBottom:4 },
  levelBtn:     { borderWidth:1, borderColor:C.border, borderRadius:8, paddingHorizontal:14, paddingVertical:8 },
  levelBtnOn:   { backgroundColor:C.limeDim, borderColor:C.borderLime },
  levelTxt:     { fontSize:12, fontWeight:'700', color:C.textDim },
  levelTxtOn:   { color:C.lime },
  keyRow:       { flexDirection:'row', alignItems:'center', gap:8 },
  eyeBtn:       { width:42, height:42, borderRadius:10, backgroundColor:C.bgInner, borderWidth:1, borderColor:C.border, alignItems:'center', justifyContent:'center' },
  dangerBtn:    { flexDirection:'row', alignItems:'center', gap:8, padding:12, backgroundColor:C.redDim, borderRadius:10, borderWidth:1, borderColor:'rgba(248,113,113,0.2)' },
  dangerTxt:    { color:C.red, fontWeight:'700', fontSize:13 },
  footer:       { padding:16, borderTopWidth:1, borderColor:C.border },
  saveBtn:      { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8, backgroundColor:C.lime, borderRadius:12, padding:15 },
  saveBtnDone:  { backgroundColor:C.green },
  saveTxt:      { fontSize:15, fontWeight:'900', color:'#071220' },
});
