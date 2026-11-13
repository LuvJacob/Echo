import { ChatMessage, EchoAction, InventoryItem } from '@/types/echo';
import { ECHO_SYSTEM_PROMPT, buildInventoryContext } from './prompts';

export interface AiChatParams {
  message: string;
  history?: ChatMessage[];
  inventory?: InventoryItem[];
}

export interface AiChatResult {
  reply: string;
  speechText: string;
  proposedAction?: EchoAction;
}

/**
 * AI Service Client wrapper
 * Dispatches to OpenAI / Gemini if API keys are set, otherwise falls back to deterministic mock logic.
 */
export async function generateChatResponse(params: AiChatParams): Promise<AiChatResult> {
  const { message, inventory = [] } = params;
  const lower = message.toLowerCase();

  // Check if real provider keys are available
  const openaiKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (openaiKey || geminiKey) {
    // Person B will complete full LLM invocation here
    // For scaffolding, this ensures clean contract execution
  }

  // --- Scaffolding & Mock Logic ---
  // 1. Water check query
  if (lower.includes('how much water') || lower.includes('water supply') || lower.includes('check water')) {
    const waterItems = inventory.filter((i) => i.category === 'water');
    const totalWater = waterItems.reduce((acc, curr) => acc + curr.quantity, 0);
    const text = totalWater > 0
      ? `Tactical scan indicates you have ${totalWater} water units logged in current stores.`
      : 'No water reserves detected in current inventory. Prioritize immediate procurement.';
    return {
      reply: text,
      speechText: text,
    };
  }

  // 2. Inventory modification query (e.g., "Add 3 water bottles")
  if (lower.includes('add') && (lower.includes('water') || lower.includes('bottle'))) {
    return {
      reply: 'Detected request to log water reserves. Proposing addition of 3 Water Bottles (500ml) to inventory. Awaiting confirmation.',
      speechText: 'I have logged three water bottles. Please confirm to commit to inventory.',
      proposedAction: {
        type: 'inventory_update',
        operation: 'add',
        item: {
          name: 'Purified Water Bottle (500ml)',
          category: 'water',
          quantity: 3,
          unit: 'bottles',
          source: 'voice_prompt',
        },
        reason: 'User voice command logged during survival check',
        confidence: 0.95,
      },
    };
  }

  // Default response
  const defaultReply = `ECHO online. All systems nominal. Inventory tracking ${inventory.length} item categories. How can I assist your mission?`;
  return {
    reply: defaultReply,
    speechText: 'ECHO online. All systems nominal. How can I assist your mission?',
  };
}
