import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';

type EventRow = {
  id: string;
  date: string;
  recurrence: 'weekly' | 'biweekly' | null;
  recurrence_end: string | null;
  [key: string]: unknown;
};

function expandRecurring(event: EventRow, rangeStart: string, rangeEnd: string): EventRow[] {
  if (!event.recurrence) return [event];

  const step = event.recurrence === 'weekly' ? 7 : 14;
  const results: EventRow[] = [];

  const base    = new Date(event.date + 'T00:00:00');
  const rStart  = new Date(rangeStart + 'T00:00:00');
  const rEnd    = new Date(rangeEnd + 'T00:00:00');
  const rStop   = event.recurrence_end ? new Date(event.recurrence_end + 'T00:00:00') : null;

  let current = new Date(base);
  while (current <= rEnd) {
    if (rStop && current > rStop) break;
    if (current >= rStart) {
      const dateStr = current.toISOString().slice(0, 10);
      results.push({
        ...event,
        date: dateStr,
        // Virtual ID for occurrences after the base date so the frontend can identify them
        id: dateStr === event.date ? event.id : `${event.id}:${dateStr}`,
      });
    }
    current.setDate(current.getDate() + step);
  }
  return results;
}

export async function GET(req: NextRequest) {
  const auth = requireApiKey(req);
  if (auth) return auth;

  const { searchParams } = new URL(req.url);
  const start = searchParams.get('start');
  const end   = searchParams.get('end');
  if (!start || !end) {
    return NextResponse.json({ error: 'start and end required' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Fetch events in range + recurring base events that started before range
  const [inRange, recurring] = await Promise.all([
    supabase
      .from('events')
      .select('*')
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true }),
    supabase
      .from('events')
      .select('*')
      .not('recurrence', 'is', null)
      .lt('date', start)
      .or(`recurrence_end.is.null,recurrence_end.gte.${start}`),
  ]);

  if (inRange.error) return NextResponse.json({ error: inRange.error.message }, { status: 500 });
  if (recurring.error) return NextResponse.json({ error: recurring.error.message }, { status: 500 });

  const inRangeIds = new Set((inRange.data as EventRow[]).map(e => e.id));
  const extraRecurring = (recurring.data as EventRow[]).filter(e => !inRangeIds.has(e.id));

  const allEvents: EventRow[] = [
    ...(inRange.data as EventRow[]).flatMap(e => expandRecurring(e, start, end)),
    ...extraRecurring.flatMap(e => expandRecurring(e, start, end)),
  ];

  allEvents.sort((a, b) => {
    if (a.date < b.date) return -1;
    if (a.date > b.date) return 1;
    return String(a.start_time) < String(b.start_time) ? -1 : 1;
  });

  return NextResponse.json(allEvents);
}

export async function POST(req: NextRequest) {
  const auth = requireApiKey(req);
  if (auth) return auth;

  const body = await req.json();
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('events').insert(body).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const auth = requireApiKey(req);
  if (auth) return auth;

  const rawId = new URL(req.url).searchParams.get('id');
  if (!rawId) return NextResponse.json({ error: 'id required' }, { status: 400 });

  // Virtual recurring IDs look like "baseId:YYYY-MM-DD" — always delete the base event
  const baseId = rawId.includes(':') ? rawId.split(':')[0] : rawId;

  const supabase = createAdminClient();
  const { error } = await supabase.from('events').delete().eq('id', baseId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
