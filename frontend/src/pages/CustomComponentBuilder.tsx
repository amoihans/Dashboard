import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Input, message } from 'antd';
import { Save, ArrowLeft } from 'lucide-react';
import { useCustomComponentStore } from '../stores/customComponentStore';
import { AgentChat, JsonEditor, DataConfig, AmisPreview, DEFAULT_AMIS_SCHEMA } from '../components/custom-component-builder';
import './CustomComponentBuilder.css';

type SourceType = 'inline' | 'sql';

export function CustomComponentBuilder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { createComponent, getComponent, updateComponent, fetchComponents } = useCustomComponentStore();
  const editId = searchParams.get('id');

  // 组件信息
  const [name, setName] = useState('未命名组件');
  const [description, setDescription] = useState('');
  const [category] = useState('card');

  // Schema 状态
  const [schemaText, setSchemaText] = useState(JSON.stringify(DEFAULT_AMIS_SCHEMA, null, 2));
  const [parsedSchema, setParsedSchema] = useState<Record<string, unknown> | null>(null);
  const [schemaError, setSchemaError] = useState<string | null>(null);

  // 数据源配置
  const [sourceType, setSourceType] = useState<SourceType>('inline');
  const [exampleData, setExampleData] = useState<Record<string, unknown>[]>([
    { name: '示例项 A', value: 1234 },
    { name: '示例项 B', value: 5678 },
    { name: '示例项 C', value: 9012 },
  ]);
  const [sqlText, setSqlText] = useState('');
  const [sqlError, setSqlError] = useState<string | null>(null);
  const [sqlPreviewData, setSqlPreviewData] = useState<Record<string, unknown>[]>([]);
  const [sqlPreviewing, setSqlPreviewing] = useState(false);

  // 解析 Schema
  useEffect(() => {
    if (!schemaText.trim()) {
      setParsedSchema(null);
      setSchemaError(null);
      return;
    }
    try {
      const parsed = JSON.parse(schemaText);
      setParsedSchema(parsed);
      setSchemaError(null);
    } catch (e) {
      setSchemaError((e as Error).message);
      setParsedSchema(null);
    }
  }, [schemaText]);

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
          if (config.exampleData) setExampleData(config.exampleData);
        }
      } catch {
        message.error('组件 JSON Schema 解析失败');
      }
    }).catch(() => {
      message.error('加载组件失败');
    });
  }, [editId, getComponent, fetchComponents]);

  // Schema 变化处理
  const handleSchemaChange = useCallback((value: string) => {
    setSchemaText(value);
  }, []);

  // Example Data 变化处理
  const handleExampleDataChange = useCallback((data: Record<string, unknown>[]) => {
    setExampleData(data);
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

  // 准备渲染数据
  const renderData: Record<string, unknown> = sourceType === 'sql'
    ? { items: sqlPreviewData }
    : { items: exampleData };

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
          <AgentChat schema={schemaText} onSchemaChange={handleSchemaChange} />
        </div>

        {/* 中间：实时预览 */}
        <div className="builder-preview-area">
          <AmisPreview
            schema={schemaError ? null : parsedSchema}
            data={renderData}
          />
        </div>

        {/* 右侧：JSON 编辑 + 数据配置 */}
        <div className="builder-right">
          <div className="builder-json">
            <JsonEditor value={schemaText} onChange={handleSchemaChange} />
          </div>
          <DataConfig
            sourceType={sourceType}
            exampleData={exampleData}
            sql={sqlText}
            sqlPreviewData={sqlPreviewData}
            sqlError={sqlError}
            sqlPreviewing={sqlPreviewing}
            onSourceTypeChange={setSourceType}
            onExampleDataChange={handleExampleDataChange}
            onSqlChange={setSqlText}
            onTestSql={handleTestSql}
          />
        </div>
      </div>
    </div>
  );
}
