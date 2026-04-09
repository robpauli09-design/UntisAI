'use client';
import { CalendarEvent, TYPE_COLORS } from '@/lib/types';

interface Props {
  event: CalendarEvent;
  onClose: () => void;
  onDelete: (id: string) => Promise<void>;
}

const TYPE_LABELS: Record<string, string> = {
  school: 'Schule', exam: 'Prüfung', study: 'Lernen',
  sport: 'Sport', free: 'Freizeit', other: 'Sonstiges',
};
const SOURCE_LABELS: Record<string, string> = {
  webuntis: 'WebUntis', ai: 'KI', manual: 'Manuell',
};
const RECURRENCE_LABELS: Record<string, string> = {
  weekly: 'Wöchentlich',
  biweekly: 'Zweiwöchentlich',
};

export default function EventModal({ event, onClose, onDelete }: Props) {
  const color = event.color ?? TYPE_COLORS[event.type];
  const isRecurring = !!event.recurrence;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-[340px] shadow-2xl border border-gray-100 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Color bar */}
        <div className="h-1.5 w-full" style={{ background: color }} />

        <div className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{ background: color + '18', color }}
              >
                {TYPE_LABELS[event.type]}
              </span>
              {isRecurring && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                  {RECURRENCE_LABELS[event.recurrence!]}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-7 h-7 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <h2 className="text-gray-900 font-bold text-[15px] mb-1 leading-snug">{event.title}</h2>

          <div className="flex items-center gap-1.5 text-gray-500 text-sm mb-1">
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            {event.date}
          </div>
          <div className="flex items-center gap-1.5 text-gray-500 text-sm mb-3">
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" />
            </svg>
            {event.start_time.slice(0,5)} – {event.end_time.slice(0,5)}
            {event.recurrence_end && <span className="ml-2 text-gray-400 text-xs">bis {event.recurrence_end}</span>}
          </div>

          {event.description && (
            <p className="text-gray-600 text-sm whitespace-pre-wrap mb-3 leading-relaxed">{event.description}</p>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <span className="text-xs text-gray-400">{SOURCE_LABELS[event.source]}</span>
            {event.source !== 'webuntis' && (
              <button
                onClick={() => onDelete(event.id)}
                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                </svg>
                {isRecurring ? 'Alle Termine löschen' : 'Löschen'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
