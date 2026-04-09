'use client';
import { useState } from 'react';

interface Props {
  onSynced: () => void;
}

export default function SyncButton({ onSynced }: Props) {
  const [status, setStatus] = useState<'idle' | 'syncing' | 'ok' | 'error'>('idle');

  const handleSync = async () => {
    setStatus('syncing');
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET_KEY ?? ''}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatus('ok');
      onSynced();
      setTimeout(() => setStatus('idle'), 3000);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 4000);
    }
  };

  const config = {
    idle:    { label: 'Sync',            cls: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900' },
    syncing: { label: 'Lädt…',           cls: 'text-gray-400 cursor-wait' },
    ok:      { label: 'Synchronisiert',  cls: 'text-green-600' },
    error:   { label: 'Fehler',          cls: 'text-red-600' },
  };
  const { label, cls } = config[status];

  return (
    <button
      onClick={handleSync}
      disabled={status === 'syncing'}
      title="WebUntis synchronisieren"
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${cls}`}
    >
      <svg className={`w-3.5 h-3.5 ${status === 'syncing' ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 12a9 9 0 0 0-9-9 9 9 0 0 0-6.36 2.64L3 8" />
        <path d="M3 3v5h5" />
        <path d="M3 12a9 9 0 0 0 9 9 9 9 0 0 0 6.36-2.64L21 16" />
        <path d="M16 16h5v5" />
      </svg>
      {label}
    </button>
  );
}
