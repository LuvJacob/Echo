'use client';

import { useState, useCallback, useEffect } from 'react';
import { ChatMessage, ChatApiResponse, AvatarStatus, EchoAction, InventoryItem } from '@/types/echo';
import { generateId } from '@/lib/utils';
import { EchoStorage } from '@/lib/storage/localStorage';
import { InventoryService } from '@/lib/inventory/service';

const GREETING = (): ChatMessage => ({
  id: generateId('msg'),
  role: 'assistant',
  content: 'ECHO Tactical AI initialized. Systems nominal. Ready for commands.',
  speechText: 'ECHO Tactical AI initialized. Systems nominal.',
  timestamp: Date.now(),
});

export function useEchoChat(inventorySnapshot: InventoryItem[] = []) {
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING()]);

  // Load persisted history after mount to avoid hydration mismatch.
  useEffect(() => {
    const saved = EchoStorage.getChatHistory();
    if (saved.length > 0) setMessages(saved);
  }, []);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [avatarStatus, setAvatarStatus] = useState<AvatarStatus>('idle');
  const [pendingAction, setPendingAction] = useState<EchoAction | null>(null);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const userMsg: ChatMessage = {
        id: generateId('msg'),
        role: 'user',
        content: text.trim(),
        timestamp: Date.now(),
      };

      const newHistory = [...messages, userMsg];
      setMessages(newHistory);
      EchoStorage.saveChatHistory(newHistory);

      setIsLoading(true);
      setError(null);
      setAvatarStatus('thinking');

      // Prefer a fresh read of the persisted store over the (possibly stale) prop.
      let snapshot: InventoryItem[] = inventorySnapshot;
      try {
        snapshot = InventoryService.list();
      } catch {
        /* fall back to prop */
      }

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            history: newHistory,
            inventorySnapshot: snapshot,
          }),
        });

        const data: ChatApiResponse = await res.json();

        if (data.success) {
          const assistantMsg: ChatMessage = {
            id: generateId('msg'),
            role: 'assistant',
            content: data.reply,
            speechText: data.speechText,
            timestamp: Date.now(),
            proposedAction: data.proposedAction,
          };

          const finalHistory = [...newHistory, assistantMsg];
          setMessages(finalHistory);
          EchoStorage.saveChatHistory(finalHistory);

          if (data.proposedAction) {
            setPendingAction(data.proposedAction);
          }

          setAvatarStatus(data.avatarStatus || 'speaking');
          setTimeout(() => setAvatarStatus('idle'), 3500);
        } else {
          throw new Error(data.error || 'Failed to process response');
        }
      } catch (err) {
        console.error('[useEchoChat] Chat request failed', err);
        setError(err instanceof Error ? err.message : 'Chat request failed');
        setAvatarStatus('error');
        setTimeout(() => setAvatarStatus('idle'), 3000);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading, inventorySnapshot]
  );

  const clearPendingAction = useCallback(() => {
    setPendingAction(null);
  }, []);

  return {
    messages,
    isLoading,
    avatarStatus,
    setAvatarStatus,
    pendingAction,
    sendMessage,
    clearPendingAction,
    error,
  };
}
