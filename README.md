# ECHO — AI Tactical Survival Companion

**HackPerimeter 2026 · Escape From Earth · Mobile-First Web Application**

> An onboard AI survival companion that can hear, speak, see, remember, and help survivors track and verify critical resources in post-collapse and emergency scenarios.

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18+ (Node 20+ LTS recommended)
- npm / pnpm / yarn

### 2. Installation & Setup
```bash
# Clone the repository
git clone https://github.com/LuvJacob/Echo.git
cd Echo

# Install dependencies
npm install

# Setup local environment variables
cp .env.example .env.local

# Run the local development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the ECHO command center.

---

## 🛠️ Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript (Strict Mode)
- **Styling:** Tailwind CSS (Custom Cyberpunk / Sci-Fi HUD theme)
- **Icons:** Lucide React
- **Animation:** Motion (Framer Motion)
- **State & Persistence:** Typed Browser LocalStorage adapter
- **AI Integrations:** OpenAI / Gemini / Multimodal Vision via server-side Next.js route handlers

---

## 📁 Repository Structure

```text
echo/
├── app/
│   ├── layout.tsx             # Root layout & HUD viewport configuration
│   ├── page.tsx               # Primary tactical dashboard & avatar stage
│   ├── globals.css            # Cyberpunk theme, scanlines & visual effects
│   └── api/
│       ├── chat/route.ts      # LLM conversation & action proposal endpoint
│       ├── vision/route.ts    # Multimodal image analysis endpoint
│       └── voice/route.ts     # Speech synthesis & audio processing endpoint
├── components/
│   ├── avatar/                # Holographic animated avatar with status states
│   ├── dashboard/             # Status header, telemetry & quick action triggers
│   ├── inventory/             # Manifest table, authorization modal, photo scanner
│   ├── voice/                 # Voice capture button & microphone controls
│   ├── maps/                  # Tactical GPS beacon & hazard reporting
│   └── ui/                    # Reusable HUD primitives (Card, Button, Badge)
├── hooks/                     # Custom React hooks (useInventory, useEchoChat)
├── lib/
│   ├── ai/                    # AI prompt engineering, client adapters
│   ├── inventory/             # Inventory service logic & state mutations
│   ├── memory/                # Location bookmarking & tactical memory
│   ├── storage/               # Type-safe localStorage persistence adapter
│   └── utils/                 # Utility functions (cn, formatters, id generators)
├── types/
│   └── echo.ts                # Single Source of Truth shared contracts
├── public/
│   ├── avatars/               # Avatar assets
│   ├── icons/                 # Custom HUD icons
│   └── audio/                 # Audio fixtures & sound effects
├── docs/                      # Architectural docs & development guides
├── .env.example               # Template environment configuration
├── .gitignore                 # Standard Next.js gitignore
├── README.md                  # Project overview & documentation
└── package.json               # Dependencies & scripts
```

---

## 👥 Team Ownership & Workflow

| Role | Developer | Branch | Scope |
|---|---|---|---|
| **Person A** | Frontend & UI (IBM Bob / Codex) | `feature/frontend-avatar` | `app/page.tsx`, `components/avatar/**`, `components/dashboard/**`, `components/inventory/**`, `components/maps/**`, UI & animations |
| **Person B** | AI & Backend (Claude Max) | `feature/ai-backend` | `app/api/**`, `lib/ai/**`, `lib/inventory/**`, `lib/memory/**`, `lib/storage/**`, `components/voice/**`, hooks |
| **Shared** | Joint Contract | `main` | `types/echo.ts` (Frozen contract - modify only with consensus) |

### Branch Commands

```bash
# Person A:
git switch main && git pull origin main
git switch -c feature/frontend-avatar

# Person B:
git switch main && git pull origin main
git switch -c feature/ai-backend
```

---

## 🔒 Verification & Quality Gates

Run these commands before committing or submitting:

```bash
# Typecheck
npm run typecheck

# Production Build
npm run build
```

---

## 🎯 75-Second Live Demo Scenario

1. **Awaken Avatar:** ECHO initializes with animated holographic face and vocal greeting.
2. **Check Supplies:** Survivor asks: *"How much water do I have?"* ECHO answers from persisted inventory.
3. **Scan Supplies:** Survivor opens photo scanner and submits water bottle photo.
4. **Authorise Mutation:** ECHO proposes `+3 Water Bottles`; survivor clicks **Authorize & Commit**.
5. **Verify Persistence:** Page refreshed; inventory visibly persists and ECHO confirms new reserve count.
6. **Geo Bookmark:** Save current coordinates as supply cache.
