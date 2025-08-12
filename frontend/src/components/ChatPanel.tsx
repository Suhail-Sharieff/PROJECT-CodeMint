import { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare } from 'lucide-react';

type Message = {
  id: string | number;
  userName: string;
  message: string;
  role?: string;
  timestamp?: number | string;
};

type ChatPanelProps = {
  socket: any;
  messages: Message[];
  currentUser: string;
};

const SCROLL_THRESHOLD = 1; // px

const ChatPanel: React.FC<ChatPanelProps> = ({ socket, messages, currentUser }) => {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [isAtBottom, setIsAtBottom] = useState(true);
  const prevLenRef = useRef<number>(messages.length);
  const [unseenCount, setUnseenCount] = useState(0);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const atBottom = scrollHeight - scrollTop <= clientHeight + SCROLL_THRESHOLD;
    setIsAtBottom(atBottom);
    if (atBottom) setUnseenCount(0);
  };

  // Scroll helper: perform after next paint to ensure DOM is updated
  const scrollToBottom = (behavior: 'auto' | 'smooth' = 'auto') => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior });
    });
  };

  useEffect(() => {
    const prevLen = prevLenRef.current;
    const newLen = messages.length;
    const lastMsg = messages[newLen - 1];

    const lastIsMine = !!lastMsg && lastMsg.userName === currentUser;

    // If user is at bottom or they sent the message, scroll to bottom.
    // Use instant scroll for user's own messages (avoids hiding), smooth for others.
    if (isAtBottom || lastIsMine) {
      scrollToBottom(lastIsMine ? 'auto' : 'smooth');
      setUnseenCount(0);
    } else if (newLen > prevLen) {
      // new messages arrived while not at bottom
      setUnseenCount((c) => c + (newLen - prevLen));
    }

    prevLenRef.current = newLen;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, isAtBottom, currentUser]);

  const sendMessage = () => {
    if (newMessage.trim() && socket) {
      socket.emit('chat-message', { message: newMessage.trim() });
      setNewMessage('');
      // keep focus for quick typing
      // inputRef.current?.focus();
      // optimistic scroll to bottom so sender sees their msg immediately
      // (server will append it shortly via props)
      scrollToBottom('auto');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-64 border-t border-gray-200">
      <div className="p-3 bg-gray-50 border-b border-gray-200">
        <h4 className="font-medium text-gray-800 flex items-center">
          <MessageSquare className="w-4 h-4 mr-2" />
          Live Chat
        </h4>
      </div>

      <div
        className="flex-1 overflow-y-auto p-3 space-y-2 pb-16" // pb-16: ensure last message not hidden behind input
        ref={containerRef}
        onScroll={handleScroll}
      >
        {messages.map((msg, idx) => (
          <div key={msg.id ?? idx} className="text-sm">
            <div className="flex items-center space-x-2">
              <span
                className={`font-medium ${
                  msg.role === 'teacher' ? 'text-blue-600' : 'text-green-600'
                }`}
              >
                {msg.userName}:
              </span>
            </div>
            <div className="text-gray-700 ml-2">{msg.message}</div>
            <div className="text-xs text-gray-500 ml-2">
              {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : ''}
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* "Jump to latest" button when user scrolled up and new messages arrived */}
      {!isAtBottom && unseenCount > 0 && (
        <div className="absolute right-4 bottom-20">
          <button
            onClick={() => {
              scrollToBottom('auto');
              setUnseenCount(0);
            }}
            className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full shadow"
          >
            {unseenCount} new
          </button>
        </div>
      )}

      <div className="p-3 border-t border-gray-200">
        <div className="flex space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white p-2 rounded-lg transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
