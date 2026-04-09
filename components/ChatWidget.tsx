'use client';

import { useState, useRef, useEffect } from 'react';

const API_KEY = process.env.NEXT_PUBLIC_API_SECRET_KEY ?? '';
const h = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` });

type Message = { role: 'user' | 'assistant'; content: string };

const WELCOME: Message = {
  role: 'assistant',
  content: 'Hallo! Ich kann Kalender-Events erstellen, Fächer und Aktivitäten verwalten. Zum Beispiel: „Morgen Lernen von 15–17 Uhr" oder „Mathe Note 3, Interesse 4 hinzufügen".',
};

function getDateRange() {
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 14);
  return { start: fmt(start), end: fmt(end) };
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    setMessages(m => [...m, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);

    try {
      const { start, end } = getDateRange();
      const [pr, ar, ev] = await Promise.all([
        fetch('/api/preferences', { headers: h() }).then(r => r.ok ? r.json() : []),
        fetch('/api/activities', { headers: h() }).then(r => r.ok ? r.json() : []),
        fetch(`/api/events?start=${start}&end=${end}`, { headers: h() }).then(r => r.ok ? r.json() : []),
      ]);

      const history = messages
        .slice(1)
        .slice(-10)
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: h(),
        body: JSON.stringify({ message: text, preferences: pr, activities: ar, events: ev, history }),
      });

      const data = await res.json();
      const reply = data.message ?? (data.error ? `Fehler: ${data.error}` : 'Ich konnte deine Anfrage nicht verarbeiten.');
      setMessages(m => [...m, { role: 'assistant', content: reply }]);

      if (data.actionExecuted) {
        window.dispatchEvent(new CustomEvent('schulplaner:refresh'));
      }
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Verbindungsfehler. Bitte versuche es nochmal.' }]);
    } finally {
      setLoading(false);
    }
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">

      {/* Chat Window */}
      {open && (
        <div
          className="w-80 sm:w-[360px] flex flex-col rounded-2xl shadow-2xl border border-gray-200 overflow-hidden bg-white"
          style={{ height: '500px' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2z"/>
                  <path d="M8 12h8M12 8v8"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800 leading-none">KI-Assistent</p>
                <p className="text-[10px] text-gray-400 mt-0.5">GPT-5</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="flex items-center justify-center w-7 h-7 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-[#f8fafc]">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-sm shadow-sm'
                    : 'bg-white text-gray-800 rounded-bl-sm shadow-sm border border-gray-100'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center shadow-sm">
                  {[0, 1, 2].map(i => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-gray-100 flex gap-2 bg-white">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder="Schreib etwas…"
              disabled={loading}
              className="flex-1 border border-gray-200 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-all disabled:opacity-50 bg-gray-50"
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="flex items-center justify-center w-9 h-9 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 19V5M5 12l7-7 7 7"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-12 h-12 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-500 transition-all hover:scale-105 flex items-center justify-center"
        title="KI-Assistent"
      >
        {open ? (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        ) : (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        )}
      </button>
    </div>
  );
}
