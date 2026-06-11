import { getApiKey, getProfile, getL1Context, getWorkouts, getCompetitions } from './storage';
import { ChatMessage } from './types';

const DEFAULT_L1 = `FUNDAMENTOS CROSSFIT L1:

Definición: CrossFit es movimientos funcionales constantemente variados ejecutados a alta intensidad.

Las 10 habilidades físicas generales:
1. Resistencia cardiovascular/respiratoria
2. Resistencia muscular
3. Fuerza
4. Flexibilidad
5. Potencia
6. Velocidad
7. Coordinación
8. Agilidad
9. Equilibrio
10. Precisión

Vías metabólicas:
- Fosfagénica (0-10 seg): ATP-PCr, máxima intensidad, movimientos explosivos
- Glucolítica (10 seg – 2 min): glucosa, intensidad media-alta, esfuerzos repetidos
- Oxidativa (+2 min): aeróbica, intensidad moderada, larga duración

Prescripción CrossFit: Constante variación + movimientos funcionales + alta intensidad relativa

Metodología de progresión: Mecánica → Consistencia → Intensidad
Nunca comprometer la técnica por el peso o la velocidad.

Tipos de WOD:
- AMRAP: tantas rondas/reps como sea posible en el tiempo asignado
- EMOM: cada minuto en el minuto
- For Time: completar el trabajo lo más rápido posible
- Chipper: lista larga de trabajos, se completa una vez
- Tabata: 8 rounds × (20 seg trabajo / 10 seg descanso)

Recuperación: 7-9h sueño, movilidad activa, hidratación, periodización del volumen de entrenamiento.

RPE: Escala 1-10 del esfuerzo percibido. RPE 7-8 para días de calidad, RPE 9-10 para tests.`;

async function buildSystemPrompt(): Promise<string> {
  const [profile, l1Context, workouts, competitions] = await Promise.all([
    getProfile(), getL1Context(), getWorkouts(), getCompetitions(),
  ]);

  const name = profile?.name || 'el atleta';
  const now = new Date();

  const profileBlock = profile
    ? `PERFIL DEL ATLETA:
- Nombre: ${profile.name}
- Nivel: ${profile.level}
- Box: ${profile.box || 'No especificado'}
- Años entrenando: ${profile.yearsTraining || 'No especificado'}
- Objetivos: ${profile.goals}`
    : `PERFIL: No configurado aún. Recomiéndale al atleta que configure su perfil en Ajustes.`;

  const nextComps = competitions
    .filter(c => !c.completed && new Date(c.date) >= now)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);

  const compsBlock = nextComps.length > 0
    ? `PRÓXIMAS COMPETENCIAS:\n${nextComps.map(c => {
        const days = Math.ceil((new Date(c.date).getTime() - now.getTime()) / 86400000);
        return `- ${c.name} | ${c.date} (en ${days} días)${c.location ? ` | ${c.location}` : ''}`;
      }).join('\n')}`
    : `COMPETENCIAS: Sin competencias próximas registradas.`;

  const recent = workouts.slice(0, 10);
  const workoutsBlock = recent.length > 0
    ? `HISTORIAL DE ENTRENAMIENTOS (últimos ${recent.length}):
${recent.map(w =>
  `- ${w.date} | ${w.type} | ${w.name || 'Sin nombre'}${w.result ? ` | Resultado: ${w.result}` : ''}${w.rpe ? ` | RPE: ${w.rpe}/10` : ''}${w.rxd ? ' | RX\'d' : ''}${w.notes ? ` | "${w.notes}"` : ''}`
).join('\n')}`
    : `HISTORIAL: Sin entrenamientos registrados aún.`;

  const contextBlock = l1Context.trim() || DEFAULT_L1;

  return `Eres el coach personal de CrossFit de ${name}.

${profileBlock}

${compsBlock}

${workoutsBlock}

BASE DE CONOCIMIENTO:
${contextBlock}

TU ROL:
- Eres coach CrossFit L1 certificado + coach de rendimiento mental y performance deportivo
- Analizas el historial del atleta para dar feedback personalizado y detectar patrones (debilidades, sobreentrenamiento, progreso)
- Preparas mentalmente al atleta para competencias: visualización, gestión del estrés, mindset de proceso vs resultado
- Das consejos técnicos concretos y accionables
- Eres directo, cercano, motivador, y basado en evidencia
- Siempre respondes en español, tratas al atleta de TÚ
- Respuestas concisas: máximo 180 palabras, salvo que el atleta pida más detalle
- Cuando el atleta comparte resultados, los analizas en contexto con su historial

HERRAMIENTAS MENTALES QUE USAS:
- Box breathing: 4-4-4-4 para activación o calma pre-WOD
- Visualización: "cierra los ojos, imagina que ya terminaste el primer heat..."
- Self-talk basado en acciones: "siguiente rep", "buen ritmo", "tú controlas el proceso"
- Fragmentación del WOD: dividir en bloques mentales para no abrumarse
- Gestión del miedo y presión competitiva: normalizar la ansiedad como energía disponible`;
}

export async function sendMessage(messages: ChatMessage[]): Promise<string> {
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error('API_KEY_MISSING');

  const systemPrompt = await buildSystemPrompt();

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    }),
  });

  if (!resp.ok) {
    const err = await resp.text().catch(() => String(resp.status));
    if (resp.status === 401) throw new Error('API_KEY_INVALID');
    throw new Error(`API_ERROR: ${resp.status} — ${err}`);
  }

  const data = await resp.json();
  return data.content[0].text as string;
}
