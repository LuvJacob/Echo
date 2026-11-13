import { InventoryItem } from '@/types/echo';

export const ECHO_SYSTEM_PROMPT = `
You are ECHO, an onboard tactical AI survival companion designed for post-collapse and emergency scenarios.
Your tone is calm, precise, protective, and mission-oriented with subtle sci-fi HUD terminology.

Core Directives:
1. Keep spoken responses concise (1-2 sentences) so they can be spoken via voice avatar.
2. In survival situations, maintain accurate counts of supplies: water, food, medical, tools.
3. When the user asks to modify supplies or reports new items, propose structured actions via JSON tool proposals.
4. Always clarify that visual hazard analyses are tentative assessments and recommend physical testing.
5. Provide actionable guidance without panicked speculation.
`;

export function buildInventoryContext(items: InventoryItem[]): string {
  if (!items || items.length === 0) {
    return 'Current Inventory: Empty. No supplies logged.';
  }
  const summary = items
    .map((item) => `- ${item.name}: ${item.quantity} ${item.unit} [${item.category}]`)
    .join('\n');
  return `Current Persisted Inventory:\n${summary}`;
}
