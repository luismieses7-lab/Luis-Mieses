import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../constants/theme';
import { getProfile, getWorkouts, getCompetitions, getApiKey } from '../../lib/storage';
import type { UserProfile, Workout, Competition } from '../../lib/types';

function daysUntil(dateStr: string) {
  const d = new Date(dateStr); d.setHours(0,0,0,0);
  const n = new Date(); n.setHours(0,0,0,0);
  return Math.ceil((d.getTime() - n.getTime()) / 86400000);
}
function greeting() {
  const h = new Date().getHours();
  return h < 12 ? '¡Buenos días' : h < 18 ? '¡Buenas tardes' : '¡Buenas noches';
}
function weekCount(ws: Workout[]) {
  const start = new Date(); start.setHours(0,0,0,0); start.setDate(start.getDate() - start.getDay());
  return ws.filter(w => new Date(w.date) >= start).length;
}
function calcStreak(ws: Workout[]) {
  if (!ws.length) return 0;
  const sorted = [...ws].sort((a,b) => b.date.localeCompare(a.date));
  let streak = 0, check = new Date(); check.setHours(0,0,0,0);
  for (const w of sorted) {
    const d = new Date(w.date); d.setHours(0,0,0,0);
    const diff = Math.floor((check.getTime() - d.getTime()) / 86400000);
    if (diff > 1) break;
    if (diff >= 0) { streak++; check = new Date(d); check.setDate(check.getDate()-1); }
  }
  return streak;
}

