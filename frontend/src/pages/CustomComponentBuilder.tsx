import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Input, message, Spin, Tabs, Switch, Alert } from 'antd';
import { Save, ArrowLeft, Bot, Wand2, Play, Code, TreePine } from 'lucide-react';
import { useCustomComponentStore } from '../stores/customComponentStore';
import { JsonRenderChart } from '../components/charts';
import { ComponentTreeEditor } from '../components/edit/ComponentTreeEditor';
import './CustomComponentBuilder.css';

const { TabPane } = Tabs;

// 默认的组件 Schema (新格式)
const DEFAULT_SCHEMA = {
  version: '1.0',
  name: '新组件',
  dataFormat: {
    description: '表格数据，每行一条记录',
    required: ['name', 'value'],
  },
  exampleData: [
    { name: '北京', value: 1234 },
    { name: '上海', value: 5678 },
    { name: '广州', value: 9012 },
  ],
  root: {
    component: 'flex',
    props: {
      direction: 'column',
      gap: 16,
    },
    children: [
      {
        component: 'heading',
        level: 3,
        children: '数据列表',
      },
      {
        component: 'table',
        columns: [
          { key: 'name', label: '名称' },
          { key: 'value', label: '数值' },
        ],
        '#each': '${items}',
        '#eachItem': {
          component: 'div',
          props: { style: { display: 'flex', gap: 16, padding: '8px 0', borderBottom: '1px solid #f0f0f0' } },
          children: [
            { component: 'text', value: '${item.name}' },
            { component: 'text', value: '${item.value}', color: '#1890ff' },
          ],
        },
      },
    ],
  },
};

