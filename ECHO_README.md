# ECHO — AI Survival Companion

**HackPerimeter 2026 · Escape From Earth · Mobile-first web app**

> An AI companion that can hear, speak, see, remember, and help people organize survival supplies during fictional apocalypse scenarios and real-world emergency preparedness.

## Product

ECHO is a voice-first, sci-fi-inspired assistant with an animated, reactive holographic face. Its centerpiece is one complete interaction: **speak to ECHO → show it supplies → review AI recognition → confirm inventory changes → ask ECHO to recall them**. An attractive interface matters, but the inventory actions must genuinely persist.

### Six-hour demo scope (P0)

- Responsive, futuristic dashboard and central avatar with `idle`, `listening`, `thinking`, `speaking`, and `error` states.
- Microphone-based input with typed-input fallback; spoken replies with audio-reactive mouth movement or a clearly labeled animation fallback.
- AI chat with a consistent survival-companion personality.
- Upload or camera-select a photo of water bottles/canned goods; model returns structured candidate items and uncertainty notes.
- User **confirms** a proposed inventory update before saving it.
- Inventory survives refresh, is visible in the UI, and can be retrieved through a subsequent chat turn.
- A reliable, rehearsed 60–90-second demo. No API keys exposed to browsers.

### Stretch scope (P1)

- Remember a user-named location and retrieve it later; optional map with seeded, clearly marked **fictional** threat reports.
- Water and food reserve estimates based on explicit assumptions.
- Companion mode for encouragement or a short original story.
- Better lip-sync rig/visemes, PWA installation, and responsive desktop showcase.

### Not part of the six-hour MVP (P2)

- Verified real-time hazard feeds, offline AI, automatic background location tracking, medical diagnosis, water-contamination detection, native iOS/Android releases, multiplayer, and autonomous emergency routing.

## Suggested stack

- **Next.js App Router, React, TypeScript, Tailwind CSS** for the application.
- **Motion** and SVG/CSS/canvas or a tested talking-avatar library for the avatar. Keep a lightweight animated face as fallback.
- **Provider AI API in server routes** for chat, tool calling, and image understanding. Provider is chosen after checking available keys and fastest successful proof of concept.
- **Browser voice capture / speech synthesis** as fallback if realtime speech is slow to integrate.
- **localStorage behind a typed storage adapter** for hackathon persistence; consider Supabase only when essential.
- **Vercel** for hosting.

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. Populate `.env.local` with the chosen provider's secret key. Never commit `.env.local` or put secrets in `NEXT_PUBLIC_*` variables.

Before pushing or presenting:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

The exact available scripts and environment variable names will be finalized by the repository scaffold.

## Intended structure

```text
app/
  page.tsx             # Person A: experience and assembly
  layout.tsx           # Person A
  globals.css          # Person A
  api/                 # Person B: server-side chat, vision, optional voice
components/
  avatar/              # Person A
  dashboard/           # Person A
  inventory/           # Person A
  maps/                # Person A, stretch only
  voice/               # Person B
  ui/                  # shared generated/base primitives
hooks/                 # place hook near its owner
lib/
  ai/                  # Person B
  inventory/           # Person B
  memory/              # Person B
  storage/             # Person B
  utils/               # shared pure helpers
types/echo.ts          # frozen contracts after kickoff
public/avatars/        # original/licensed assets
public/icons/
public/audio/
docs/
```

## Shared contracts (agree before parallel coding)

| Contract | Input | Output / behavior |
|---|---|---|
| `POST /api/chat` | message, optional history and relevant inventory snapshot | assistant reply, structured proposed action(s), optional speech text |
| `POST /api/vision` | photo via multipart/form-data or validated encoded image | proposed items, quantities, uncertainty notes, visual concerns |
| `InventoryService.add()` | confirmed item(s) | updated persistent inventory |
| `InventoryService.list()` | none | current inventory |
| `Avatar` | status, optional speech/amplitude state | consistently rendered assistant states |

**Single source of truth:** `types/echo.ts`. AI may propose actions, but client/storage layer validates and executes **only after user confirmation**. The backend returns structured JSON; the frontend never parses arbitrary assistant prose to update data.

## Working agreement

1. Scaffold on `main`, commit once, then create two branches from that commit.
2. Person A: `feature/frontend-avatar`; Person B: `feature/ai-backend`.
3. Avoid editing each other's directories. Coordinate contract changes before merging.
4. Integrate at the **midpoint** rather than at the end. Each owner exposes testable mock states and stable API shapes.
5. Reserve the final 60–90 minutes for integration, demo rehearsal, and fixing regressions.

## Live demo (target 75 seconds)

1. ECHO wakes up with an animated avatar and speaks a greeting.
2. User: “How much water do I have?” ECHO replies from stored inventory.
3. Upload a photo showing three water bottles. ECHO proposes `+3 water bottles` and asks for confirmation.
4. User confirms; inventory visibly changes and survives reload.
5. User asks again; ECHO correctly reports the new quantity.
6. If ready, save a location and recall it, or show a friendly companion response.

### Demo safeguards

- Have a prerecorded/photo fixture and typed-input fallback ready if the room is loud or microphone permissions fail.
- If using green-colored water, ECHO may flag **unusual visible color** and recommend testing; it must **not** state that the photo proves contamination or that clear water is safe.
- Demo hazards are fictional unless backed by a verified, timestamped source. Never claim routes are guaranteed safe.
- Label illustrative resource estimates and assumptions. No claim of production-grade emergency response readiness.

## Team

| Owner | Main responsibility | Tooling |
|---|---|---|
| Person A | Avatar, visual experience, dashboard, inventory presentation, assembly | IBM Bob, Codex |
| Person B | Voice input/output, AI chat, image analysis, action validation, persistence | Claude Max |

## Definition of done

- [ ] Application builds and deploys successfully.
- [ ] Central avatar visibly reacts to speaking and listening.
- [ ] Voice conversation works **or** typed/speech fallback works predictably.
- [ ] Image produces a structured inventory proposal.
- [ ] User confirmation changes stored inventory, not just a visual counter.
- [ ] Conversation can report persisted inventory correctly after refresh.
- [ ] No secrets in client bundles, source control, or screenshots.
- [ ] Safety limitations are represented accurately.
- [ ] 60–90-second demo works twice consecutively.

**Project goal:** Deliver one unforgettable, demonstrably real interaction—not a long list of disconnected prototype features.
