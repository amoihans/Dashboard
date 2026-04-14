import { Input, Button, Spin } from 'antd';
import { Bot, Wand2, Send } from 'lucide-react';
import { useAgentChat, type ChatMessage } from './hooks';
import './AgentChat.css';

const { TextArea } = Input;

interface AgentChatProps {
  schema: string;
  onSchemaChange: (schema: string) => void;
}

export function AgentChat({ schema, onSchemaChange }: AgentChatProps) {
  const { messages, input, setInput, executing, sendMessage } = useAgentChat({
    onSchemaGenerated: onSchemaChange,
  });

  const handleSend = () => {
    if (input.trim()) {
      sendMessage(input);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="agent-chat">
      <div className="chat-header">
        <Bot size={16} />
        <span>组件构建助手</span>
      </div>

      <div className="chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`chat-message ${msg.role}`}>
            <div className="chat-message-content">{msg.content}</div>
          </div>
        ))}
        {executing && (
          <div className="chat-message assistant">
            <div className="chat-message-content">
              <Spin size="small" /> 思考中...
            </div>
          </div>
        )}
      </div>

      <div className="chat-input">
        <TextArea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="描述您想要的组件样式..."
          autoSize={{ minRows: 2, maxRows: 4 }}
          disabled={executing}
        />
        <Button
          type="primary"
          icon={<Send size={14} />}
          onClick={handleSend}
          loading={executing}
          disabled={!input.trim() || executing}
        >
          发送
        </Button>
      </div>
    </div>
  );
}
