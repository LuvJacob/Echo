# ECHO — API & Shared Contract Specification

> **Single Source of Truth:** `types/echo.ts`

---

## 1. POST /api/chat

Processes natural language messages, maintains conversation context with live inventory state, and returns structured AI action proposals.

### Request Body (`ChatApiRequest`)

```json
{
  "message": "I found 3 bottles of water",
  "history": [
    { "id": "msg_1", "role": "user", "content": "How much water do I have?", "timestamp": 1700000000000 },
    { "id": "msg_2", "role": "assistant", "content": "You have 2 water bottles.", "timestamp": 1700000001000 }
  ],
  "inventorySnapshot": [
    {
      "id": "item_1",
      "name": "Purified Water Bottle (500ml)",
      "category": "water",
      "quantity": 2,
      "unit": "bottles",
      "source": "system_seed",
      "updatedAt": 1700000000000
    }
  ]
}
```

### Response Body (`ChatApiResponse`)

```json
{
  "success": true,
  "reply": "I have detected 3 water bottles. Proposing inventory update.",
  "speechText": "I have logged three water bottles. Please confirm to commit.",
  "avatarStatus": "speaking",
  "proposedAction": {
    "type": "inventory_update",
    "operation": "add",
    "item": {
      "name": "Purified Water Bottle (500ml)",
      "category": "water",
      "quantity": 3,
      "unit": "bottles",
      "source": "voice_prompt"
    },
    "reason": "Voice command detected",
    "confidence": 0.95
  }
}
```

---

## 2. POST /api/vision

Accepts captured or uploaded image data, performs multimodal optical recognition of survival assets, and proposes additions with uncertainty notes.

### Request Body (`VisionApiRequest`)

```json
{
  "image": "data:image/jpeg;base64,...",
  "prompt": "Identify survival supplies and estimate quantities",
  "inventorySnapshot": []
}
```

### Response Body (`VisionApiResponse`)

```json
{
  "success": true,
  "result": {
    "detectedObjects": [
      {
        "name": "Purified Water Bottle (500ml)",
        "category": "water",
        "quantity": 3,
        "unit": "bottles",
        "confidence": 0.94,
        "notes": "Sealed plastic bottles."
      }
    ],
    "rawDescription": "Visual scan identified 3 standard water bottles.",
    "uncertaintyNotes": [
      "Fluids cannot be certified potable by optical scan alone."
    ],
    "safetyConcerns": [],
    "suggestedAction": {
      "type": "inventory_update",
      "operation": "add",
      "item": {
        "name": "Purified Water Bottle (500ml)",
        "category": "water",
        "quantity": 3,
        "unit": "bottles",
        "source": "vision_scan"
      }
    },
    "processedAt": 1700000000000
  },
  "proposedAction": {
    "type": "inventory_update",
    "operation": "add",
    "item": {
      "name": "Purified Water Bottle (500ml)",
      "category": "water",
      "quantity": 3,
      "unit": "bottles",
      "source": "vision_scan"
    }
  }
}
```

---

## 3. POST /api/voice

Optional / stretch endpoint for audio transcription (STT) or server-side speech synthesis (TTS).

### Request Body (`VoiceApiRequest`)

```json
{
  "audioData": "base64_audio_blob...",
  "textToSpeak": "Tactical scan indicates 5 water bottles remaining.",
  "action": "synthesize"
}
```

---

## 4. Human-In-The-Loop Confirmation Rule

- AI routes can propose actions (`proposedAction`).
- The frontend UI displays `ActionConfirmModal`.
- Data is **only committed to localStorage/persistence upon explicit user confirmation**.
