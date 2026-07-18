import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useChatStore } from './useChatStore';

export function useChat() {
  const {
    activeMissionId,
    currentModel,
    appendMessage,
    updateLastMessage,
    appendActivity,
    setIsStreaming,
    setActiveMissionId,
    prompt,
    setPrompt,
    attachments,
    clearAttachments,
  } = useChatStore();

  const queryClient = useQueryClient();
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async () => {
    const text = prompt.trim();
    if (!text && attachments.length === 0) return;

    // Cancel any ongoing stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setPrompt('');
    const currentAttachments = [...attachments];
    clearAttachments();

    // If there's an attachment but no text, we should probably add a default text 
    const finalContent = text || "Check out these files.";
    
    appendMessage({ role: 'user', content: finalContent, attachments: currentAttachments });
    appendMessage({ role: 'assistant', content: '', isStreaming: true });
    setIsStreaming(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch('/api/web/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: finalContent,
          missionId: activeMissionId,
          modelName: currentModel,
          attachmentsBase64: currentAttachments,
        }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('event: missionId')) continue;
          if (line.startsWith('event: end')) {
            // Refresh conversation history
            queryClient.invalidateQueries({ queryKey: ['history'] });
          }
          if (line.startsWith('event: error')) {
            continue;
          }
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            if (!jsonStr || jsonStr === '{}') continue;
            try {
              const parsed = JSON.parse(jsonStr);
              if (parsed.error) {
                updateLastMessage(`⚠️ Error: ${parsed.error}`);
                break;
              }
              if (parsed.missionId && !activeMissionId) {
                setActiveMissionId(parsed.missionId);
              }
              if (parsed.token) {
                accumulated += parsed.token;
                updateLastMessage(accumulated);
              } else if (parsed.type === 'tool') {
                appendActivity(parsed);
              }
            } catch {
              // Incomplete JSON chunk — skip
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      updateLastMessage('⚠️ Connection lost. Please check your connection and try again.');
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [prompt, attachments, activeMissionId, currentModel, appendMessage, updateLastMessage, appendActivity, setIsStreaming, setPrompt, clearAttachments, setActiveMissionId, queryClient]);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  }, [setIsStreaming]);

  return { sendMessage, stopGeneration };
}
