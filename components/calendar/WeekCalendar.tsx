'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { CalendarEvent, TYPE_COLORS } from '@/lib/types';
import EventBlock from './EventBlock';
import EventModal from './EventModal';
import SyncButton from './SyncButton';

const HOUR_START   = 6;
const HOUR_END     = 22;
const PX_PER_HOUR  = 64;
const PX_PER_MIN   = PX_PER_HOUR / 60;
const GRID_HEIGHT  = (HOUR_END - HOUR_START) * PX_PER_HOUR;
const DAY_LABELS   = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

function getMondayOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

function fmtTime(t: string): string {
  const [h, m] = t.split(':');
  return `${h}:${m}`;
}

function topPx(startTime: string): string {
  const mins = toMinutes(startTime) - HOUR_START * 60;
  return `${Math.max(0, mins) * PX_PER_MIN}px`;
}

function heightPx(startTime: string, endTime: string): string {
  const dur = toMinutes(endTime) - toMinutes(startTime);
  return `${Math.max(15, dur) * PX_PER_MIN}px`;
}

const HOUR_LABELS = Array.from(
  { length: HOUR_END - HOUR_START + 1 },
  (_, i) => `${String(HOUR_START + i).padStart(2, '0')}:00`
);

const HOUR_COUNT = HOUR_END - HOUR_START;

const API_KEY = process.env.NEXT_PUBLIC_API_SECRET_KEY ?? '';
const authHeader = () => ({ Authorization: `Bearer ${API_KEY}` });

