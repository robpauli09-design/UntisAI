import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const auth = requireApiKey(req);
  if (auth) return auth;

  const { message, preferences = [], activities = [], events = [], history = [] } = await req.json();

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });
  }

  const supabaseForProfile = createAdminClient();
  const { data: profileData } = await supabaseForProfile.from('user_profile').select('notes').eq('id', 1).single();
  const userProfile = profileData?.notes?.trim() ?? '';

  const prefContext = preferences.length
    ? preferences.map((p: { id: string; subject: string; grade: number; enjoyment: number; notes?: string }) =>
        `  - ID:${p.id} | ${p.subject} | Note:${p.grade} | Interesse:${p.enjoyment}/5${p.notes ? ` | ${p.notes}` : ''}`
      ).join('\n')
    : '  (keine Fächer eingetragen)';

  const actContext = activities.length
    ? activities.map((a: { id: string; name: string; category: string; times_per_week: number; duration_mins: number; enjoyment: number; notes?: string }) =>
        `  - ID:${a.id} | ${a.name} (${a.category}) | ${a.times_per_week}x/Woche, ${a.duration_mins} Min | Spaß:${a.enjoyment}/5${a.notes ? ` | ${a.notes}` : ''}`
      ).join('\n')
    : '  (keine Aktivitäten eingetragen)';

  const evtContext = events.length
    ? events.map((e: { id: string; date: string; start_time: string; end_time: string; type: string; source: string; title: string; description?: string }) =>
        `  - ID:${e.id} | ${e.date} ${e.start_time.slice(0,5)}–${e.end_time.slice(0,5)} | ${e.type.toUpperCase()} | ${e.title}${e.description ? ` | ${e.description.replace(/\n/g,' ')}` : ''}${e.source !== 'manual' ? ` [${e.source}]` : ''}`
      ).join('\n')
    : '  (keine Events im Zeitraum)';

  const todayDate = new Date();
  const today = todayDate.toISOString().slice(0, 10);
  const DAY_NAMES = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const todayName = DAY_NAMES[todayDate.getDay()];

  // Build explicit weekday→date lists for the next 90 days grouped by weekday name
  // so the AI never has to calculate dates itself
  const weekdayDates: Record<string, string[]> = {};
  for (let i = 0; i < 90; i++) {
    const d = new Date(todayDate);
    d.setDate(todayDate.getDate() + i);
    const name = DAY_NAMES[d.getDay()];
    if (!weekdayDates[name]) weekdayDates[name] = [];
    weekdayDates[name].push(d.toISOString().slice(0, 10));
  }
  const weekdayContext = Object.entries(weekdayDates)
    .map(([name, dates]) => `${name}: ${dates.join(', ')}`)
    .join('\n');

  const systemPrompt = `Du bist ein freundlicher KI-Assistent für einen persönlichen Schulplaner. Du kannst Kalender-Events, Fach-Präferenzen und Freizeitaktivitäten verwalten.
${userProfile ? `\nNUTZERPROFIL:\n${userProfile}\n` : ''}
HEUTE: ${today} (${todayName})

WOCHENTAG-KALENDER (nächste 90 Tage – verwende NUR diese Daten, berechne KEINE Daten selbst!):
${weekdayContext}

KALENDER (nächste 2 Wochen):
${evtContext}

FÄCHER:
${prefContext}

AKTIVITÄTEN:
${actContext}

ANTWORTFORMAT (IMMER strikt JSON, kein Markdown drumherum):
{
  "message": "Deine freundliche Antwort auf Deutsch",
  "action": {
    "type": "AKTIONSTYP",
    "data": { ... }
  }
}
Wenn keine DB-Änderung nötig: "action" weglassen.

VERFÜGBARE AKTIONEN:

Kalender-Events = konkrete Termine mit Datum und Uhrzeit (nur source=manual Events ändern/löschen!):
- create_event: { title, date (YYYY-MM-DD), start_time (HH:MM), end_time (HH:MM), type (school|exam|study|sport|free|other), description?, recurrence? (weekly|biweekly), recurrence_end? (YYYY-MM-DD) }
  → Wiederkehrende Termine: recurrence="weekly" oder "biweekly" + recurrence_end setzen (Standard: 3 Monate ab heute)
  → Mehrere verschiedene Termine auf einmal: data als Array [ {...}, {...}, {...} ]
- update_event: { id, title?, date?, start_time?, end_time?, type? (school|exam|study|sport|free|other), description?, recurrence?, recurrence_end? }
- delete_event: { id } → löscht bei wiederkehrenden Terminen ALLE Wiederholungen

Fächer (Schulfächer mit Note/Interesse – KEIN Datum):
- create_preference: { subject, grade (1-5), enjoyment (1-5), notes? }
- update_preference: { id, subject?, grade?, enjoyment?, notes? }
- delete_preference: { id }

Aktivitäten = allgemeine Hobbys/Gewohnheiten ohne konkretes Datum (z.B. "spiele 2x/Woche Tennis"):
- create_activity: { name, category, enjoyment (1-5), times_per_week, duration_mins, notes? }
- update_activity: { id, name?, category?, enjoyment?, times_per_week?, duration_mins?, notes? }
- delete_activity: { id }

REGELN:
- Wenn jemand Training/Sport zu bestimmten Tagen einplanen will → create_event (NICHT create_activity)!
- create_activity nur für allgemeine Hobby-Profile ohne konkretes Datum
- WebUntis/KI-Events (source=webuntis oder source=ai) NIEMALS löschen oder ändern
- Noten: 1=Sehr Gut bis 5=Nicht Genügend
- Für update/delete: ID aus den AKTUELLEN DATEN verwenden
- Bei Zeitangaben ohne Datum: heutiges Datum oder nächsten passenden Tag verwenden
- Antworte immer auf Deutsch und freundlich. Bei Unklarheiten frage nach.`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-5',
      messages: [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: message },
      ],
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: `OpenAI Fehler: ${err}` }, { status: 500 });
  }

  const aiRes = await res.json();
  const content = aiRes.choices[0]?.message?.content ?? '{}';

  let parsed: { message: string; action?: { type: string; data: Record<string, unknown> } };
  try {
    parsed = JSON.parse(content);
  } catch {
    return NextResponse.json({ message: 'Fehler beim Verarbeiten der Antwort.', actionExecuted: false });
  }

  let actionExecuted = false;
  let dbError: string | null = null;

  if (parsed.action) {
    const supabase = createAdminClient();
    const { type, data } = parsed.action;

    // Always normalize data to an array so we handle single and bulk actions uniformly
    const items: Record<string, unknown>[] = Array.isArray(data) ? data : [data];

    const errors: string[] = [];

    for (const item of items) {
      let result: { error: { message: string } | null } = { error: null };
      const baseId = (rawId: unknown) => {
        const s = String(rawId);
        return s.includes(':') ? s.split(':')[0] : s;
      };

      if (type === 'create_event') {
        result = await supabase.from('events').insert({ ...item, source: 'manual' });
      } else if (type === 'update_event') {
        const { id, ...updates } = item;
        result = await supabase.from('events').update(updates).eq('id', baseId(id)).eq('source', 'manual');
      } else if (type === 'delete_event') {
        result = await supabase.from('events').delete().eq('id', baseId(item.id)).eq('source', 'manual');
      } else if (type === 'create_preference') {
        result = await supabase.from('subject_preferences').insert(item);
      } else if (type === 'update_preference') {
        const { id, ...updates } = item;
        result = await supabase.from('subject_preferences')
          .update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
      } else if (type === 'delete_preference') {
        result = await supabase.from('subject_preferences').delete().eq('id', item.id);
      } else if (type === 'create_activity') {
        result = await supabase.from('activities').insert(item);
      } else if (type === 'update_activity') {
        const { id, ...updates } = item;
        result = await supabase.from('activities')
          .update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
      } else if (type === 'delete_activity') {
        result = await supabase.from('activities').delete().eq('id', item.id);
      }

      if (result.error) errors.push(result.error.message);
    }

    if (errors.length > 0) {
      dbError = errors.join('; ');
    } else {
      actionExecuted = true;
    }
  }

  const reply = dbError
    ? `${parsed.message ?? ''}\n\n⚠️ Datenbankfehler: ${dbError}`
    : parsed.message ?? 'Ich habe deine Nachricht verarbeitet.';

  return NextResponse.json({ message: reply, actionExecuted });
}
