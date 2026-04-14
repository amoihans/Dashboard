import { useState, useCallback } from 'react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// 默认的 amis Schema
// 注意：使用标准组件类型，确保在 amis SDK 中可用
// 避免使用 flex、flexItem、card 等高级组件，这些在 sdk.js 中可能不可用
export const DEFAULT_AMIS_SCHEMA = {
  type: 'page',
  title: '新组件',
  body: [
    {
      type: 'wrapper',
      body: {
        type: 'tpl',
        tpl: '数据值: ${items.0.value}',
      },
    },
  ],
};

interface UseAgentChatOptions {
  onSchemaGenerated?: (schema: string) => void;
}

interface AgentEvent {
  type: 'message' | 'schema' | 'done' | 'error';
  content?: string;
  schema?: string;
  task_id?: string;
}

export function useAgentChat(options: UseAgentChatOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        '欢迎使用自定义组件构建器！您可以描述想要的组件样式，我会帮您生成符合 amis 格式的 JSON 配置。\n\n例如："创建一个卡片组件，显示用户头像、姓名和状态"\n或者："创建一个 Tab 组件，第一个 Tab 显示数据表格，第二个显示图表"',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [executing, setExecuting] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);

  // 发送消息给 Agent
  const sendMessage = useCallback(
    async (userContent: string) => {
      const trimmedContent = userContent.trim();
      if (!trimmedContent || executing) return;

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: trimmedContent,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput('');
      setExecuting(true);

      // 更新对话历史
      const newHistory = [...conversationHistory, { role: 'user' as const, content: trimmedContent }];

      let schemaContent = '';
      let fullContent = '';

      try {
        // 调用后端 Agent API (SSE 流式)
        const response = await fetch('http://localhost:8000/api/agent/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: trimmedContent,
            history: conversationHistory,
            context: {
              type: 'custom-component-builder',
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
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

                if (event.type === 'message' && event.content) {
                  fullContent += event.content;
                  // 实时更新消息
                  setMessages((prev) => {
                    const lastMsg = prev[prev.length - 1];
                    if (lastMsg?.role === 'assistant' && lastMsg.id.startsWith('assistant-')) {
                      return [...prev.slice(0, -1), { ...lastMsg, content: fullContent }];
                    }
                    return [
                      ...prev,
                      {
                        id: `assistant-${Date.now()}`,
                        role: 'assistant' as const,
                        content: fullContent,
                        timestamp: new Date(),
                      },
                    ];
                  });
                } else if (event.type === 'schema' && event.schema) {
                  schemaContent = event.schema;
                  // 立即调用回调，让预览实时更新
                  options.onSchemaGenerated?.(schemaContent);
                } else if (event.type === 'done') {
                  // 更新对话历史
                  setConversationHistory([...newHistory, { role: 'assistant', content: fullContent }]);
                  // 如果之前没有通过 schema 事件发送，这里再发一次
                  if (schemaContent && !schemaContent.includes('${')) {
                    // schema was already sent via schema event
                  } else if (schemaContent) {
                    options.onSchemaGenerated?.(schemaContent);
                  }
                } else if (event.type === 'error') {
                  throw new Error(event.content || '未知错误');
                }
              } catch (e) {
                console.error('Failed to parse SSE event:', e);
              }
            }
          }
        }

        // 如果没有收到 schema，使用默认生成
        if (!schemaContent) {
          throw new Error('未收到生成的 Schema');
        }
      } catch (error) {
        console.error('[useAgentChat] Error:', error);

        // 如果 API 调用失败，使用简单的规则生成作为 fallback
        const generatedSchema = generateSimpleSchema(trimmedContent);
        options.onSchemaGenerated?.(JSON.stringify(generatedSchema, null, 2));

        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: '已根据您的描述生成组件 Schema，您可以在右侧编辑器中调整，或直接预览效果。',
            timestamp: new Date(),
          },
        ]);

        // 更新对话历史
        setConversationHistory([
          ...newHistory,
          { role: 'assistant', content: '已根据您的描述生成组件 Schema' },
        ]);
      } finally {
        setExecuting(false);
      }
    },
    [executing, conversationHistory, options]
  );

  // 简单的规则生成（fallback）
  function generateSimpleSchema(userInput: string): object {
    const input = userInput.toLowerCase();

    if (input.includes('tab')) {
      return {
        type: 'page',
        title: 'Tab 组件',
        body: [
          {
            type: 'tabs',
            tabs: [
              { title: 'Tab 1', body: [{ type: 'tpl', tpl: '这是 Tab 1 的内容' }] },
              { title: 'Tab 2', body: [{ type: 'tpl', tpl: '这是 Tab 2 的内容' }] },
            ],
          },
        ],
      };
    }

    if (input.includes('卡片') || input.includes('card')) {
      return {
        type: 'page',
        title: '卡片组件',
        body: [
          {
            type: 'card',
            body: [
              { type: 'tpl', tpl: '卡片标题', className: 'text-lg font-bold' },
              { type: 'tpl', tpl: '${description}', className: 'text-gray-600' },
              { type: 'tpl', tpl: '${value}', className: 'text-2xl text-blue-500' },
            ],
          },
        ],
      };
    }

    if (input.includes('表格') || input.includes('table')) {
      return {
        type: 'page',
        body: [
          {
            type: 'crud',
            api: '/api/mock',
            columns: [
              { name: 'name', label: '名称' },
              { name: 'value', label: '数值' },
            ],
          },
        ],
      };
    }

    if (input.includes('列表') || input.includes('list')) {
      return {
        type: 'page',
        body: [
          {
            type: 'list',
            data: { items: [{ name: '示例项', value: 100 }] },
            body: [
              { type: 'tpl', tpl: '${item.name}' },
              { type: 'tpl', tpl: '${item.value}', className: 'text-blue-500' },
            ],
          },
        ],
      };
    }

    if (input.includes('指标') || input.includes('metric')) {
      return {
        type: 'page',
        body: [
          {
            type: 'flex',
            justify: 'space-around',
            items: [
              { type: 'statistical', label: '完成率', value: '${rate}%' },
              { type: 'statistical', label: '访问量', value: '${visits}' },
              { type: 'statistical', label: '销售额', value: '${sales}' },
            ],
          },
        ],
      };
    }

    return DEFAULT_AMIS_SCHEMA;
  }

  return {
    messages,
    input,
    setInput,
    executing,
    sendMessage,
  };
}
