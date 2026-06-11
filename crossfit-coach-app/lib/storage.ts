import AsyncStorage from '@react-native-async-storage/async-storage';
import { Workout, Competition, UserProfile, ChatMessage } from './types';

const K = {
  WORKOUTS:     'cf_workouts',
  COMPETITIONS: 'cf_competitions',
  PROFILE:      'cf_profile',
  API_KEY:      'cf_api_key',
  L1_CONTEXT:   'cf_l1_context',
  CHAT_HISTORY: 'cf_chat_history',
};

export async function getProfile(): Promise<UserProfile | null> {
  const raw = await AsyncStorage.getItem(K.PROFILE);
  return raw ? JSON.parse(raw) : null;
}
export async function saveProfile(p: UserProfile): Promise<void> {
  await AsyncStorage.setItem(K.PROFILE, JSON.stringify(p));
}

export async function getApiKey(): Promise<string> {
  return (await AsyncStorage.getItem(K.API_KEY)) ?? '';
}
export async function saveApiKey(k: string): Promise<void> {
  await AsyncStorage.setItem(K.API_KEY, k);
}

export async function getL1Context(): Promise<string> {
  return (await AsyncStorage.getItem(K.L1_CONTEXT)) ?? '';
}
export async function saveL1Context(ctx: string): Promise<void> {
  await AsyncStorage.setItem(K.L1_CONTEXT, ctx);
}

export async function getWorkouts(): Promise<Workout[]> {
  const raw = await AsyncStorage.getItem(K.WORKOUTS);
  return raw ? JSON.parse(raw) : [];
}
export async function saveWorkout(w: Workout): Promise<void> {
  const list = await getWorkouts();
  const idx = list.findIndex(x => x.id === w.id);
  if (idx >= 0) list[idx] = w; else list.unshift(w);
  list.sort((a, b) => b.date.localeCompare(a.date));
  await AsyncStorage.setItem(K.WORKOUTS, JSON.stringify(list));
}
export async function deleteWorkout(id: string): Promise<void> {
  const list = await getWorkouts();
  await AsyncStorage.setItem(K.WORKOUTS, JSON.stringify(list.filter(w => w.id !== id)));
}

export async function getCompetitions(): Promise<Competition[]> {
  const raw = await AsyncStorage.getItem(K.COMPETITIONS);
  return raw ? JSON.parse(raw) : [];
}
export async function saveCompetition(c: Competition): Promise<void> {
  const list = await getCompetitions();
  const idx = list.findIndex(x => x.id === c.id);
  if (idx >= 0) list[idx] = c; else list.unshift(c);
  await AsyncStorage.setItem(K.COMPETITIONS, JSON.stringify(list));
}
export async function deleteCompetition(id: string): Promise<void> {
  const list = await getCompetitions();
  await AsyncStorage.setItem(K.COMPETITIONS, JSON.stringify(list.filter(c => c.id !== id)));
}

export async function getChatHistory(): Promise<ChatMessage[]> {
  const raw = await AsyncStorage.getItem(K.CHAT_HISTORY);
  return raw ? JSON.parse(raw) : [];
}
export async function saveChatHistory(msgs: ChatMessage[]): Promise<void> {
  await AsyncStorage.setItem(K.CHAT_HISTORY, JSON.stringify(msgs.slice(-80)));
}
export async function clearChatHistory(): Promise<void> {
  await AsyncStorage.removeItem(K.CHAT_HISTORY);
}
