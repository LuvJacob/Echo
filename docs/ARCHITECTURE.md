# ECHO — Architecture & System Design

## Architecture Overview

```mermaid
graph TD
    User([Survivor / User]) -->|Voice / Camera / Text| App[Next.js App Router Client]
    
    subgraph Frontend [Person A: Frontend & UI]
        App --> Avatar[Avatar Visualizer Component]
        App --> InventoryUI[Inventory & Manifest UI]
        App --> ConfirmModal[Action Authorization Modal]
        App --> GeoUI[Geo-Beacon Coordinates]
    end

    subgraph Backend_AI [Person B: API & AI Engine]
        App -->|POST /api/chat| ChatAPI[Chat Route]
        App -->|POST /api/vision| VisionAPI[Vision Route]
        App -->|POST /api/voice| VoiceAPI[Voice Route]
        ChatAPI --> LLM[(OpenAI / Gemini LLM)]
        VisionAPI --> VLM[(Multimodal Vision LLM)]
    end

    subgraph Storage [Persistent State Layer]
        ConfirmModal -->|User Confirmed Mutation| LocalStore[(Browser LocalStorage Adapter)]
        LocalStore --> InventoryService[InventoryService]
        InventoryService --> InventoryUI
    end
```

## Module Ownership & Boundary Isolation

| Domain | Responsible Developer | Key Files / Directories |
|---|---|---|
| **Frontend Visual Experience** | Person A | `app/page.tsx`, `app/layout.tsx`, `app/globals.css`, `components/avatar/`, `components/dashboard/`, `components/inventory/`, `components/maps/`, `components/ui/` |
| **Backend AI & State Services** | Person B | `app/api/**`, `lib/ai/**`, `lib/inventory/**`, `lib/memory/**`, `lib/storage/**`, `components/voice/`, `hooks/` |
| **Shared Contracts** | Person A & B (Joint) | `types/echo.ts` |
