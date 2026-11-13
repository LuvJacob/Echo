import type { ChatMessage, EchoAction, InventoryItem } from '@/types/echo';
import { ECHO_SYSTEM_PROMPT } from './prompts';
import { ECHO_TOOLS, parseToolArgs, runGetInventory } from './tools';
import { DEFAULT_LOCATION, fetchWeather, type GeoPoint } from './weather';
import { MODELS, createResponse, getOpenAIKey, outputText, type ResponseOutputItem } from './openai';

export interface AiChatParams {
  message: string;
  history?: ChatMessage[];
  inventory?: InventoryItem[];
  location?: { latitude: number; longitude: number };
}

export interface AiChatResult {
  reply: string;
  speechText: string;
  proposedAction?: EchoAction;
  /** Names of tools the model called (for debugging / tests). */
  toolCalls: string[];
  mock: boolean;
}

/** Server-side chat turn. Uses OpenAI + get_inventory tool when a key is set, else a labelled mock. */
export async function generateChatResponse(params: AiChatParams): Promise<AiChatResult> {
  const inventory = params.inventory ?? [];
  if (!getOpenAIKey()) return mockChat(params.message, inventory);

  const history = (params.history ?? [])
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .slice(-10)
    .map((m) => ({ role: m.role, content: m.content }));
  // History from the client may already end with this user message.
  const last = history[history.length - 1];
  const input: unknown[] =
    last && last.role === 'user' && last.content === params.message
      ? history
      : [...history, { role: 'user', content: params.message }];

  const toolCalls: string[] = [];
  const tools = ECHO_TOOLS.map((t) => ({ ...t, strict: true }));

  for (let round = 0; round < 3; round++) {
    const resp = await createResponse({
      model: MODELS.chat,
      instructions: ECHO_SYSTEM_PROMPT,
      input,
      tools,
      max_output_tokens: 300,
    });
    const calls = resp.output.filter((o): o is ResponseOutputItem & { call_id: string } => o.type === 'function_call' && !!o.call_id);
    if (calls.length === 0) {
      const reply = outputText(resp).trim() || 'Signal unclear. Say again?';
      return { reply, speechText: reply, toolCalls, mock: false };
    }
    input.push(...resp.output);
    for (const c of calls) {
      toolCalls.push(c.name ?? 'unknown');
      const output =
        c.name === 'get_inventory'
          ? runGetInventory(inventory, parseToolArgs(c.arguments))
          : c.name === 'get_weather'
            ? await fetchWeather(toGeo(params.location))
            : { error: 'unknown tool' };
      input.push({ type: 'function_call_output', call_id: c.call_id, output: JSON.stringify(output) });
    }
  }
  const reply = 'Inventory lookup timed out. Try again.';
  return { reply, speechText: reply, toolCalls, mock: false };
}

function toGeo(l?: { latitude: number; longitude: number }): GeoPoint {
  return l && Number.isFinite(l.latitude) && Number.isFinite(l.longitude)
    ? { latitude: l.latitude, longitude: l.longitude, label: "the survivor's current location" }
    : DEFAULT_LOCATION;
}

/** Deterministic offline replies. Still answers from the real persisted snapshot via the same tool. */
function mockChat(message: string, inventory: InventoryItem[]): AiChatResult {
  const lower = message.toLowerCase();
  const wantsSupplies = /(water|suppl|inventory|how much|how many|bottle|food|where)/.test(lower);
  if (!wantsSupplies) {
    const reply = '[offline mode] ECHO online. Scan supplies or ask about your water.';
    return { reply, speechText: reply.replace('[offline mode] ', ''), toolCalls: [], mock: true };
  }
  const inv = runGetInventory(inventory, { category: null });
  const water = inv.items.filter((i) => i.category === 'water');
  let reply: string;
  if (water.length === 0) {
    reply = 'No water is logged yet. Scan your supplies and confirm them to add some.';
  } else {
    const places = [...new Set(water.map((w) => w.location).filter(Boolean))];
    const where = places.length ? ` in ${places.join(' and ')}` : '';
    const bad = inv.totals.unsafe_water_containers;
    reply = `You have ${inv.totals.water_spoken}${where}.` + (bad ? ` ${bad} flagged do not drink.` : '');
  }
  return { reply: `[offline mode] ${reply}`, speechText: reply, toolCalls: ['get_inventory'], mock: true };
}
