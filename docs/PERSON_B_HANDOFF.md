# Person B → Person A handoff (voice, AI, scan, inventory)

Test bench: run `npm run dev` and open **`/dev/voice`**. It exercises every hook below with no styling. Copy what you need into the real UI.

Setup: `.env.local` needs `OPENAI_API_KEY=sk-...`. Without the key, chat and scan run in a clearly labelled offline mode (`mock: true`, `[offline mode]` replies).

## 1. Voice: `hooks/useEchoVoice.ts`

```ts
const voice = useEchoVoice({ mode: 'auto', onCaption: (c) => {/* mirror final captions into your feed */} });

voice.status        // 'disconnected'|'connecting'|'ready'|'listening'|'thinking'|'speaking'|'error'
voice.avatarStatus  // AvatarStatus: pass straight to <AvatarVisualizer status=…/>
voice.amplitude     // 0..1 from real output audio (~30fps): pass to <AvatarVisualizer amplitude=…/> for the jaw
voice.getAmplitude()// same value without re-render, for your own rAF loop
voice.captions      // Caption[] { id, role:'user'|'assistant', text, final, at }; partials stream in live
voice.error         // EchoError | null  { code, message }; message is safe to show
voice.mode          // 'realtime' | 'pipeline' (automatic fallback)
voice.playbackStream / voice.audioElement  // raw audio source if you want your own analyser

voice.startTalking() / voice.stopTalking()   // push-to-talk (press / release)
voice.sendText(text)                          // typed input, same conversation
voice.connect() / voice.disconnect()          // connect is called automatically on first talk/send
voice.notify(text, { respond })               // give ECHO context (e.g. after a scan)
voice.resumePlayback()                        // call from a tap when error.code === 'playback_failed'
voice.clearError()
```

Drop-in button: `<VoiceInputButton voice={voice} />`. The old props (`onTranscript`, `status`) still work; in that mode the button only transcribes, and you speak the reply yourself.

**Replaces `useSpeechAudio`:** ECHO's own voice drives `amplitude`. Don't also call `speechSynthesis`, or you'll get two voices.

Error codes to handle in UI: `mic_denied` (show "allow mic / type instead"), `mic_unavailable`, `playback_failed` (show an "Enable audio" button → `resumePlayback()`), `connection_failed`, `provider_error`, `no_api_key`.

## 2. Photo scan: `hooks/useSupplyScan.ts`

```ts
const inv = useInventory();
const scan = useSupplyScan({ confirmProposal: inv.confirmProposal, onConfirmed: (receipt) => {} });

scan.scanPhoto(file)            // File | Blob | dataURL; downscaled to 1280px client-side
scan.status                     // 'idle'|'scanning'|'review'|'saving'|'saved'|'error'
scan.proposal                   // InventoryProposal | null; render the review UI while non-null
scan.proposal.items[i]          // ProposedItem: name, category, quantity, unit,
                                //   unitVolumeMl|null, fillLevel|null, location|null,   ← null = UNKNOWN, user fills in
                                //   observations[], drinkability:'undetermined', confidence
scan.updateItem(i, patch)       // edit name/quantity/unitVolumeMl/fillLevel/location/...
scan.removeItem(i)
scan.confirm()                  // → EchoResult<InventoryReceipt>; idempotent, double-tap safe
scan.reject()                   // inventory untouched
scan.receipt                    // set ONLY after the write succeeded
scan.error                      // EchoError; on save failure the proposal is kept so the user can retry
scan.mock / scan.previewUrl
```

Keep showing the review form when `status === 'error' && proposal`, so a failed save can be retried.

⚠️ `PhotoUploadModal`'s preset buttons send `data:image/jpeg;base64,mock_<id>`. `/api/vision` now rejects non-images (400). Use a real image or switch the modal to `useSupplyScan`.

## 3. Inventory: `hooks/useInventory.ts`

Same fields as before (`items, summary, isLoaded, refresh, addItem, applyAction`), plus:
`totals` (`waterLiters`, `waterContainers`, `waterContainersUnknownVolume`, `totalItems`, computed in TS), `confirmProposal`, `error`, `clearError`.

- It no longer auto-seeds on an empty store, so the demo starts at 0 L. `seedDemoSupplies()` has no water.
- `summary.waterSupplyLiters` now comes from confirmed volume × fill level (unknown volume → not counted).
- Failed writes set `error` instead of failing silently.

## 4. Demo path (verified with real OpenAI)

Scan → set 3 × 500 mL, **full**, location **locker seven** → Confirm → reload → ask "How much water do I have?" → ECHO calls `get_inventory` and says **"1.5 liters … locker seven"**.

## Shared contract changes (`types/echo.ts`, additive only)

- `InventoryItem`: optional `unitVolumeMl`, `fillLevel`, `location`, `observations`
- `InventoryUpdateAction`: optional `proposalId`
- `VisionApiResponse`: optional `proposal`, `errorCode`, `mock`
- New types: `FillLevel`, `ProposedItem`, `InventoryProposal`, `InventoryReceipt`, `InventoryTotals`, `EchoError`, `EchoErrorCode`, `EchoResult`

## Routes

`POST /api/realtime/session` (ephemeral token) · `POST /api/chat` · `POST /api/vision` · `POST /api/voice` (multipart audio → text, or JSON text → mp3). The API key is server-only, and none was found in the client bundle.
