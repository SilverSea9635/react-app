import { useState } from 'react';
import { type ChatComposePayload, type ChatMessage } from '@/components/Chat/Chat.tsx';

const CHAT_SYSTEM_PROMPT = `你是一个简洁、准确的中文 AI 助手。
当用户要求生成 React 组件时，请严格使用以下格式，组件必须命名为 Component，不要使用 export：
\`\`\`tsx
function Component() {
  return <div>...</div>;
}
\`\`\``;
const CHAT_MODEL = '';
const DEFAULT_IMAGE_PROMPT = 'please describe the content of the image';

type ChatRequestContentItem =
  | {
  type: string,
  source: {
    type: string,
    media_type?: string
    data: string
  }
}
  | {
  type: 'text';
  text: string;
};

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const sendMessage = async ({ text, imageDataUrl, media_type }: ChatComposePayload) => {
    const now = Date.now();
    const normalizedText = text.trim();
    const promptText = normalizedText || DEFAULT_IMAGE_PROMPT;
    const userMessage: ChatMessage = {
      id: now,
      type: 'user',
      content: normalizedText,
      imageUrl: imageDataUrl,
      time: now,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsSending(true);

    const commaIndex = imageDataUrl?.indexOf(',');
    if (commaIndex !== -1) {
      imageDataUrl && (imageDataUrl = imageDataUrl.substring(commaIndex ? commaIndex + 1 : 0));
    }

    const multimodalContent: ChatRequestContentItem[] | undefined = imageDataUrl
      ? [
        { type: 'image', source: { type: 'base64', media_type, data: imageDataUrl } },
        { type: 'text', text: promptText },
      ]
      : undefined;

    const aiMsgId = now + 1;
    setMessages((prev) => [...prev, { id: aiMsgId, type: 'ai', content: '', time: Date.now() }]);

    try {
      const response = await fetch('http://127.0.0.1:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: multimodalContent ?? promptText,
          conversationId,
          system: CHAT_SYSTEM_PROMPT,
          model: CHAT_MODEL || undefined,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`请求失败：${response.status} ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (line.startsWith('event: ')) continue;
          if (!line.startsWith('data: ')) continue;

          const json = line.slice(6);
          let parsed: Record<string, unknown>;
          try {
            parsed = JSON.parse(json);
          } catch {
            continue;
          }

          if ('text' in parsed && typeof parsed.text === 'string') {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiMsgId ? { ...m, content: m.content + parsed.text } : m,
              ),
            );
          } else if ('conversationId' in parsed && typeof parsed.conversationId === 'string') {
            setConversationId(parsed.conversationId);
          }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '请求失败，请稍后重试。';
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsgId ? { ...m, content: `请求失败：${errorMessage}` } : m,
        ),
      );
    } finally {
      setIsSending(false);
    }
  };

  return { messages, isSending, sendMessage };
}