import { useState, useRef, useCallback, useEffect } from 'react';
import { Button, Input } from 'antd';
import { Send, X, Minimize2, Maximize2, Bot, User, Loader } from 'lucide-react';
import type { ComponentConfig, LayoutItem, ThemeType } from '../../types';
import { useDashboardStore } from '../../stores/dashboardStore';
import { customComponentApi } from '../../services/api';
import './AgentChatPanel.css';

const { TextArea } = Input;

interface AgentMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  operation?: {
    id: string;
    type: string;
    status?: 'start' | 'complete' | 'error';
    result?: any;
  };
}

interface AgentEvent {
  type: 'message' | 'operation_start' | 'operation_complete' | 'canvas_sync' | 'error' | 'done';
  content?: string;
  operation?: any;
  canvas_state?: {
    components: ComponentConfig[];
    layout: LayoutItem[];
    theme?: ThemeType;
  };
  task_id?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function AgentChatPanel({ visible, onClose }: Props) {
  const [messages, setMessages] = useState<AgentMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '您好！我是大屏配置助手，可以用自然语言描述您的需求。\n\n例如："添加一个折线图到左上角" 或 "把那个柱状图删掉"',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [executing, setExecuting] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    currentDashboard,
    updateTheme,
  } = useDashboardStore();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 同步画布状态
  const syncCanvasState = useCallback((canvasState: { components: ComponentConfig[]; layout: LayoutItem[]; theme?: ThemeType }) => {
    console.log('[AgentChatPanel] syncCanvasState called:', canvasState);
    const { components: newComponents, layout: newLayout, theme: newTheme } = canvasState;

    // 更新主题
    if (newTheme && currentDashboard) {
      updateTheme(newTheme);
    }

    // 直接替换整个 components 和 layout
    // 使用 setState 直接更新 store，创建浅拷贝以确保引用变化触发更新
    useDashboardStore.setState({
      components: [...newComponents],
      layout: [...newLayout],
    });
    console.log('[AgentChatPanel] Store updated, new components:', newComponents.length, 'new layout:', newLayout.length);
  }, [currentDashboard, updateTheme]);

  // 发送消息
  const sendMessage = useCallback(async () => {
    if (!input.trim() || executing) return;

    const userMessage: AgentMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setExecuting(true);

    // 先获取自定义组件列表
    let customComponentsList: Array<{ id: string; name: string; description?: string }> = [];
    try {
      const customComponents = await customComponentApi.list(1);
      customComponentsList = customComponents.map(c => ({
        id: c.id,
        name: c.name,
        description: c.description,
      }));
    } catch (e) {
      console.error('[AgentChatPanel] Failed to fetch custom components:', e);
    }

    // 构建当前状态
    const state = {
      components: useDashboardStore.getState().components,
      layout: useDashboardStore.getState().layout,
      theme: currentDashboard?.theme || 'light',
      customComponents: customComponentsList,
    };

    try {
      // 发送请求
      const response = await fetch('http://localhost:8000/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.content, state }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: '请求失败' }));
        throw new Error(error.detail || `HTTP ${response.status}`);
      }

      // 处理 SSE 流
      const reader = response.body?.getReader();
      if (!reader) throw new Error('无法读取响应流');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event: AgentEvent = JSON.parse(line.slice(6));

              if (event.type === 'message') {
                const assistantMessage: AgentMessage = {
                  id: `assistant-${Date.now()}-${Math.random()}`,
                  role: 'assistant',
                  content: event.content || '',
                  timestamp: new Date(),
                };
                setMessages(prev => [...prev, assistantMessage]);
              } else if (event.type === 'operation_start') {
                const opMessage: AgentMessage = {
                  id: `op-start-${Date.now()}`,
                  role: 'assistant',
                  content: event.content || '',
                  timestamp: new Date(),
                  operation: {
                    id: event.operation?.id || '',
                    type: event.operation?.type || '',
                    status: 'start',
                  },
                };
                setMessages(prev => [...prev, opMessage]);
              } else if (event.type === 'operation_complete') {
                console.log('[AgentChatPanel] Received operation_complete event:', event);
                const opMessage: AgentMessage = {
                  id: `op-complete-${Date.now()}`,
                  role: 'assistant',
                  content: event.content || '',
                  timestamp: new Date(),
                  operation: {
                    id: event.operation?.id || '',
                    type: event.operation?.type || '',
                    status: 'complete',
                    result: event.operation?.result,
                  },
                };
                setMessages(prev => [...prev, opMessage]);
              } else if (event.type === 'canvas_sync') {
                console.log('[AgentChatPanel] Received canvas_sync event:', event);
                // 同步画布状态
                if (event.canvas_state) {
                  syncCanvasState(event.canvas_state);
                }
              } else if (event.type === 'error') {
                const errorMessage: AgentMessage = {
                  id: `error-${Date.now()}`,
                  role: 'assistant',
                  content: `错误: ${event.content || '未知错误'}`,
                  timestamp: new Date(),
                };
                setMessages(prev => [...prev, errorMessage]);
              } else if (event.type === 'done') {
                setExecuting(false);
              }
            } catch (e) {
              console.error('Failed to parse SSE event:', e);
            }
          }
        }
      }
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : '未知错误';
      const errorMessage: AgentMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `发生错误: ${errorMsg}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setExecuting(false);
    }
  }, [input, executing, currentDashboard, syncCanvasState]);

  // 键盘发送
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  if (!visible) return null;

  return (
    <div className={`agent-chat-panel ${expanded ? 'expanded' : 'collapsed'}`}>
      {/* 标题栏 */}
      <div className="agent-header" onClick={() => setExpanded(!expanded)}>
        <div className="agent-header-left">
          <Bot size={16} />
          <span>Agent 助手</span>
        </div>
        <div className="agent-header-actions">
          <button
            className="agent-header-btn"
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          >
            {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button
            className="agent-header-btn"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* 消息区域 */}
      {expanded && (
        <>
          <div className="agent-messages">
            {messages.map(msg => (
              <div key={msg.id} className={`agent-message ${msg.role}`}>
                <div className="agent-message-icon">
                  {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                </div>
                <div className="agent-message-content">
                  {msg.operation ? (
                    <div className={`agent-operation ${msg.operation.status}`}>
                      <span className="agent-operation-indicator">
                        {msg.operation.status === 'start' && <Loader size={12} className="spin" />}
                        {msg.operation.status === 'complete' && '✓'}
                        {msg.operation.status === 'error' && '✗'}
                      </span>
                      <span>{msg.content}</span>
                    </div>
                  ) : (
                    <div className="agent-message-text">{msg.content}</div>
                  )}
                </div>
              </div>
            ))}
            {executing && (
              <div className="agent-message assistant">
                <div className="agent-message-icon">
                  <Bot size={14} />
                </div>
                <div className="agent-message-content">
                  <div className="agent-message-text executing">
                    <Loader size={12} className="spin" />
                    <span>处理中...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 输入区域 */}
          <div className="agent-input-area">
            <TextArea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入您的需求..."
              autoSize={{ minRows: 1, maxRows: 3 }}
              disabled={executing}
            />
            <Button
              type="primary"
              icon={<Send size={14} />}
              onClick={sendMessage}
              loading={executing}
              disabled={!input.trim()}
            >
              发送
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
