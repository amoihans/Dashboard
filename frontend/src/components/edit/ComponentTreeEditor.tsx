import React, { useState } from 'react';
import { Input, Button, Select, Space, Divider } from 'antd';
import { Plus, Trash2, ChevronRight, ChevronDown } from 'lucide-react';

interface ComponentSchema {
  component?: string;
  props?: Record<string, unknown>;
  children?: React.ReactNode | ComponentSchema | ComponentSchema[] | string | null;
  '#each'?: string;
  '#eachItem'?: ComponentSchema;
  'tabs'?: TabItem[];
  'columns'?: TableColumn[];
  'value'?: string;
  'size'?: number | string;
  'weight'?: string;
  'color'?: string;
  'direction'?: string;
  'gap'?: number;
  'wrap'?: boolean;
  'align'?: string;
  'justify'?: string;
  'level'?: number;
  'style'?: Record<string, unknown>;
}

interface TabItem {
  key: string;
  label: string;
}

interface TableColumn {
  key: string;
  label: string;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
}

const COMPONENT_TYPES = [
  { value: 'flex', label: 'Flex 布局' },
  { value: 'card', label: '卡片' },
  { value: 'tabs', label: 'Tab 切换' },
  { value: 'table', label: '表格' },
  { value: 'heading', label: '标题' },
  { value: 'text', label: '文本' },
  { value: 'metric', label: '指标' },
  { value: 'list', label: '列表' },
  { value: 'divider', label: '分隔线' },
  { value: 'space', label: '间距' },
  { value: 'div', label: 'Div' },
  { value: 'span', label: 'Span' },
  { value: 'p', label: '段落' },
  { value: 'h1', label: 'H1' },
  { value: 'h2', label: 'H2' },
  { value: 'h3', label: 'H3' },
  { value: 'h4', label: 'H4' },
  { value: 'h5', label: 'H5' },
  { value: 'h6', label: 'H6' },
  { value: 'button', label: '按钮' },
  { value: 'img', label: '图片' },
  { value: 'ul', label: '无序列表' },
  { value: 'ol', label: '有序列表' },
  { value: 'li', label: '列表项' },
];

interface Props {
  schema: Record<string, unknown>;
  onChange: (schema: ComponentSchema) => void;
}

interface TreeNodeProps {
  nodeKey: string;
  schema: ComponentSchema;
  onChange: (schema: ComponentSchema) => void;
  depth: number;
}

