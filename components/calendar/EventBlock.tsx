'use client';
import { CalendarEvent, TYPE_COLORS } from '@/lib/types';

interface Props {
  event: CalendarEvent;
  topPct: string;
  heightPct: string;
  leftPct?: string;
  widthPct?: string;
  onClick: () => void;
}

export default function EventBlock({ event, topPct, heightPct, leftPct = '0%', widthPct = '100%', onClick }: Props) {
  const color = event.color ?? TYPE_COLORS[event.type] ?? '#6B7280';
  return (
    <button
      onClick={onClick}
      title={event.title}
      className="absolute text-left overflow-hidden transition-all z-10 rounded-md hover:brightness-95 hover:shadow-sm"
      style={{
        top: topPct,
        height: heightPct,
        left: `calc(${leftPct} + 2px)`,
        width: `calc(${widthPct} - 4px)`,
        backgroundColor: color + '18',
        borderLeft: `3px solid ${color}`,
        padding: '2px 5px',
      }}
    >
      <span className="font-semibold block truncate text-[11px] leading-tight" style={{ color }}>
        {event.title}
      </span>
      <span className="text-[10px] leading-tight" style={{ color: color + 'bb' }}>
        {event.start_time.slice(0,5)}–{event.end_time.slice(0,5)}
      </span>
    </button>
  );
}
