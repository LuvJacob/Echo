# ECHO — Team Development & Git Workflow Plan

## Ownership Breakdown

- **Person A (Frontend & Experience)**:
  - Branch: `feature/frontend-avatar`
  - Scope: `app/page.tsx`, `app/layout.tsx`, `app/globals.css`, `components/avatar/**`, `components/dashboard/**`, `components/inventory/**`, `components/maps/**`, `components/ui/**`.
- **Person B (AI & Backend)**:
  - Branch: `feature/ai-backend`
  - Scope: `app/api/**`, `lib/ai/**`, `lib/inventory/**`, `lib/memory/**`, `lib/storage/**`, `components/voice/**`, data hooks.

## Git Workflow & Branch Strategy

```bash
# 1. Fetch latest base from main:
git switch main
git pull origin main

# 2. Person A switches to frontend branch:
git switch -c feature/frontend-avatar

# 3. Person B switches to backend branch:
git switch -c feature/ai-backend

# 4. Commit and push regularly:
git add .
git commit -m "feat(<scope>): <description>"
git push -u origin <branch-name>
```

## Six-Hour Timeline & Milestones

| Time | Goal | Person A | Person B |
|---|---|---|---|
| **0:00–0:30** | Baseline & Contracts | Review scaffold, verify dev server runs | Add API keys to `.env.local`, test initial LLM call |
| **0:30–1:30** | Visuals & Conversation | Talking avatar animations, HUD polish | Functional `/api/chat` with dynamic inventory prompt |
| **1:30–2:30** | Vision & Inventory | Confirmation modal, photo viewfinder UI | Real `/api/vision` extraction with structured schema |
| **2:30–3:30** | Voice & Integration | Audio reactivity & status binding | Voice STT/TTS or browser speech synthesis |
| **3:30–4:30** | End-to-End Testing | Rehearsal flow: Scan → Confirm → Ask → Recall | Fine-tune tool calling & prompt safeguards |
| **4:30–5:00** | Feature Freeze | UI cleanup, responsive mobile adjustments | Verify zero secret leaks in client bundle |
| **5:00–6:00** | Rehearsal & Deploy | 75-second live demo dry runs | Vercel production deployment & backup recording |
