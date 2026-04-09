import { type ChangeEvent, type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import './Chat.css';
import { LivePreview } from './LivePreview.tsx';

export type ChatMessage = {
  id: string | number;
  type: 'user' | 'ai';
  content: string;
  time: Date | number | string;
  imageUrl?: string;
};

export type ChatComposePayload = {
  text: string;
  imageDataUrl?: string;
  media_type?: string;
  imageName?: string;
};

type ChatProps = {
  messages: ChatMessage[];
  onSendMessage?: (payload: ChatComposePayload) => void;
  welcomeText?: string;
  welcomeDescription?: string;
  inputPlaceholder?: string;
  disabled?: boolean;
};

type SelectedImage = {
  dataUrl: string;
  name: string;
  size: number;
  media_type: string;
};

const MAX_IMAGE_SIZE = 500 * 1024;

function formatTime(time: ChatMessage['time']) {
  const date = time instanceof Date ? time : new Date(time);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatFileSize(size: number) {
  return `${(size / 1024).toFixed(0)} KB`;
}

// 提取完整的代码块（```tsx 或 ```jsx 包裹，且已闭合）
function extractJSX(content: string): string | null {
  const match = content.match(/```(?:tsx?|jsx?)\n([\s\S]*?)```/);
  return match ? match[1].trim() : null;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('图片读取失败'));
    };

    reader.onerror = () => reject(new Error('图片读取失败'));
    reader.readAsDataURL(file);
  });
}

export function Chat({
  messages,
  onSendMessage,
  welcomeText = '我是 AI 助手，很高兴见到你。',
  welcomeDescription = '我可以帮你整理思路、回答问题，或继续扩展成真实对话页。',
  inputPlaceholder = '输入消息，按 Enter 发送',
  disabled = false,
}: ChatProps) {
  const [inputMessage, setInputMessage] = useState('');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [uploadError, setUploadError] = useState('');
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const node = messagesRef.current;
    if (!node) {
      return;
    }

    node.scrollTop = node.scrollHeight;
  }, [messages]);

  useEffect(() => {
    const node = messagesRef.current;
    if (!node) {
      return;
    }

    const handleScroll = () => {
      setShowScrollTop(node.scrollTop > 20);
    };

    handleScroll();
    node.addEventListener('scroll', handleScroll);

    return () => {
      node.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const canSend = useMemo(
    () => (inputMessage.trim().length > 0 || selectedImage !== null) && !disabled,
    [disabled, inputMessage, selectedImage],
  );

  const handleSelectImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setSelectedImage(null);
      setUploadError('只能上传图片文件。');
      event.target.value = '';
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setSelectedImage(null);
      setUploadError('图片大小不能超过 500KB。');
      event.target.value = '';
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      console.log(file);
      setSelectedImage({
        dataUrl,
        name: file.name,
        size: file.size,
        media_type: file.type
      });
      setUploadError('');
    } catch (error) {
      setSelectedImage(null);
      setUploadError(error instanceof Error ? error.message : '图片读取失败');
    } finally {
      event.target.value = '';
    }
  };

  const clearSelectedImage = () => {
    setSelectedImage(null);
    setUploadError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const sendMessage = () => {
    const text = inputMessage.trim();
    if (!text && !selectedImage) {
      return;
    }
    onSendMessage?.({
      text,
      imageDataUrl: selectedImage?.dataUrl,
      media_type: selectedImage?.media_type,
      imageName: selectedImage?.name || ''
    });
    setInputMessage('');
    clearSelectedImage();
    setUploadError('');
  };

  const scrollToTop = () => {
    messagesRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToBottom = () => {
    const node = messagesRef.current;
    if (!node) {
      return;
    }

    node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' });
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  return (
    <section className="chat">
      <div className="chat__messages" ref={messagesRef}>
        {messages.length === 0 ? (
          <div className="chat__welcome">
            <div className="chat__welcome-badge">AI</div>
            <h1 className="chat__welcome-title">{welcomeText}</h1>
            <p className="chat__welcome-description">{welcomeDescription}</p>
          </div>
        ) : (
          messages.map((message) => (
            <article
              className={`chat__message chat__message--${message.type}`}
              key={message.id}
            >
              <div className="chat__avatar" aria-hidden="true">
                {message.type === 'user' ? 'U' : 'AI'}
              </div>
              <div className="chat__bubble">
                {message.imageUrl ? (
                  <img
                    alt="用户上传内容"
                    className="chat__message-image"
                    src={message.imageUrl}
                  />
                ) : null}
                {message.content ? (() => {
                    const jsx = message.type === 'ai' ? extractJSX(message.content) : null;
                    return jsx
                      ? <LivePreview code={jsx} />
                      : <p className="chat__text">{message.content}</p>;
                  })() : null}
                <time className="chat__time">{formatTime(message.time)}</time>
              </div>
            </article>
          ))
        )}
      </div>

      <button
        className="chat__scroll-button"
        onClick={showScrollTop ? scrollToTop : scrollToBottom}
        type="button"
      >
        {showScrollTop ? '↑' : '↓'}
      </button>

      <div className="chat__input-area">
        {selectedImage ? (
          <div className="chat__upload-preview">
            <img
              alt={selectedImage.name}
              className="chat__preview-image"
              src={selectedImage.dataUrl}
            />
            <div className="chat__preview-meta">
              <strong className="chat__preview-name">{selectedImage.name}</strong>
              <span className="chat__preview-size">{formatFileSize(selectedImage.size)}</span>
            </div>
            <button
              className="chat__remove-image"
              disabled={disabled}
              onClick={clearSelectedImage}
              type="button"
            >
              移除
            </button>
          </div>
        ) : null}

        <textarea
          className="chat__input"
          disabled={disabled}
          onChange={(event) => setInputMessage(event.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder={inputPlaceholder}
          rows={4}
          value={inputMessage}
        />

        <div className="chat__actions">
          <input
            accept="image/*"
            className="chat__file-input"
            disabled={disabled}
            onChange={handleSelectImage}
            ref={fileInputRef}
            type="file"
          />
          <button
            className="chat__upload-button"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
            type="button"
          >
            上传图片
          </button>
          <span className="chat__hint">支持图片，大小不超过 500KB</span>
          <button
            className="chat__send-button"
            disabled={!canSend}
            onClick={sendMessage}
            type="button"
          >
            发送
          </button>
        </div>

        {uploadError ? <p className="chat__error">{uploadError}</p> : null}
      </div>
    </section>
  );
}
