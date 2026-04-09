import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { WebUntis } from 'webuntis';

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function untisDateToStr(n: number): string {
  const s = String(n);
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

function untisTimeToStr(n: number): string {
  const s = String(n).padStart(4, '0');
  return `${s.slice(0, 2)}:${s.slice(2, 4)}`;
}

export async function POST(req: NextRequest) {
  const auth = requireApiKey(req);
  if (auth) return auth;

  const school   = process.env.WEBUNTIS_SCHOOL;
  const username = process.env.WEBUNTIS_USERNAME;
  const password = process.env.WEBUNTIS_PASSWORD;
  const server   = process.env.WEBUNTIS_SERVER;

  if (!school || !username || !password || !server) {
    return NextResponse.json({ error: 'WebUntis credentials not configured' }, { status: 500 });
  }

  // Sync range: today + 4 weeks
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 28);

  const startStr = toDateStr(start);
  const endStr   = toDateStr(end);

  const untis = new WebUntis(school, username, password, server);

  try {
    await untis.login();
    const timetable = await untis.getOwnTimetableForRange(start, end);
    await untis.logout();

    const events = timetable
      .filter((lesson: any) => lesson.su?.length > 0)
      .map((lesson: any) => ({
        id:             crypto.randomUUID(),
        title:          lesson.su[0]?.longName ?? lesson.su[0]?.name ?? 'Unterricht',
        description:    lesson.ro?.[0]?.name ?? null,
        date:           untisDateToStr(lesson.date),
        start_time:     untisTimeToStr(lesson.startTime),
        end_time:       untisTimeToStr(lesson.endTime),
        type:           'school',
        source:         'webuntis',
        color:          null,
        recurrence:     null,
        recurrence_end: null,
        created_at:     new Date().toISOString(),
      }));

    const supabase = createAdminClient();

    // Delete existing webuntis events in range, then insert fresh
    const { error: delError } = await supabase
      .from('events')
      .delete()
      .eq('source', 'webuntis')
      .gte('date', startStr)
      .lte('date', endStr);

    if (delError) return NextResponse.json({ error: delError.message }, { status: 500 });

    if (events.length > 0) {
      const { error: insError } = await supabase.from('events').insert(events);
      if (insError) return NextResponse.json({ error: insError.message }, { status: 500 });
    }

    return NextResponse.json({ synced: events.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Sync failed' }, { status: 500 });
  }
}
