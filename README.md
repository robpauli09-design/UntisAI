<div align="center">

# UntisAI

**Dein persönlicher KI-Schulplaner — powered by WebUntis**

Stundenplan automatisch synchronisieren, Termine per Chat verwalten und deinen Schulalltag intelligent organisieren.

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/robpauli09-design/UntisAI)

</div>

---

## Was ist UntisAI?

UntisAI verbindet deinen WebUntis-Stundenplan mit einem KI-Assistenten. Statt manuell Termine einzutragen sagst du einfach: *"Füge Freitag um 14 Uhr Nachhilfe ein"* — und der KI-Assistent erledigt den Rest.

Du hostest die App selbst auf Vercel (kostenlos) — deine Daten bleiben in deiner eigenen Datenbank.

## Features

- **WebUntis Sync** — Stundenplan der nächsten 4 Wochen mit einem Klick laden
- **KI-Assistent** — Termine, Fächer und Aktivitäten per Chat verwalten
- **Wochenkalender** — Schule, Prüfungen, Sport und Freizeit übersichtlich auf einen Blick
- **Wiederkehrende Termine** — z.B. jede Woche Training automatisch eintragen
- **Fächer & Noten** — Interessen und Noten tracken für bessere KI-Vorschläge
- **Mobile-freundlich** — zwischen Wochen wischen auf dem Handy
- **Self-hosted** — deine Daten, deine Kontrolle

---

## Schnellstart

> Fertig in ca. 10 Minuten. Du brauchst: WebUntis-Zugangsdaten, ein kostenloses Supabase-Konto und einen OpenAI API Key.

### 1. Supabase Datenbank einrichten

1. Erstelle ein kostenloses Projekt auf [supabase.com](https://supabase.com)
2. Öffne den **SQL Editor** und führe folgenden Code aus:

```sql
create table events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  date date not null,
  start_time time not null,
  end_time time not null,
  type text not null default 'other',
  source text not null default 'manual',
  color text,
  recurrence text,
  recurrence_end date,
  created_at timestamptz default now()
);

create table subject_preferences (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  enjoyment integer not null default 3,
  grade integer not null default 3,
  notes text,
  updated_at timestamptz default now()
);

create table activities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  enjoyment integer not null default 3,
  times_per_week integer not null default 1,
  duration_mins integer not null default 60,
  notes text,
  updated_at timestamptz default now()
);

create table user_profile (
  id integer primary key default 1,
  notes text
);

insert into user_profile (id, notes) values (1, '');
```

3. Gehe zu **Project Settings → API** und kopiere:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **service_role** Key → `SUPABASE_SERVICE_ROLE_KEY`

### 2. Auf Vercel deployen

1. Klicke auf **[Deploy with Vercel](https://vercel.com/new/clone?repository-url=https://github.com/robpauli09-design/UntisAI)**
2. Vercel verbindet sich automatisch mit deinem GitHub
3. Trage unter **Environment Variables** folgende Werte ein:

```env
NEXT_PUBLIC_SUPABASE_URL        = https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY       = eyJhbGc...

API_SECRET_KEY                  = (generieren: openssl rand -hex 32)
NEXT_PUBLIC_API_SECRET_KEY      = (gleicher Wert wie API_SECRET_KEY)

WEBUNTIS_SCHOOL                 = deine-schule
WEBUNTIS_SERVER                 = herakles.webuntis.com
WEBUNTIS_USERNAME               = dein-benutzername
WEBUNTIS_PASSWORD               = dein-passwort

OPENAI_API_KEY                  = sk-...
```

4. Klicke auf **Deploy** — fertig.

> **WebUntis Server finden:** Öffne WebUntis im Browser. Die URL sieht so aus: `https://herakles.webuntis.com/...` → der Server ist `herakles.webuntis.com`

> **API_SECRET_KEY:** Öffne ein Terminal und führe `openssl rand -hex 32` aus. Den Output als Wert verwenden — beide `API_SECRET_KEY` Variablen müssen denselben Wert haben.

---

## Lokal entwickeln

> Auch lokal brauchst du Supabase als Datenbank — die App speichert alle Daten dort. Verwende einfach dasselbe Supabase-Projekt das du oben eingerichtet hast, du brauchst kein zweites.

```bash
git clone https://github.com/robpauli09-design/UntisAI.git
cd UntisAI
npm install
cp .env.example .env.local
# .env.local mit deinen Werten befüllen (gleiche Werte wie bei Vercel)
npm run dev
```

App läuft auf [http://localhost:3000](http://localhost:3000)

---

## Was ist Vercel?

[Vercel](https://vercel.com) ist ein kostenloser Hosting-Dienst für Web-Apps. Du lädst deinen Code dort hoch und Vercel macht ihn unter einer öffentlichen URL erreichbar — von jedem Gerät, auch am Handy.

**Warum Vercel?**
- Komplett kostenlos für private Projekte
- Kein eigener Server nötig
- Bei jedem `git push` wird die App automatisch neu deployed
- HTTPS inklusive

---

## Verwendung

### Stundenplan synchronisieren
Klicke auf den **Sync**-Button oben rechts. Der Stundenplan der nächsten 4 Wochen wird automatisch aus WebUntis geladen.

### KI-Assistent
Öffne den Chat unten rechts. Beispiele was du fragen kannst:

- *"Was habe ich morgen in der Schule?"*
- *"Füge Donnerstag um 16 Uhr Gitarrenstunde ein"*
- *"Trage jeden Montag von 17–19 Uhr Fußballtraining ein"*
- *"Wann habe ich nächste Woche Mathematik?"*
- *"Plane mir eine Lerneinheit für die Prüfung am Freitag"*

### Navigation
- **Desktop:** Pfeiltasten oben links
- **Mobil:** Links/rechts wischen

---

## Umgebungsvariablen Übersicht

| Variable | Beschreibung |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL deines Supabase Projekts |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key (nicht der Anon Key!) |
| `API_SECRET_KEY` | Zufälliger Schlüssel zum Schutz der API |
| `NEXT_PUBLIC_API_SECRET_KEY` | Gleicher Wert wie `API_SECRET_KEY` |
| `WEBUNTIS_SCHOOL` | Schulname in WebUntis |
| `WEBUNTIS_SERVER` | WebUntis Server deiner Schule |
| `WEBUNTIS_USERNAME` | Dein WebUntis Benutzername |
| `WEBUNTIS_PASSWORD` | Dein WebUntis Passwort |
| `OPENAI_API_KEY` | OpenAI API Key für den KI-Assistenten |

---

## Tech Stack

| | |
|---|---|
| Framework | [Next.js 14](https://nextjs.org) (App Router) |
| Sprache | [TypeScript](https://www.typescriptlang.org) |
| Datenbank | [Supabase](https://supabase.com) (PostgreSQL) |
| Styling | [Tailwind CSS](https://tailwindcss.com) |
| WebUntis | [webuntis](https://github.com/SchoolUtils/WebUntis) npm package |
| KI | [OpenAI GPT](https://platform.openai.com) |
| Hosting | [Vercel](https://vercel.com) |

---

## Lizenz

MIT — siehe [LICENSE](LICENSE)

> Dieses Projekt nutzt die inoffizielle WebUntis API. Die Nutzung erfolgt auf eigene Verantwortung. UntisAI ist nicht mit der Untis GmbH verbunden oder von ihr unterstützt.