function TreeNode({ nodeKey, schema, onChange, depth }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(depth < 2);
  const [localSchema, setLocalSchema] = useState<ComponentSchema>(schema);

  const updateSchema = (updates: Partial<ComponentSchema>) => {
    const newSchema = { ...localSchema, ...updates };
    setLocalSchema(newSchema);
    onChange(newSchema);
  };

  const hasChildren = (s: ComponentSchema) => {
    return s.children && (typeof s.children === 'string' || Array.isArray(s.children) || typeof s.children === 'object');
  };

  const renderChildren = () => {
    if (!localSchema.children) return null;
    if (typeof localSchema.children === 'string') {
      return (
        <div style={{ marginLeft: 24, marginTop: 8 }}>
          <Input.TextArea
            value={localSchema.children as string}
            onChange={e => updateSchema({ children: e.target.value })}
            rows={2}
            placeholder="文本内容..."
            style={{ fontSize: 12 }}
          />
        </div>
      );
    }
    if (Array.isArray(localSchema.children)) {
      return (
        <div style={{ marginLeft: 24, marginTop: 8 }}>
          {(localSchema.children as ComponentSchema[]).map((child, idx) => (
            <TreeNode
              key={`${nodeKey}-child-${idx}`}
              nodeKey={`${nodeKey}-child-${idx}`}
              schema={child}
              onChange={(newChild) => {
                const newChildren = [...(localSchema.children as ComponentSchema[])];
                newChildren[idx] = newChild;
                updateSchema({ children: newChildren });
              }}
              depth={depth + 1}
            />
          ))}
          <Button
            size="small"
            icon={<Plus size={12} />}
            onClick={() => {
              const newChildren = [...(localSchema.children as ComponentSchema[]), { component: 'div' }];
              updateSchema({ children: newChildren });
            }}
            style={{ marginTop: 4 }}
          >
            添加子组件
          </Button>
        </div>
      );
    }
    if (typeof localSchema.children === 'object') {
      return (
        <div style={{ marginLeft: 24, marginTop: 8 }}>
          <TreeNode
            nodeKey={`${nodeKey}-child-obj`}
            schema={localSchema.children as ComponentSchema}
            onChange={(newChild) => updateSchema({ children: newChild })}
            depth={depth + 1}
          />
        </div>
      );
    }
    return null;
  };

  const renderTabs = () => {
    if (localSchema.component !== 'tabs' || !localSchema.tabs) return null;
    return (
      <div style={{ marginLeft: 24, marginTop: 8, padding: '8px', background: '#f5f5f5', borderRadius: 4 }}>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>Tabs 配置</div>
        {(localSchema.tabs as TabItem[]).map((tab, idx) => (
          <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
            <Input
              size="small"
              value={tab.key}
              onChange={e => {
                const newTabs = [...(localSchema.tabs as TabItem[])];
                newTabs[idx] = { ...tab, key: e.target.value };
                updateSchema({ tabs: newTabs });
              }}
              placeholder="key"
              style={{ width: 100 }}
            />
            <Input
              size="small"
              value={tab.label}
              onChange={e => {
                const newTabs = [...(localSchema.tabs as TabItem[])];
                newTabs[idx] = { ...tab, label: e.target.value };
                updateSchema({ tabs: newTabs });
              }}
              placeholder="标签"
              style={{ width: 120 }}
            />
            <Button
              size="small"
              danger
              icon={<Trash2 size={12} />}
              onClick={() => {
                const newTabs = (localSchema.tabs as TabItem[]).filter((_, i) => i !== idx);
                updateSchema({ tabs: newTabs });
              }}
            />
          </div>
        ))}
        <Button
          size="small"
          icon={<Plus size={12} />}
          onClick={() => {
            const newTabs = [...(localSchema.tabs as TabItem[]), { key: `tab${idx + 1}`, label: `Tab ${idx + 1}` }];
            updateSchema({ tabs: newTabs });
          }}
        >
          添加 Tab
        </Button>
      </div>
    );
  };

  const renderColumns = () => {
    if (localSchema.component !== 'table' || !localSchema.columns) return null;
    return (
      <div style={{ marginLeft: 24, marginTop: 8, padding: '8px', background: '#f5f5f5', borderRadius: 4 }}>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>表格列配置</div>
        {(localSchema.columns as TableColumn[]).map((col, idx) => (
          <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
            <Input
              size="small"
              value={col.key}
              onChange={e => {
                const newCols = [...(localSchema.columns as TableColumn[])];
                newCols[idx] = { ...col, key: e.target.value };
                updateSchema({ columns: newCols });
              }}
              placeholder="字段"
              style={{ width: 100 }}
            />
            <Input
              size="small"
              value={col.label}
              onChange={e => {
                const newCols = [...(localSchema.columns as TableColumn[])];
                newCols[idx] = { ...col, label: e.target.value };
                updateSchema({ columns: newCols });
              }}
              placeholder="列名"
              style={{ width: 120 }}
            />
            <Button
              size="small"
              danger
              icon={<Trash2 size={12} />}
              onClick={() => {
                const newCols = (localSchema.columns as TableColumn[]).filter((_, i) => i !== idx);
                updateSchema({ columns: newCols });
              }}
            />
          </div>
        ))}
        <Button
          size="small"
          icon={<Plus size={12} />}
          onClick={() => {
            const newCols = [...(localSchema.columns as TableColumn[]), { key: `col${idx + 1}`, label: `列 ${idx + 1}` }];
            updateSchema({ columns: newCols });
          }}
        >
          添加列
        </Button>
      </div>
    );
  };

  const renderLoopConfig = () => {
    if (!localSchema['#each']) return null;
    return (
      <div style={{ marginLeft: 24, marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#666' }}>循环数据:</span>
          <Input
            size="small"
            value={localSchema['#each']}
            onChange={e => updateSchema({ '#each': e.target.value })}
            placeholder="${items}"
            style={{ width: 150 }}
          />
        </div>
      </div>
    );
  };

  const renderTextValue = () => {
    if (localSchema.component !== 'text' && !localSchema.value) return null;
    return (
      <div style={{ marginLeft: 24, marginTop: 8 }}>
        <div style={{ fontSize: 12, color: '#666' }}>文本内容:</div>
        <Input.TextArea
          value={(localSchema.value || localSchema.children as string) ?? ''}
          onChange={e => {
            if (localSchema.component === 'text') {
              updateSchema({ value: e.target.value });
            } else {
              updateSchema({ children: e.target.value });
            }
          }}
          rows={2}
          placeholder="文本内容，支持 ${变量} 插值"
          style={{ fontSize: 12 }}
        />
      </div>
    );
  };

  const renderHeadingLevel = () => {
    if (localSchema.component !== 'heading') return null;
    return (
      <div style={{ marginLeft: 24, marginTop: 8 }}>
        <span style={{ fontSize: 12, color: '#666' }}>标题级别: </span>
        <Select
          size="small"
          value={localSchema.level || 3}
          onChange={val => updateSchema({ level: val })}
          options={[
            { value: 1, label: 'H1' },
            { value: 2, label: 'H2' },
            { value: 3, label: 'H3' },
            { value: 4, label: 'H4' },
            { value: 5, label: 'H5' },
            { value: 6, label: 'H6' },
          ]}
          style={{ width: 80 }}
        />
      </div>
    );
  };

  const renderDirection = () => {
    if (localSchema.component !== 'flex') return null;
    return (
      <div style={{ marginLeft: 24, marginTop: 8 }}>
        <Space>
          <span style={{ fontSize: 12, color: '#666' }}>方向:</span>
          <Select
            size="small"
            value={localSchema.direction || 'row'}
            onChange={val => updateSchema({ direction: val })}
            options={[
              { value: 'row', label: '水平' },
              { value: 'column', label: '垂直' },
            ]}
            style={{ width: 80 }}
          />
          <span style={{ fontSize: 12, color: '#666' }}>间隙:</span>
          <Input
            size="small"
            type="number"
            value={localSchema.gap || 0}
            onChange={e => updateSchema({ gap: Number(e.target.value) })}
            style={{ width: 60 }}
          />
        </Space>
      </div>
    );
  };

  return (
    <div style={{ marginBottom: 8 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 8px',
          background: '#fff',
          border: '1px solid #e8e8e8',
          borderRadius: 4,
          marginLeft: depth * 16,
        }}
      >
        {hasChildren(localSchema) && (
          <Button
            type="text"
            size="small"
            icon={expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            onClick={() => setExpanded(!expanded)}
          />
        )}
        {!hasChildren(localSchema) && <div style={{ width: 22 }} />}

        <Select
          size="small"
          value={localSchema.component || 'div'}
          onChange={val => updateSchema({ component: val })}
          options={COMPONENT_TYPES}
          style={{ width: 120 }}
        />

        {localSchema.component === 'text' && (
          <Input
            size="small"
            value={localSchema.value as string || ''}
            onChange={e => updateSchema({ value: e.target.value })}
            placeholder="文本内容"
            style={{ width: 150, fontSize: 12 }}
          />
        )}

        {localSchema.component === 'space' && (
          <Input
            size="small"
            type="number"
            value={localSchema.size as number || 8}
            onChange={e => updateSchema({ size: Number(e.target.value) })}
            placeholder="间距"
            style={{ width: 60 }}
          />
        )}

        <div style={{ flex: 1 }} />

        <Button
          type="text"
          size="small"
          danger
          icon={<Trash2 size={14} />}
          onClick={() => {
            // 不在 TreeNode 中删除，由父组件处理
          }}
        />
      </div>

      {expanded && (
        <div style={{ borderLeft: '2px solid #e8e8e8', marginLeft: depth * 16 + 10 }}>
          {renderTabs()}
          {renderColumns()}
          {renderLoopConfig()}
          {renderTextValue()}
          {renderHeadingLevel()}
          {renderDirection()}
          {renderChildren()}
        </div>
      )}
    </div>
  );
}

export function ComponentTreeEditor({ schema, onChange }: Props) {
  const schemaObj = schema as unknown as ComponentSchema;

  return (
    <div style={{ padding: 16 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>组件结构</div>
        <TreeNode
          nodeKey="root"
          schema={schemaObj.root || schemaObj}
          onChange={(newSchema) => {
            if (schemaObj.version === '1.0') {
              onChange({ ...schemaObj, root: newSchema });
            } else {
              onChange(newSchema);
            }
          }}
          depth={0}
        />
      </div>

      <Divider style={{ margin: '16px 0' }} />

      <div>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>组件信息</div>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <span style={{ fontSize: 12, color: '#666', marginRight: 8 }}>版本:</span>
            <Input
              size="small"
              value={schemaObj.version || '1.0'}
              disabled
              style={{ width: 80 }}
            />
          </div>
          <div>
            <span style={{ fontSize: 12, color: '#666', marginRight: 8 }}>名称:</span>
            <Input
              size="small"
              value={schemaObj.name || ''}
              onChange={e => onChange({ ...schemaObj, name: e.target.value })}
              placeholder="组件名称"
              style={{ width: 200 }}
            />
          </div>
          {schemaObj.dataFormat && (
            <div>
              <span style={{ fontSize: 12, color: '#666', marginRight: 8 }}>数据格式:</span>
              <Input.TextArea
                size="small"
                value={(schemaObj.dataFormat as { description?: string })?.description || ''}
                onChange={e => onChange({
                  ...schemaObj,
                  dataFormat: { ...(schemaObj.dataFormat as object), description: e.target.value }
                })}
                rows={2}
                placeholder="数据格式说明"
                style={{ width: '100%' }}
              />
            </div>
          )}
        </Space>
      </div>
    </div>
  );
}
