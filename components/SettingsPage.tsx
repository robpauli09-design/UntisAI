'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { SubjectPreference, Activity } from '@/lib/types';

const API_KEY = process.env.NEXT_PUBLIC_API_SECRET_KEY ?? '';
const h = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` });

const GRADE_LABELS: Record<number, string> = { 1: 'Sehr Gut', 2: 'Gut', 3: 'Befriedigend', 4: 'Genügend', 5: 'Nicht Gen.' };
const ENJOYMENT_LABELS: Record<number, string> = { 1: '😐', 2: '🙂', 3: '😊', 4: '😄', 5: '🤩' };

function RatingSelect({ value, onChange, labels }: { value: number; onChange: (v: number) => void; labels: Record<number, string> }) {
  return (
    <select
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      className="border border-gray-200 rounded-lg px-2 py-1 text-sm text-gray-700 bg-white"
    >
      {[1, 2, 3, 4, 5].map(n => (
        <option key={n} value={n}>{n} – {labels[n]}</option>
      ))}
    </select>
  );
}

export default function SettingsPage() {
  const [prefs, setPrefs] = useState<SubjectPreference[]>([]);
  const [acts, setActs] = useState<Activity[]>([]);
  const [editingPref, setEditingPref] = useState<string | null>(null);
  const [editingAct, setEditingAct] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);

  // New preference form
  const [newPref, setNewPref] = useState({ subject: '', grade: 3, enjoyment: 3, notes: '' });
  const [showNewPref, setShowNewPref] = useState(false);

  // New activity form
  const [newAct, setNewAct] = useState({ name: '', category: '', enjoyment: 3, times_per_week: 2, duration_mins: 60, notes: '' });
  const [showNewAct, setShowNewAct] = useState(false);

  const fetchAll = useCallback(async () => {
    const [pr, ar, pf] = await Promise.all([
      fetch('/api/preferences', { headers: h() }),
      fetch('/api/activities', { headers: h() }),
      fetch('/api/profile', { headers: h() }),
    ]);
    if (pr.ok) setPrefs(await pr.json());
    if (ar.ok) setActs(await ar.json());
    if (pf.ok) { const d = await pf.json(); setProfile(d.notes ?? ''); }
  }, []);

  useEffect(() => {
    fetchAll();
    const handler = () => fetchAll();
    window.addEventListener('schulplaner:refresh', handler);
    return () => window.removeEventListener('schulplaner:refresh', handler);
  }, [fetchAll]);

  // ── Profile ───────────────────────────────────────────────────
  async function saveProfile() {
    const res = await fetch('/api/profile', { method: 'PUT', headers: h(), body: JSON.stringify({ notes: profile }) });
    if (!res.ok) { setError('Fehler beim Speichern'); return; }
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  }

  // ── Preferences ──────────────────────────────────────────────
  async function addPref() {
    if (!newPref.subject.trim()) return;
    const res = await fetch('/api/preferences', {
      method: 'POST', headers: h(),
      body: JSON.stringify({ subject: newPref.subject.trim(), grade: newPref.grade, enjoyment: newPref.enjoyment, notes: newPref.notes || null }),
    });
    if (!res.ok) { setError('Fehler beim Hinzufügen'); return; }
    setNewPref({ subject: '', grade: 3, enjoyment: 3, notes: '' });
    setShowNewPref(false);
    fetchAll();
  }

  async function savePref(pref: SubjectPreference) {
    const res = await fetch('/api/preferences', {
      method: 'PATCH', headers: h(),
      body: JSON.stringify({ id: pref.id, subject: pref.subject, grade: pref.grade, enjoyment: pref.enjoyment, notes: pref.notes }),
    });
    if (!res.ok) { setError('Fehler beim Speichern'); return; }
    setEditingPref(null);
    fetchAll();
  }

  async function deletePref(id: string) {
    await fetch(`/api/preferences?id=${id}`, { method: 'DELETE', headers: h() });
    fetchAll();
  }

  // ── Activities ────────────────────────────────────────────────
  async function addAct() {
    if (!newAct.name.trim() || !newAct.category.trim()) return;
    const res = await fetch('/api/activities', {
      method: 'POST', headers: h(),
      body: JSON.stringify({ name: newAct.name.trim(), category: newAct.category.trim(), enjoyment: newAct.enjoyment, times_per_week: newAct.times_per_week, duration_mins: newAct.duration_mins, notes: newAct.notes || null }),
    });
    if (!res.ok) { setError('Fehler beim Hinzufügen'); return; }
    setNewAct({ name: '', category: '', enjoyment: 3, times_per_week: 2, duration_mins: 60, notes: '' });
    setShowNewAct(false);
    fetchAll();
  }

  async function saveAct(act: Activity) {
    const res = await fetch('/api/activities', {
      method: 'PATCH', headers: h(),
      body: JSON.stringify({ id: act.id, name: act.name, category: act.category, enjoyment: act.enjoyment, times_per_week: act.times_per_week, duration_mins: act.duration_mins, notes: act.notes }),
    });
    if (!res.ok) { setError('Fehler beim Speichern'); return; }
    setEditingAct(null);
    fetchAll();
  }

  async function deleteAct(id: string) {
    await fetch(`/api/activities?id=${id}`, { method: 'DELETE', headers: h() });
    fetchAll();
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] text-gray-900">
      <header className="flex items-center gap-3 px-5 h-14 bg-white border-b border-gray-200">
        <Link
          href="/calendar"
          className="flex items-center justify-center w-8 h-8 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
          title="Zurück zum Kalender"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </Link>
        <h1 className="text-base font-semibold text-gray-800">Einstellungen</h1>
      </header>

      {error && (
        <div className="mx-4 mt-4 px-4 py-2 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200 flex justify-between">
          {error}
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* ── KI-Profil ── */}
      <div className="p-4 max-w-5xl mx-auto">
        <section className="border border-gray-200 rounded-xl p-4">
          <h2 className="font-semibold text-gray-800 mb-1">🧠 KI-Profil</h2>
          <p className="text-xs text-gray-400 mb-3">Was die KI über dich wissen soll — Vorlieben, Ziele, Gewohnheiten, Kontext. Wird bei jeder Chat-Anfrage mitgeschickt.</p>
          <textarea
            value={profile}
            onChange={e => setProfile(e.target.value)}
            placeholder={'Ich bin 17 Jahre alt und besuche die HAK in Tulln. Ich lerne am liebsten abends. Ich mag Sport und bin am Wochenende oft arbeiten...'}
            rows={5}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 resize-none outline-none focus:border-gray-400 transition-colors"
          />
          <div className="flex items-center gap-2 mt-2">
            <button onClick={saveProfile} className="text-xs px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors">
              Speichern
            </button>
            {profileSaved && <span className="text-xs text-green-600">Gespeichert ✓</span>}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 max-w-5xl mx-auto">

        {/* ── Fächer ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800">📚 Fächer</h2>
            <button
              onClick={() => setShowNewPref(v => !v)}
              className="text-xs px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              + Hinzufügen
            </button>
          </div>

          {showNewPref && (
            <div className="mb-3 p-3 border border-gray-200 rounded-xl bg-gray-50 space-y-2">
              <input
                placeholder="Fachname"
                value={newPref.subject}
                onChange={e => setNewPref(v => ({ ...v, subject: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
              />
              <div className="flex gap-2 flex-wrap">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-gray-500">Note</span>
                  <RatingSelect value={newPref.grade} onChange={v => setNewPref(p => ({ ...p, grade: v }))} labels={GRADE_LABELS} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-gray-500">Interesse</span>
                  <RatingSelect value={newPref.enjoyment} onChange={v => setNewPref(p => ({ ...p, enjoyment: v }))} labels={ENJOYMENT_LABELS} />
                </div>
              </div>
              <input
                placeholder="Notizen (optional)"
                value={newPref.notes}
                onChange={e => setNewPref(v => ({ ...v, notes: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
              />
              <div className="flex gap-2">
                <button onClick={addPref} className="text-xs px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-700">Speichern</button>
                <button onClick={() => setShowNewPref(false)} className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-100">Abbrechen</button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {prefs.length === 0 && <p className="text-sm text-gray-400 py-4 text-center">Noch keine Fächer eingetragen.</p>}
            {prefs.map(pref => (
              <div key={pref.id} className="border border-gray-200 rounded-xl p-3">
                {editingPref === pref.id ? (
                  <EditPref pref={pref} onSave={savePref} onCancel={() => setEditingPref(null)} />
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-800 truncate">{pref.subject}</p>
                      <p className="text-xs text-gray-500">Note: {pref.grade} · {GRADE_LABELS[pref.grade]} · Interesse: {ENJOYMENT_LABELS[pref.enjoyment]}</p>
                      {pref.notes && <p className="text-xs text-gray-400 truncate">{pref.notes}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => setEditingPref(pref.id)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-xs">✏️</button>
                      <button onClick={() => deletePref(pref.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors text-xs">🗑️</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── Aktivitäten ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800">🏃 Aktivitäten</h2>
            <button
              onClick={() => setShowNewAct(v => !v)}
              className="text-xs px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              + Hinzufügen
            </button>
          </div>

          {showNewAct && (
            <div className="mb-3 p-3 border border-gray-200 rounded-xl bg-gray-50 space-y-2">
              <div className="flex gap-2">
                <input
                  placeholder="Name"
                  value={newAct.name}
                  onChange={e => setNewAct(v => ({ ...v, name: e.target.value }))}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                />
                <input
                  placeholder="Kategorie"
                  value={newAct.category}
                  onChange={e => setNewAct(v => ({ ...v, category: e.target.value }))}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-gray-500">Spaß</span>
                  <RatingSelect value={newAct.enjoyment} onChange={v => setNewAct(p => ({ ...p, enjoyment: v }))} labels={ENJOYMENT_LABELS} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-gray-500">× pro Woche</span>
                  <input type="number" min={1} max={14} value={newAct.times_per_week}
                    onChange={e => setNewAct(v => ({ ...v, times_per_week: Number(e.target.value) }))}
                    className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-sm" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-gray-500">Minuten</span>
                  <input type="number" min={5} max={480} step={5} value={newAct.duration_mins}
                    onChange={e => setNewAct(v => ({ ...v, duration_mins: Number(e.target.value) }))}
                    className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-sm" />
                </div>
              </div>
              <input
                placeholder="Notizen (optional)"
                value={newAct.notes}
                onChange={e => setNewAct(v => ({ ...v, notes: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
              />
              <div className="flex gap-2">
                <button onClick={addAct} className="text-xs px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-700">Speichern</button>
                <button onClick={() => setShowNewAct(false)} className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-100">Abbrechen</button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {acts.length === 0 && <p className="text-sm text-gray-400 py-4 text-center">Noch keine Aktivitäten eingetragen.</p>}
            {acts.map(act => (
              <div key={act.id} className="border border-gray-200 rounded-xl p-3">
                {editingAct === act.id ? (
                  <EditAct act={act} onSave={saveAct} onCancel={() => setEditingAct(null)} />
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-800 truncate">{act.name} <span className="font-normal text-gray-400">({act.category})</span></p>
                      <p className="text-xs text-gray-500">{act.times_per_week}× / Woche · {act.duration_mins} Min · Spaß: {ENJOYMENT_LABELS[act.enjoyment]}</p>
                      {act.notes && <p className="text-xs text-gray-400 truncate">{act.notes}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => setEditingAct(act.id)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-xs">✏️</button>
                      <button onClick={() => deleteAct(act.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors text-xs">🗑️</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

// ── Inline Edit Forms ─────────────────────────────────────────

function EditPref({ pref, onSave, onCancel }: { pref: SubjectPreference; onSave: (p: SubjectPreference) => void; onCancel: () => void }) {
  const [val, setVal] = useState({ ...pref });
  return (
    <div className="space-y-2">
      <input value={val.subject} onChange={e => setVal(v => ({ ...v, subject: e.target.value }))}
        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
      <div className="flex gap-2 flex-wrap">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">Note</span>
          <select value={val.grade} onChange={e => setVal(v => ({ ...v, grade: Number(e.target.value) }))}
            className="border border-gray-200 rounded-lg px-2 py-1 text-sm">
            {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">Interesse</span>
          <select value={val.enjoyment} onChange={e => setVal(v => ({ ...v, enjoyment: Number(e.target.value) }))}
            className="border border-gray-200 rounded-lg px-2 py-1 text-sm">
            {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>
      <input value={val.notes ?? ''} onChange={e => setVal(v => ({ ...v, notes: e.target.value }))}
        placeholder="Notizen" className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
      <div className="flex gap-2">
        <button onClick={() => onSave(val)} className="text-xs px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-700">Speichern</button>
        <button onClick={onCancel} className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-100">Abbrechen</button>
      </div>
    </div>
  );
}

function EditAct({ act, onSave, onCancel }: { act: Activity; onSave: (a: Activity) => void; onCancel: () => void }) {
  const [val, setVal] = useState({ ...act });
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input value={val.name} onChange={e => setVal(v => ({ ...v, name: e.target.value }))}
          placeholder="Name" className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
        <input value={val.category} onChange={e => setVal(v => ({ ...v, category: e.target.value }))}
          placeholder="Kategorie" className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
      </div>
      <div className="flex gap-2 flex-wrap">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">Spaß</span>
          <select value={val.enjoyment} onChange={e => setVal(v => ({ ...v, enjoyment: Number(e.target.value) }))}
            className="border border-gray-200 rounded-lg px-2 py-1 text-sm">
            {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">× / Woche</span>
          <input type="number" min={1} max={14} value={val.times_per_week}
            onChange={e => setVal(v => ({ ...v, times_per_week: Number(e.target.value) }))}
            className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-sm" />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">Minuten</span>
          <input type="number" min={5} step={5} value={val.duration_mins}
            onChange={e => setVal(v => ({ ...v, duration_mins: Number(e.target.value) }))}
            className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-sm" />
        </div>
      </div>
      <input value={val.notes ?? ''} onChange={e => setVal(v => ({ ...v, notes: e.target.value }))}
        placeholder="Notizen" className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
      <div className="flex gap-2">
        <button onClick={() => onSave(val)} className="text-xs px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-700">Speichern</button>
        <button onClick={onCancel} className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-100">Abbrechen</button>
      </div>
    </div>
  );
}