// 数据源类型
type SourceType = 'inline' | 'sql';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function CustomComponentBuilder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { createComponent, getComponent, updateComponent, fetchComponents } = useCustomComponentStore();
  const editId = searchParams.get('id');

  // 组件信息
  const [name, setName] = useState('未命名组件');
  const [description, setDescription] = useState('');
  const [category] = useState('card');

  // Schema 状态 (新格式)
  const [schemaText, setSchemaText] = useState(JSON.stringify(DEFAULT_SCHEMA, null, 2));
  const [parsedSchema, setParsedSchema] = useState(DEFAULT_SCHEMA);
  const [schemaError, setSchemaError] = useState<string | null>(null);

  // 数据源配置
  const [sourceType, setSourceType] = useState<SourceType>('inline');
  const [exampleDataText, setExampleDataText] = useState(JSON.stringify(DEFAULT_SCHEMA.exampleData, null, 2));
  const [exampleData, setExampleData] = useState<Record<string, unknown>[]>(DEFAULT_SCHEMA.exampleData || []);
  const [sqlText, setSqlText] = useState('');
  const [sqlError, setSqlError] = useState<string | null>(null);
  const [sqlPreviewData, setSqlPreviewData] = useState<Record<string, unknown>[]>([]);
  const [sqlPreviewing, setSqlPreviewing] = useState(false);

  // 编辑器模式
  const [editorMode, setEditorMode] = useState<'tree' | 'json'>('tree');

  // Agent 对话
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '欢迎使用自定义组件构建器！您可以描述想要的组件样式，我会帮您生成 JSON Schema 和数据格式。\n\n例如："创建一个 Tab 组件，第一个 Tab 显示国内数据，第二个显示国外数据"',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [executing, setExecuting] = useState(false);

  // 解析 Schema
  useEffect(() => {
    try {
      const parsed = JSON.parse(schemaText);
      console.log('[Schema] Parsed schema, exampleData:', JSON.stringify(parsed.exampleData)?.slice(0, 200));
      setParsedSchema(parsed);
      setSchemaError(null);
      // 如果 schema 中有 exampleData，同步到编辑器
      if (parsed.exampleData) {
        console.log('[Schema] Setting exampleData from schema:', parsed.exampleData);
        setExampleData(parsed.exampleData);
        setExampleDataText(JSON.stringify(parsed.exampleData, null, 2));
      } else {
        console.log('[Schema] No exampleData in schema, root.exampleData:', parsed.root?.exampleData);
        // 尝试从 root 获取 exampleData
        if (parsed.root?.exampleData) {
          setExampleData(parsed.root.exampleData);
          setExampleDataText(JSON.stringify(parsed.root.exampleData, null, 2));
        }
      }
    } catch (e) {
      setSchemaError((e as Error).message);
    }
  }, [schemaText]);

  // 解析 Example Data
  useEffect(() => {
    try {
      const parsed = JSON.parse(exampleDataText);
      if (Array.isArray(parsed)) {
        console.log('[ExampleData] Setting from exampleDataText:', parsed);
        setExampleData(parsed);
      }
    } catch {
      // ignore
    }
  }, [exampleDataText]);

  // 加载待编辑的组件
  useEffect(() => {
    fetchComponents();
    if (!editId) return;
    getComponent(editId).then(component => {
      setName(component.name);
      setDescription(component.description || '');
      try {
        const schema = JSON.parse(component.json_schema);
        setSchemaText(JSON.stringify(schema, null, 2));
        // 解析数据源配置
        if (component.data_source_config) {
          const config = JSON.parse(component.data_source_config);
          if (config.sourceType) setSourceType(config.sourceType);
          if (config.sql) setSqlText(config.sql);
          if (config.exampleData) {
            setExampleData(config.exampleData);
            setExampleDataText(JSON.stringify(config.exampleData, null, 2));
          }
        }
      } catch {
        message.error('组件 JSON Schema 解析失败');
      }
    }).catch(() => {
      message.error('加载组件失败');
    });
  }, [editId, getComponent, fetchComponents]);

  // 处理 Schema 编辑
  const handleSchemaChange = useCallback((value: string) => {
    setSchemaText(value);
  }, []);

  // 处理 exampleData 编辑
  const handleExampleDataChange = useCallback((value: string) => {
    setExampleDataText(value);
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        setExampleData(parsed);
        // 同步到 schema
        setSchemaText(prev => {
          try {
            const schema = JSON.parse(prev);
            schema.exampleData = parsed;
            return JSON.stringify(schema, null, 2);
          } catch {
            return prev;
          }
        });
      }
    } catch {
      // ignore
    }
  }, []);

  // 测试 SQL 查询
  const handleTestSql = useCallback(async () => {
    if (!sqlText.trim()) {
      setSqlError('请输入 SQL 语句');
      return;
    }
    setSqlPreviewing(true);
    setSqlError(null);
    try {
      const res = await fetch('http://localhost:8000/api/custom-components/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: sqlText }),
      });
      const result = await res.json();
      if (result.detail) {
        setSqlError(result.detail);
      } else {
        setSqlPreviewData(result.data || []);
        message.success(`查询成功，返回 ${result.data?.length || 0} 条数据`);
      }
    } catch (err) {
      setSqlError('查询失败: ' + (err as Error).message);
    } finally {
      setSqlPreviewing(false);
    }
  }, [sqlText]);

  // 应用生成的 Schema (从 AI 或手动)
  const applyGeneratedSchema = useCallback((newSchema: object) => {
    const formatted = JSON.stringify(newSchema, null, 2);
    setSchemaText(formatted);
  }, []);

  // 发送消息给 Agent
  const sendToAgent = useCallback(async () => {
    if (!input.trim() || executing) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setExecuting(true);

    try {
      // 暂时跳过 AI API，直接使用本地规则生成
      // TODO: 恢复 AI API 调用
      throw new Error('AI API temporarily disabled');
    } catch (err) {
      // 使用规则生成
      try {
        const generatedSchema = generateSimpleSchema(userMessage.content || 'default');
        applyGeneratedSchema(generatedSchema);
        setMessages(prev => [...prev, {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: '已根据您的描述生成组件 Schema，您可以在下方编辑器中调整，或直接预览效果。',
          timestamp: new Date(),
        }]);
      } catch (innerErr) {
        console.error('Fallback also failed:', innerErr);
      }
    } finally {
      setExecuting(false);
    }
  }, [input, executing, applyGeneratedSchema]);

  // 简单的基于规则的 Schema 生成（备用）
  function generateSimpleSchema(userInput: string): object {
    const input = userInput.toLowerCase();

    if (input.includes('tab')) {
      // Tab 组件 - 简化版：Tab 切换 + 静态内容展示
      return {
        version: '1.0',
        name: 'Tab 组件',
        dataFormat: {
          description: 'Tab 数据',
        },
        exampleData: {
          activeTab: 'tab1',
          content: '这是 Tab 1 的内容，可以包含文本、表格等',
        },
        root: {
          component: 'tabs',
          tabs: [
            { key: 'tab1', label: 'Tab 1' },
            { key: 'tab2', label: 'Tab 2' },
          ],
          children: {
            component: 'text',
            value: '${content}',
          },
        },
      };
    }

    if (input.includes('卡片') || input.includes('card')) {
      return {
        version: '1.0',
        name: '卡片组件',
        dataFormat: { description: '卡片数据，包含标题、数值和趋势' },
        exampleData: [{ title: '月度销售额', value: '¥1,234,567', trend: '+12.5%' }],
        root: {
          component: 'card',
          children: [
            { component: 'heading', level: 3, children: '${title}' },
            { component: 'metric', value: '${value}', label: '销售额', trend: '${trend}' },
          ],
        },
      };
    }

    if (input.includes('列表') || input.includes('list')) {
      return {
        version: '1.0',
        name: '列表组件',
        dataFormat: { description: '列表数据，每行一条记录' },
        exampleData: [
          { name: '产品 A', value: 100 },
          { name: '产品 B', value: 200 },
        ],
        root: {
          component: 'list',
          '#each': '${items}',
          '#eachItem': {
            component: 'div',
            props: { style: { padding: '8px 0', borderBottom: '1px solid #f0f0f0' } },
            children: [
              { component: 'text', value: '${item.name}' },
              { component: 'text', value: '${item.value}', color: '#1890ff' },
            ],
          },
        },
      };
    }

    if (input.includes('指标') || input.includes('metric')) {
      return {
        version: '1.0',
        name: '指标组件',
        dataFormat: { description: '指标数据' },
        exampleData: [{ label: '完成率', value: '78%', trend: '+5%' }],
        root: {
          component: 'flex',
          direction: 'row',
          gap: 16,
          children: [
            { component: 'metric', value: '${value}', label: '${label}', trend: '${trend}' },
          ],
        },
      };
    }

    return DEFAULT_SCHEMA;
  }

  // 键盘发送
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendToAgent();
    }
  }, [sendToAgent]);

  // 保存组件
  const handleSave = async () => {
    if (!name.trim()) {
      message.error('请输入组件名称');
      return;
    }
    if (schemaError) {
      message.error('JSON Schema 格式错误');
      return;
    }

    // 构建数据源配置
    const dataSourceConfig = {
      sourceType,
      ...(sourceType === 'sql' ? { sql: sqlText } : { exampleData }),
    };
    console.log('[Builder] Saving component:');
    console.log('- name:', name);
    console.log('- sourceType:', sourceType);
    console.log('- exampleData:', JSON.stringify(exampleData)?.slice(0, 200));
    console.log('- dataSourceConfig:', JSON.stringify(dataSourceConfig)?.slice(0, 200));

    try {
      if (editId) {
        await updateComponent(editId, {
          name: name.trim(),
          description: description.trim(),
          category,
          json_schema: schemaText,
          data_source_config: JSON.stringify(dataSourceConfig),
          is_published: 1,
        });
        message.success('组件已更新');
      } else {
        await createComponent({
          name: name.trim(),
          description: description.trim(),
          category,
          json_schema: schemaText,
          data_source_config: JSON.stringify(dataSourceConfig),
          is_published: 1,
        });
        message.success('组件已保存');
      }
      navigate('/dashboard/new/edit');
    } catch (e) {
      message.error((e as Error).message || '保存失败');
    }
  };

  // 预览数据 - 根据数据源类型决定
  const previewData = sourceType === 'sql' ? sqlPreviewData : exampleData;
  console.log('[Builder] previewData:', JSON.stringify(previewData)?.slice(0, 200));

  return (
    <div className="builder-page">
      {/* 顶部工具栏 */}
      <div className="builder-toolbar">
        <div className="toolbar-left">
          <Button icon={<ArrowLeft size={16} />} onClick={() => navigate(-1)}>
            返回
          </Button>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="组件名称"
            style={{ width: 200, marginLeft: 8 }}
            size="small"
          />
          <Input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="组件描述（可选）"
            style={{ width: 200, marginLeft: 8 }}
            size="small"
          />
        </div>
        <div className="toolbar-right">
          <Button icon={<Save size={16} />} onClick={handleSave}>
            {editId ? '保存修改' : '保存到组件库'}
          </Button>
        </div>
      </div>

      <div className="builder-body">
        {/* 左侧：Agent 对话 */}
        <div className="builder-chat">
          <div className="chat-header">
            <Bot size={16} />
            <span>组件构建助手</span>
          </div>
          <div className="chat-messages">
            {messages.map(msg => (
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
            <Input.TextArea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="描述您想要的组件样式..."
              autoSize={{ minRows: 1, maxRows: 3 }}
            />
            <Button type="primary" icon={<Wand2 size={14} />} onClick={sendToAgent} loading={executing}>
              生成
            </Button>
          </div>
        </div>

        {/* 中间：编辑器 + 数据配置 */}
        <div className="builder-center">
          {/* 编辑器 Tab */}
          <div className="builder-editor-tabs">
            <Tabs
              activeKey={editorMode}
              onChange={key => setEditorMode(key as 'tree' | 'json')}
              size="small"
            >
              <TabPane
                tab={<span><TreePine size={14} /> 结构编辑</span>}
                key="tree"
              >
                <div className="editor-tree-area">
                  <ComponentTreeEditor
                    schema={parsedSchema}
                    onChange={newSchema => setSchemaText(JSON.stringify(newSchema, null, 2))}
                  />
                </div>
              </TabPane>
              <TabPane
                tab={<span><Code size={14} /> JSON</span>}
                key="json"
              >
                <div className="editor-json-area">
                  <textarea
                    className="schema-editor"
                    value={schemaText}
                    onChange={e => handleSchemaChange(e.target.value)}
                    spellCheck={false}
                  />
                  {schemaError && <div className="editor-error">错误: {schemaError}</div>}
                </div>
              </TabPane>
            </Tabs>
          </div>

          {/* 数据配置面板 */}
          <div className="builder-data-config">
            <div className="data-config-header">
              <span>数据配置</span>
              <div className="source-type-toggle">
                <span className={sourceType === 'inline' ? 'active' : ''}>Example</span>
                <Switch
                  size="small"
                  checked={sourceType === 'sql'}
                  onChange={checked => setSourceType(checked ? 'sql' : 'inline')}
                />
                <span className={sourceType === 'sql' ? 'active' : ''}>SQL</span>
              </div>
            </div>
            <div className="data-config-content">
              {sourceType === 'inline' ? (
                <div className="example-data-editor">
                  <div className="data-editor-hint">修改 Example 数据，预览将实时更新</div>
                  <textarea
                    className="data-editor-textarea"
                    value={exampleDataText}
                    onChange={e => handleExampleDataChange(e.target.value)}
                    spellCheck={false}
                  />
                </div>
              ) : (
                <div className="sql-editor">
                  <div className="data-editor-hint">输入 SQL 查询，预览将执行查询并显示结果</div>
                  <textarea
                    className="data-editor-textarea"
                    value={sqlText}
                    onChange={e => setSqlText(e.target.value)}
                    placeholder="SELECT name, value FROM ..."
                    spellCheck={false}
                  />
                  <Button
                    icon={<Play size={14} />}
                    onClick={handleTestSql}
                    loading={sqlPreviewing}
                    size="small"
                    style={{ marginTop: 8 }}
                  >
                    执行查询
                  </Button>
                  {sqlError && <Alert type="error" message={sqlError} style={{ marginTop: 8 }} />}
                  {sqlPreviewData.length > 0 && (
                    <Alert
                      type="success"
                      message={`查询成功，返回 ${sqlPreviewData.length} 条数据`}
                      style={{ marginTop: 8 }}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 右侧：预览 */}
        <div className="builder-preview">
          <div className="preview-header">
            <span>实时预览</span>
            <span style={{ fontSize: 12, color: '#999' }}>
              {sourceType === 'sql' ? `SQL 模式 (${sqlPreviewData.length} 条)` : `Inline 模式 (${exampleData.length} 条)`}
            </span>
          </div>
          <div className="preview-content">
            {schemaError ? (
              <div className="preview-error">Schema 解析错误: {schemaError}</div>
            ) : (
              <div className="preview-chart">
                <JsonRenderChart
                  schema={parsedSchema.root as Record<string, unknown>}
                  data={previewData}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
