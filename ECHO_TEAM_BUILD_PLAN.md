# ECHO — Two-Person Six-Hour Build Plan

## Ownership

**Person A — You (IBM Bob + Codex):** Own the UI, avatar, responsive dashboard, animation, status visualization, inventory cards, photo-upload presentation and overall integration. Files: `app/page.tsx`, `app/layout.tsx`, `app/globals.css`, `components/avatar/**`, `components/dashboard/**`, `components/inventory/**`, optional `components/maps/**`.

**Person B — Teammate (Claude Max):** Own voice capture/playback, AI routes, image recognition and strict JSON schemas, inventory mutations and persistence, and optional memory/location. Files: `app/api/**`, `components/voice/**`, `lib/ai/**`, `lib/inventory/**`, `lib/memory/**`, `lib/storage/**`, AI/data hooks.

**Shared interface owner:** Agree on `types/echo.ts`, route JSON and inventory update semantics at minute 0–20. Afterward only change via explicit coordination.

## Hour-by-hour parallel plan

| Window | Person A (UI / Bob) | Person B (AI / Claude) | Gate |
|---|---|---|---|
| 0:00–0:30 | Run Bob scaffold prompt, commit and publish shared base; agree API/type contracts | Review contracts, configure AI credentials, verify one model request works | App boots, both branches are based on one commit |
| 0:30–1:30 | Original holographic face, avatar status states, animated command center | Functional `/api/chat` and text request/response | Show fake speaking animation and real AI text reply |
| 1:30–2:30 | Inventory cards, photo-upload flow UI, confirmation modal | `/api/vision` with a fixed JSON schema; inventory service/persistence | Photo → candidate items; manually confirm → data changes |
| 2:30–3:30 | React to listening/speaking status, finish responsive mobile layout | Microphone speech-to-text and spoken response; typed fallback | End-to-end live photo inventory loop |
| 3:30–4:30 | Integrate API and avatar with Person B; strengthen visual polish | Fix data/tool execution and recall inventory from history/state | Demo interaction works without hardcoded counters |
| 4:30–5:00 | Fix layouts and loading/error states; optional location card | Optional saved location or better voice latency; no new core dependencies | Freeze features, deploy |
| 5:00–6:00 | Full joint integration, demo script, QA, screenshots, backup plan | Full joint integration, test in demo browser, key security | Two clean 75-second dry runs |

## Integration rules

- Frontend accepts typed backend responses; backend never returns only unstructured prose when an action is required.
- Model-generated inventory changes are **proposals**, not automatic mutations.
- When speech fails, type input + browser speech synthesis remains available.
- Avatar must animate even if a 3D/lip-sync SDK fails (simple mouth-open animation tied to audio state).
- Avoid cross-branch edits and last-minute dependency churn.
- Commit frequently and integrate once at halfway point, once at feature freeze.

## Hard stop / cutlines

- **By 1:00:** if 3D avatar or lip-sync asset doesn't reliably render, use original SVG/CSS avatar with reactive mouth animation.
- **By 2:30:** if realtime speech provider isn't functional, switch to browser-based speech recognition when supported or typed-input + browser TTS.
- **By 3:30:** if image AI is failing, use a tested upload fixture and focus on live inventory persistence; don't fake detection without labeling it.
- **After 4:30:** add no new major feature. Fix the core user flow and rehearse.

## Priority order

1. Cinematic talking avatar + working conversation.
2. Photo recognition → confirm → persistent inventory update.
3. Accurate recall from inventory in subsequent AI response.
4. Optional location bookmarking.
5. Optional map, social interactions, advanced visuals.

## Git commands

```bash
# Once Bob has pushed the base scaffold to main:
git switch main
git pull --ff-only
git switch -c feature/frontend-avatar  # Person A
# Teammate in own clone: git switch -c feature/ai-backend

# Each person pushes their branch:
git add . && git commit -m "feat: <scope>" && git push -u origin <branch>

# Use pull requests to merge into main after build checks.
```