export default function WeekCalendar() {
  const [monday, setMonday]     = useState<Date>(() => getMondayOfWeek(new Date()));
  const [events, setEvents]     = useState<CalendarEvent[]>([]);
  const [loading, setLoading]   = useState(false);
  const [selected, setSelected] = useState<CalendarEvent | null>(null);

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const start = toDateStr(weekDates[0]);
    const end   = toDateStr(weekDates[6]);
    try {
      const res = await fetch(`/api/events?start=${start}&end=${end}`, { headers: authHeader() });
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monday]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  useEffect(() => {
    window.addEventListener('schulplaner:refresh', fetchEvents);
    return () => window.removeEventListener('schulplaner:refresh', fetchEvents);
  }, [fetchEvents]);

  const goWeek = (n: number) => setMonday(prev => {
    const d = new Date(prev);
    d.setDate(d.getDate() + n * 7);
    return d;
  });

  // Touch swipe
  const touchStartX = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) goWeek(dx < 0 ? 1 : -1);
    touchStartX.current = null;
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/events?id=${id}`, { method: 'DELETE', headers: authHeader() });
    setSelected(null);
    fetchEvents();
  };

  const todayStr = toDateStr(new Date());

  return (
    <div className="flex flex-col bg-[#f8fafc]" style={{ height: 'calc(100vh - 56px)' }}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 shrink-0 bg-white">
        {/* Navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => goWeek(-1)}
            className="flex items-center justify-center w-8 h-8 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <button
            onClick={() => goWeek(1)}
            className="flex items-center justify-center w-8 h-8 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </div>

        <button
          onClick={() => setMonday(getMondayOfWeek(new Date()))}
          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Heute
        </button>

        <span className="text-sm font-medium text-gray-700 ml-1">
          {weekDates[0].toLocaleDateString('de-AT', { day: '2-digit', month: 'short' })} –{' '}
          {weekDates[6].toLocaleDateString('de-AT', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>

        <div className="ml-auto flex items-center gap-2">
          {/* Legend */}
          <div className="hidden sm:flex items-center gap-3 mr-2">
            {(Object.entries({
              school: 'Schule', exam: 'Prüfung', study: 'Lernen', sport: 'Sport', free: 'Freizeit',
            }) as [keyof typeof TYPE_COLORS, string][]).map(([type, label]) => (
              <span key={type} className="flex items-center gap-1 text-[11px] text-gray-400">
                <span className="inline-block w-2 h-2 rounded-full" style={{ background: TYPE_COLORS[type] }} />
                {label}
              </span>
            ))}
          </div>
          {loading && <span className="text-xs text-gray-400 animate-pulse">Laden…</span>}
          <SyncButton onSynced={fetchEvents} />
        </div>
      </div>

      {/* Calendar grid */}
      <div
        className="flex flex-1 overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Single scrollable container for time axis + events */}
        <div className="flex flex-1 overflow-y-auto">

          {/* Time axis */}
          <div className="w-14 shrink-0 border-r border-gray-200 bg-white">
            {/* Spacer matching day header height */}
            <div className="h-12 sticky top-0 bg-white border-b border-gray-200 z-10" />
            <div className="relative" style={{ height: GRID_HEIGHT }}>
              {HOUR_LABELS.map((label, i) => (
                <div
                  key={label}
                  className="absolute right-2 text-[10px] text-gray-400 -translate-y-1/2"
                  style={{ top: `${i * PX_PER_HOUR}px` }}
                >
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Day columns */}
          <div className="flex flex-1">
          {weekDates.map((date, idx) => {
            const dateStr   = toDateStr(date);
            const dayEvents = events.filter(e => e.date === dateStr);
            const isToday   = dateStr === todayStr;
            const isWeekend = idx >= 5;

            return (
              <div key={dateStr} className="flex-1 flex flex-col border-r border-gray-200 last:border-r-0 min-w-0">
                {/* Day header - sticky */}
                <div className={`flex flex-col items-center justify-center border-b border-gray-200 shrink-0 sticky top-0 z-20 h-12 gap-0.5 ${isToday ? 'bg-white' : isWeekend ? 'bg-gray-50/80' : 'bg-white'}`}>
                  <span className={`text-[10px] font-semibold uppercase tracking-wider ${isToday ? 'text-blue-600' : 'text-gray-400'}`}>
                    {DAY_LABELS[idx]}
                  </span>
                  <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : 'text-gray-700'}`}>
                    {date.getDate()}
                  </span>
                </div>
                {/* Events */}
                <div className={`relative ${isWeekend ? 'bg-gray-50/60' : 'bg-white'}`} style={{ height: GRID_HEIGHT }}>
                  {Array.from({ length: HOUR_COUNT }).map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-full border-t border-gray-100"
                      style={{ top: `${i * PX_PER_HOUR}px` }}
                    />
                  ))}
                  {(() => {
                    // Aufeinaderfolgende Events mit gleichem Titel zusammenführen
                    const sorted = [...dayEvents].sort((a, b) =>
                      toMinutes(fmtTime(a.start_time)) - toMinutes(fmtTime(b.start_time))
                    );
                    const merged: CalendarEvent[] = [];
                    const skip = new Set<string>();
                    for (let i = 0; i < sorted.length; i++) {
                      if (skip.has(sorted[i].id)) continue;
                      let current = { ...sorted[i] };
                      // Solange der nächste Event den gleichen Titel hat und direkt anschließt, zusammenführen
                      for (let j = i + 1; j < sorted.length; j++) {
                        const next = sorted[j];
                        if (skip.has(next.id)) continue;
                        if (next.title === current.title &&
                            toMinutes(fmtTime(next.start_time)) - toMinutes(fmtTime(current.end_time)) <= 15) {
                          current = { ...current, end_time: next.end_time };
                          skip.add(next.id);
                        }
                      }
                      merged.push(current);
                    }

                    // Overlap-Layout: überlappende Events nebeneinander
                    type Layout = { event: CalendarEvent; col: number; totalCols: number };
                    const layout: Layout[] = [];
                    for (const event of merged) {
                      const s = toMinutes(fmtTime(event.start_time));
                      const e = toMinutes(fmtTime(event.end_time));
                      const overlapping = layout.filter(l => {
                        const ls = toMinutes(fmtTime(l.event.start_time));
                        const le = toMinutes(fmtTime(l.event.end_time));
                        return s < le && e > ls;
                      });
                      const takenCols = overlapping.map(l => l.col);
                      let col = 0;
                      while (takenCols.includes(col)) col++;
                      const totalCols = overlapping.length + 1;
                      layout.push({ event, col, totalCols });
                      overlapping.forEach(l => { l.totalCols = Math.max(l.totalCols, totalCols); });
                    }

                    return layout.map(({ event, col, totalCols }) => (
                      <EventBlock
                        key={event.id}
                        event={event}
                        topPct={topPx(fmtTime(event.start_time))}
                        heightPct={heightPx(fmtTime(event.start_time), fmtTime(event.end_time))}
                        leftPct={`${(col / totalCols) * 100}%`}
                        widthPct={`${(1 / totalCols) * 100}%`}
                        onClick={() => setSelected(event)}
                      />
                    ));
                  })()}
                </div>
              </div>
            );
          })}
          </div>
        </div>
      </div>

      {selected && (
        <EventModal event={selected} onClose={() => setSelected(null)} onDelete={handleDelete} />
      )}
    </div>
  );
}