export default function HomeScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile|null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [hasKey, setHasKey] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [p,w,c,k] = await Promise.all([getProfile(),getWorkouts(),getCompetitions(),getApiKey()]);
    setProfile(p); setWorkouts(w); setCompetitions(c); setHasKey(!!k);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  const nextComp = competitions
    .filter(c => !c.completed && daysUntil(c.date) >= 0)
    .sort((a,b) => a.date.localeCompare(b.date))[0];
  const last = workouts[0];
  const name = profile?.name ?? 'Atleta';

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.lime} />}>

        {/* Header */}
        <View style={s.header}>
          <View style={{flex:1}}>
            <Text style={s.greeting}>{greeting()}, {name}!</Text>
            <Text style={s.date}>
              {new Date().toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'})}
            </Text>
          </View>
          <TouchableOpacity style={s.settBtn} onPress={() => router.push('/settings')}>
            <Ionicons name="settings-outline" size={20} color={C.textSec} />
          </TouchableOpacity>
        </View>

        {/* API Key warning */}
        {!hasKey && (
          <TouchableOpacity style={s.banner} onPress={() => router.push('/settings')}>
            <Ionicons name="key-outline" size={15} color={C.lime} />
            <Text style={s.bannerTxt}>Configura tu API Key para activar el coach IA →</Text>
          </TouchableOpacity>
        )}

        {/* Stats */}
        <View style={s.statsRow}>
          {[
            { val: weekCount(workouts), label: 'Esta semana', color: C.lime, bg: C.limeDim, border: C.borderLime },
            { val: calcStreak(workouts), label: 'Días seguidos', color: C.blue, bg: C.blueDim, border: 'rgba(56,189,248,0.2)' },
            { val: workouts.length, label: 'Total logs', color: C.green, bg: C.greenDim, border: 'rgba(52,211,153,0.2)' },
          ].map(item => (
            <View key={item.label} style={[s.statCard, { backgroundColor: item.bg, borderColor: item.border }]}>
              <Text style={[s.statNum, { color: item.color }]}>{item.val}</Text>
              <Text style={s.statLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Next competition */}
        {nextComp && (
          <TouchableOpacity style={s.compCard} onPress={() => router.push('/(tabs)/compete')}>
            <View style={{flex:1}}>
              <Text style={s.compLabel}>PRÓXIMA COMPETENCIA</Text>
              <Text style={s.compName}>{nextComp.name}</Text>
              {nextComp.location && <Text style={s.compLoc}>📍 {nextComp.location}</Text>}
            </View>
            <View style={s.countdown}>
              <Text style={s.countDays}>{daysUntil(nextComp.date)}</Text>
              <Text style={s.countLabel}>DÍAS</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Coach CTA */}
        <TouchableOpacity style={s.coachCta} onPress={() => router.push('/(tabs)/chat')}>
          <View style={s.coachLeft}>
            <View style={s.onlineDot} />
            <View>
              <Text style={s.coachTitle}>Habla con tu Coach</Text>
              <Text style={s.coachSub}>Feedback, estrategia, preparación mental...</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.lime} />
        </TouchableOpacity>

        {/* Last workout */}
        <Text style={s.sectionTitle}>ÚLTIMO ENTRENAMIENTO</Text>
        {last ? (
          <View style={s.workoutCard}>
            <View style={s.workoutTop}>
              <View style={[s.typeBadge, {backgroundColor:'rgba(248,113,113,0.12)',borderColor:'rgba(248,113,113,0.25)'}]}>
                <Text style={[s.typeTxt,{color:'#f87171'}]}>{last.type}</Text>
              </View>
              <Text style={s.workoutDate}>
                {new Date(last.date).toLocaleDateString('es-ES',{day:'numeric',month:'short'})}
              </Text>
            </View>
            <Text style={s.workoutName}>{last.name || 'Sin nombre'}</Text>
            {last.result && <Text style={s.workoutResult}>Resultado: {last.result}</Text>}
            {last.rpe !== undefined && (
              <View style={s.rpeRow}>
                {Array.from({length:10},(_,i) => (
                  <View key={i} style={[s.rpeDot, i<(last.rpe??0) && s.rpeDotOn]} />
                ))}
                <Text style={s.rpeLabel}>RPE {last.rpe}/10</Text>
              </View>
            )}
          </View>
        ) : (
          <TouchableOpacity style={s.emptyCard} onPress={() => router.push('/(tabs)/log')}>
            <Ionicons name="barbell-outline" size={30} color={C.textDim} />
            <Text style={s.emptyTxt}>Registra tu primer entrenamiento →</Text>
          </TouchableOpacity>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:       { flex:1, backgroundColor:C.bg },
  scroll:     { flex:1 },
  content:    { padding:20, paddingBottom:32 },
  header:     { flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 },
  greeting:   { fontSize:22, fontWeight:'800', color:C.text },
  date:       { fontSize:12, color:C.textSec, marginTop:4, textTransform:'capitalize' },
  settBtn:    { width:38,height:38,borderRadius:10,backgroundColor:C.bgCard,borderWidth:1,borderColor:C.border,alignItems:'center',justifyContent:'center' },
  banner:     { flexDirection:'row',alignItems:'center',gap:8,backgroundColor:C.limeDim,borderWidth:1,borderColor:C.borderLime,borderRadius:10,padding:12,marginBottom:16 },
  bannerTxt:  { color:C.lime,fontSize:13,fontWeight:'600',flex:1 },
  statsRow:   { flexDirection:'row',gap:10,marginBottom:14 },
  statCard:   { flex:1,borderRadius:12,borderWidth:1,padding:14,alignItems:'center' },
  statNum:    { fontSize:28,fontWeight:'900' },
  statLabel:  { fontSize:10,color:C.textSec,fontWeight:'700',textTransform:'uppercase',marginTop:2 },
  compCard:   { backgroundColor:C.bgCard,borderRadius:14,borderWidth:1,borderColor:'rgba(200,245,0,0.22)',padding:16,marginBottom:12,flexDirection:'row',alignItems:'center',...C.shadow },
  compLabel:  { fontSize:10,color:C.lime,fontWeight:'800',letterSpacing:1.5,textTransform:'uppercase' },
  compName:   { fontSize:18,fontWeight:'800',color:C.text,marginTop:4 },
  compLoc:    { fontSize:12,color:C.textSec,marginTop:2 },
  countdown:  { alignItems:'center',marginLeft:16 },
  countDays:  { fontSize:36,fontWeight:'900',color:C.lime,lineHeight:40 },
  countLabel: { fontSize:10,color:C.textSec,fontWeight:'700' },
  coachCta:   { backgroundColor:C.bgCard,borderRadius:14,borderWidth:1,borderColor:C.border,padding:16,marginBottom:24,flexDirection:'row',alignItems:'center',justifyContent:'space-between' },
  coachLeft:  { flexDirection:'row',alignItems:'center',gap:12 },
  onlineDot:  { width:10,height:10,borderRadius:5,backgroundColor:C.green },
  coachTitle: { fontSize:15,fontWeight:'700',color:C.text },
  coachSub:   { fontSize:12,color:C.textSec,marginTop:2 },
  sectionTitle:{ fontSize:10,fontWeight:'800',color:C.textDim,letterSpacing:2,textTransform:'uppercase',marginBottom:10 },
  workoutCard:{ backgroundColor:C.bgCard,borderRadius:14,borderWidth:1,borderColor:C.border,padding:16,...C.shadow },
  workoutTop: { flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:8 },
  typeBadge:  { borderWidth:1,borderRadius:6,paddingHorizontal:8,paddingVertical:3 },
  typeTxt:    { fontSize:10,fontWeight:'800',letterSpacing:0.5 },
  workoutDate:{ fontSize:12,color:C.textSec,fontWeight:'600' },
  workoutName:{ fontSize:17,fontWeight:'800',color:C.text,marginBottom:6 },
  workoutResult:{ fontSize:13,color:C.green,fontWeight:'600' },
  rpeRow:     { flexDirection:'row',alignItems:'center',gap:4,marginTop:10 },
  rpeDot:     { width:8,height:8,borderRadius:4,backgroundColor:C.bgInner },
  rpeDotOn:   { backgroundColor:C.lime },
  rpeLabel:   { fontSize:11,color:C.textSec,fontWeight:'600',marginLeft:4 },
  emptyCard:  { alignItems:'center',padding:36,backgroundColor:C.bgCard,borderRadius:14,borderWidth:1,borderColor:C.border,borderStyle:'dashed',gap:10 },
  emptyTxt:   { fontSize:13,color:C.textDim,fontWeight:'600' },
});
