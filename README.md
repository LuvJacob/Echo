# ECHO: AI Survival Companion

**HackPerimeter 2026 ▲ Escape From Earth**

> *Earth is finished. You are not.* You're the last one left, with no crew and no signal, just the supplies you can carry. **ECHO** is a voice-first AI companion that **hears** you, **speaks** back, **sees** your supplies through the camera, and **remembers** what you have.

---

## What ECHO does

| | Feature | How it works |
|---|---|---|
| 🎙️ | **Talk to ECHO** | Hold the mic and speak. ECHO answers out loud in real time, and its holographic face moves with its actual voice. It greets you by name, answers general questions and gives **live weather** for your location. |
| 📷 | **Live supply scan** | Hold an item up to the camera; no photo needed. ECHO locks on (two matching frames), logs the item **once**, says *"Canned food added to rations"*, then starts a 10-second countdown so nothing is double-counted. Items are sorted into **Water**, **Rations** and **Medical supplies**. |
| 🚱 | **Water safety check** | Any tint (especially red), cloudiness or particles → **DO NOT DRINK** in big red letters plus an urgent spoken warning. Clear water → *test before drinking*. Clear and confirmed factory-sealed (by voice) → *good for drinking*. When unsure, ECHO flags it. |
| ❓ | **Asks instead of guessing** | If ECHO can't tell what an item is, it asks *"What is this item?"*, opens the mic automatically, and adds whatever you say. |
| 🧠 | **Remembers** | Inventory survives reloads and new sessions. Ask *"How much water do I have?"* and ECHO answers with container counts from saved data, e.g. *"3 water bottles and 1 gallon jug of water, plus 1 flagged do not drink."* |
| 🖼️ | **Photo scan** | Take or upload a photo for a reviewable proposal: edit the name, quantity or location, then confirm or reject. Nothing is saved without confirmation. |

Hazard and radiation alerts in this demo are **simulated** and labelled as such.

---

## Quick start

```bash
git clone https://github.com/LuvJacob/Echo.git
cd Echo
npm install
cp .env.example .env.local      # then add your key: OPENAI_API_KEY=sk-...
npm run dev                      # open http://localhost:3000
```

- **Clean demo:** open `http://localhost:3000/?reset` to clear the inventory, saved name and history in this browser.
- **Permissions:** allow microphone, camera and (optionally) location. Weather falls back to Clarkston, GA if location is denied.
- **Without a key**, chat and photo scan run in a clearly labelled offline mode. Live voice and live scan need the key.

### Checks

```bash
npm run typecheck   # TypeScript strict
npm test            # 40 automated tests (node:test + tsx)
npm run build       # production build
```

---

## Tech stack

| Layer | Tools |
|---|---|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Framer Motion, Lucide icons |
| **Voice** | OpenAI `gpt-realtime` over **WebRTC** (push-to-talk, plus hands-free answers with server voice detection); `gpt-4o-mini-transcribe` and `gpt-4o-mini-tts` as a fallback pipeline |
| **Vision** | OpenAI `gpt-4.1-mini` with **strict JSON-schema** outputs, validated again at runtime before anything is shown |
| **AI tools** | `get_inventory`, `get_weather` (Open-Meteo, no key), `set_water_sealed`, `add_scanned_item`, `set_user_name` |
| **Data** | Browser storage behind a typed store: verified writes, receipts after save, idempotent confirms |
| **Device APIs** | MediaDevices (camera, mic), Geolocation, Web Audio (mouth-sync amplitude) |
| **Tooling** | GitHub PR workflow, `node:test` + `tsx`, built with Claude Code, Codex and IBM Bob |

## How it works

```text
Browser (mic, camera, avatar)
   │  push-to-talk audio / camera frames
   ▼
Next.js API routes ── holds OPENAI_API_KEY, issues short-lived Realtime tokens
   │
   ▼
OpenAI (realtime voice + vision) ──► tool calls ──► inventory, weather, sealed check, "what is this?"
   │                                                    │
   ◄──────────── spoken reply (WebRTC audio) ◄──────────┘
   ▼
ECHO speaks; the avatar's mouth follows the real output audio
```

**Safety and correctness choices**
- The API key never reaches the browser, which only gets a short-lived Realtime token.
- AI output is untrusted: strict schemas plus runtime validation, and malformed output is rejected, never guessed.
- Water is reported as **container counts**, never litres. Counts are computed in code, and the AI only reads them out.
- Photos are not stored. Changes from photo review only save after you confirm, and are never applied twice.

## API routes

| Route | Purpose |
|---|---|
| `POST /api/realtime/session` | Mint an ephemeral Realtime client secret (voice session config + tools) |
| `POST /api/vision/live` | One camera frame → recognised items (water, canned food, other food, bandages, first aid, unknown) |
| `POST /api/vision` | Photo → validated, editable inventory proposal |
| `POST /api/chat` | Typed/fallback chat turn with the same tools |
| `POST /api/voice` | Fallback speech-to-text and text-to-speech (supports an urgent tone) |

## Project structure

```text
app/               page, layout, API routes (chat, vision, vision/live, voice, realtime/session)
components/        avatar, dashboard, inventory (scanner, manifest), voice (push-to-talk), maps
hooks/             useEchoVoice, useLiveScan, useSupplyScan, useInventory, useCameraCapture
lib/ai/            prompts, tools, OpenAI client, vision schemas, weather
lib/inventory/     canonical store, live-scan rules, water-safety rules, voice Q&A
lib/memory/        user profile (name + greetings), locations
types/echo.ts      shared contracts
tests/             40 automated tests
docs/              architecture, API contracts, Person B handoff
```

## Team

| | Role |
|---|---|
| **Jacob** (Person A) | UI, holographic avatar, HUD dashboard, inventory and map presentation |
| **James Afon** (Person B) | Voice, AI routes, vision, inventory persistence, water-safety logic, tests |

*Winners are survivors.*
