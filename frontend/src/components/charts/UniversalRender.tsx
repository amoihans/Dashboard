import React, { useState } from 'react';

// ========== 类型定义 ==========

export interface ComponentSchema {
  component: string;
  props?: Record<string, unknown>;
  children?: React.ReactNode | ComponentSchema | ComponentSchema[] | string | null;
  // 循环
  '#each'?: string;
  '#eachItem'?: ComponentSchema;
  // 条件
  '#if'?: unknown;
  // Tabs 专用
  'tabs'?: TabItem[];
  // Table 专用
  'columns'?: TableColumn[];
  // 文本专用
  'value'?: string;
  'size'?: number | string;
  'weight'?: string;
  'color'?: string;
  // 间距专用
  'size'?: number | string;
  // Heading 专用
  'level'?: number;
  // Flex 专用
  'direction'?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  'gap'?: number;
  'wrap'?: boolean;
  'align'?: string;
  'justify'?: string;
}

export interface TabItem {
  key: string;
  label: string;
}

export interface TableColumn {
  key: string;
  label: string;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
}

export interface UniversalRenderProps {
  schema: ComponentSchema;
  data: Record<string, unknown>;
  overrides?: Record<string, unknown>;
}

// ========== 变量解析 ==========

const VARIABLE_PATTERN = /\$\{(\w+)(?:\.(\w+))?\}/g;
// 三元表达式模式: ${condition ? trueVal : falseVal}
const TERNARY_PATTERN = /\$\{([^}]+)\?([^:]+):([^}]+)\}/g;
// 纯变量引用模式: ${varName} 或 ${obj.subKey}
const FULL_VAR_PATTERN = /^\$\{(\w+)(?:\.(\w+))?\}$/;

function resolveVariables(obj: unknown, data: Record<string, unknown>): unknown {
  if (typeof obj === 'string') {
    // 检查是否是纯变量引用（无其他文本），如果是则返回实际值而非字符串
    const fullMatch = obj.match(FULL_VAR_PATTERN);
    if (fullMatch) {
      const [, key, subKey] = fullMatch;
      if (subKey && typeof data[key] === 'object') {
        return (data[key] as Record<string, unknown>)[subKey] ?? null;
      }
      return data[key] ?? null;
    }

    // 处理三元表达式
    let result = obj.replace(TERNARY_PATTERN, (_, condition, trueVal, falseVal) => {
      try {
        const resolvedCondition = condition.replace(VARIABLE_PATTERN, (m, key, subKey) => {
          if (subKey && typeof data[key] === 'object') {
            return String((data[key] as Record<string, unknown>)[subKey] ?? '');
          }
          return String(data[key] ?? '');
        });
        const match = resolvedCondition.match(/^([^!=<>]+?)\s*(===|!==|==|!=|<|>|<=|>=)\s*(.+)$/);
        if (match) {
          const [, left, op, right] = match;
          const leftVal = data[left.trim()] ?? left.trim().replace(/['"]/g, '');
          const rightVal = right.trim().replace(/['"]/g, '');
          let conditionResult = false;
          switch (op) {
            case '===': case '==': conditionResult = leftVal == rightVal; break;
            case '!==': case '!=': conditionResult = leftVal != rightVal; break;
          }
          return conditionResult ? trueVal.trim() : falseVal.trim();
        }
      } catch {
        // 求值失败，返回原字符串
      }
      return obj;
    });
    // 处理普通变量
    result = result.replace(VARIABLE_PATTERN, (_, key, subKey) => {
      if (subKey && typeof data[key] === 'object') {
        return String((data[key] as Record<string, unknown>)[subKey] ?? '');
      }
      return String(data[key] ?? '');
    });
    return result;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => resolveVariables(item, data));
  }
  if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = resolveVariables(value, data);
    }
    return result;
  }
  return obj;
}

// ========== 基础样式解析 ==========

function parseStyle(style: unknown): React.CSSProperties {
  if (!style) return {};
  if (typeof style === 'string') {
    try {
      return JSON.parse(style);
    } catch {
      return {};
    }
  }
  return style as React.CSSProperties;
}

// ========== 组件实现 ==========

// 文字组件
function Text({ value, size, weight, color, style }: { value: string; size?: number | string; weight?: string; color?: string; style?: React.CSSProperties }) {
  return (
    <span style={{
      fontSize: size as React.CSSProperties['fontSize'],
      fontWeight: weight as React.CSSProperties['fontWeight'],
      color,
      ...style,
    }}>
      {value}
    </span>
  );
}

// 标题组件
function Heading({ children, level, style }: { children: React.ReactNode; level?: number; style?: React.CSSProperties }) {
  const Tag = `h${level || 3}` as keyof JSX.IntrinsicElements;
  return <Tag style={{ margin: 0, ...style }}>{children}</Tag>;
}

// 卡片组件
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 8,
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      padding: 16,
      ...style,
    }}>
      {children}
    </div>
  );
}

// 弹性布局组件
function Flex({ children, direction = 'row', gap = 0, wrap = false, align, justify, style }: {
  children: React.ReactNode;
  direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  gap?: number;
  wrap?: boolean;
  align?: string;
  justify?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: direction,
      gap,
      flexWrap: wrap ? 'wrap' : 'nowrap',
      alignItems: align,
      justifyContent: justify,
      ...style,
    }}>
      {children}
    </div>
  );
}

// 列表项
function ListItem({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      padding: '8px 0',
      borderBottom: '1px solid #f0f0f0',
      ...style,
    }}>
      {children}
    </div>
  );
}

// 分隔线
function Divider({ style }: { style?: React.CSSProperties }) {
  return <hr style={{ border: 'none', borderTop: '1px solid #e8e8e8', margin: '8px 0', ...style }} />;
}

// 间距
function Space({ size = 8, style }: { size?: number | string; style?: React.CSSProperties }) {
  return <div style={{ height: size as number, ...style }} />;
}

// 指标卡
function Metric({ value, label, trend, style }: {
  value: string | number;
  label?: string;
  trend?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{ textAlign: 'center', padding: 16, ...style }}>
      {label && <div style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>{label}</div>}
      <div style={{ fontSize: 32, fontWeight: 'bold', color: '#1890ff' }}>{value}</div>
      {trend && (
        <div style={{
          fontSize: 14,
          color: trend.startsWith('+') ? '#52c41a' : '#ff4d4f',
          marginTop: 4,
        }}>
          {trend}
        </div>
      )}
    </div>
  );
}

// Tab 组件
function Tabs({ schema, data }: { schema: ComponentSchema; data: Record<string, unknown> }) {
  const tabs = schema.tabs || [];
  const [activeTab, setActiveTab] = useState(tabs[0]?.key || '');

  return (
    <div>
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #e8e8e8',
        marginBottom: 16,
      }}>
        {tabs.map(tab => (
          <div
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '8px 16px',
              cursor: 'pointer',
              borderBottom: activeTab === tab.key ? '2px solid #1890ff' : '2px solid transparent',
              color: activeTab === tab.key ? '#1890ff' : '#666',
              fontWeight: activeTab === tab.key ? 500 : 400,
            }}
          >
            {tab.label}
          </div>
        ))}
      </div>
      <div>
        {schema.children && (() => {
          const childSchema = Array.isArray(schema.children)
            ? schema.children.find((c: ComponentSchema) => (c as ComponentSchema)['#if'] === undefined || (c as ComponentSchema)['#if'])
            : schema.children;
          if (!childSchema) return null;
          return (
            <UniversalRender
              schema={childSchema as ComponentSchema}
              data={{ ...data, activeTab }}
            />
          );
        })()}
      </div>
    </div>
  );
}

// 表格组件
function Table({ schema, data }: { schema: ComponentSchema; data: Record<string, unknown> }) {
  const columns = schema.columns || [];
  const eachData = schema['#each'];
  const rawData = eachData ? resolveVariables(eachData, data) : null;
  // 确保 tableData 是数组
  let tableData: Record<string, unknown>[] = [];
  if (Array.isArray(rawData)) {
    tableData = rawData;
  } else if (rawData && typeof rawData === 'object' && 'length' in rawData) {
    // array-like object
    tableData = Array.from(Object.values(rawData)) as Record<string, unknown>[];
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          {columns.map((col: TableColumn) => (
            <th
              key={col.key}
              style={{
                padding: '12px 8px',
                textAlign: col.align || 'left',
                borderBottom: '2px solid #e8e8e8',
                fontWeight: 500,
                color: '#333',
                width: col.width as number | string,
              }}
            >
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {(tableData as Record<string, unknown>[]).map((row, i) => (
          <tr key={i}>
            {columns.map((col: TableColumn) => (
              <td
                key={col.key}
                style={{
                  padding: '10px 8px',
                  textAlign: col.align || 'left',
                  borderBottom: '1px solid #f0f0f0',
                }}
              >
                <UniversalRender
                  schema={{ component: 'text', value: resolveVariables(`\${${col.key}}`, row) as string }}
                  data={row}
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ========== 核心递归渲染器 ==========

function UniversalRender({ schema, data, overrides }: UniversalRenderProps): React.ReactElement | null {
  if (!schema || typeof schema !== 'object') {
    return <div style={{ color: '#ff4d4f' }}>Invalid schema</div>;
  }

  const { component } = schema;

  // 条件渲染
  if ('#if' in schema && !schema['#if']) {
    return null;
  }

  // 循环渲染
  if (schema['#each'] && schema['#eachItem']) {
    const eachData = resolveVariables(schema['#each'], data);
    if (!Array.isArray(eachData)) return null;
    const eachItemSchema = schema['#eachItem'] as ComponentSchema;
    return (
      <>
        {(eachData as Record<string, unknown>[]).map((item, index) => (
          <UniversalRender
            key={index}
            schema={eachItemSchema}
            data={{ ...data, item }}
            overrides={overrides}
          />
        ))}
      </>
    );
  }

  // 子元素解析
  const renderChildren = (): React.ReactNode => {
    const children = schema.children;
    if (!children) return null;
    if (typeof children === 'string') return children;
    if (Array.isArray(children)) {
      return children.map((child, index) => {
        if (!child || typeof child !== 'object') return child;
        return (
          <UniversalRender
            key={index}
            schema={child as ComponentSchema}
            data={data}
            overrides={overrides}
          />
        );
      });
    }
    if (typeof children === 'object') {
      return <UniversalRender schema={children as ComponentSchema} data={data} overrides={overrides} />;
    }
    return null;
  };

  // 合并 props
  const resolvedProps = overrides
    ? { ...resolveVariables(schema.props || {}, data), ...overrides }
    : resolveVariables(schema.props || {}, data) as Record<string, unknown>;
  const style = parseStyle(resolvedProps.style || schema.props?.style);

  // 根据组件类型渲染
  switch (component) {
    case 'text':
      return (
        <Text
          value={String(resolveVariables(schema.value || '', data))}
          size={schema.size}
          weight={schema.weight}
          color={schema.color}
          style={style}
        />
      );

    case 'heading':
      return (
        <Heading level={schema.level} style={style}>
          {renderChildren()}
        </Heading>
      );

    case 'card':
      return <Card style={style}>{renderChildren()}</Card>;

    case 'flex':
      return (
        <Flex
          direction={schema.direction}
          gap={schema.gap}
          wrap={schema.wrap}
          align={schema.align}
          justify={schema.justify}
          style={style}
        >
          {renderChildren()}
        </Flex>
      );

    case 'tabs':
      return <Tabs schema={schema} data={data} />;

    case 'table':
      return <Table schema={schema} data={data} />;

    case 'metric':
      return (
        <Metric
          value={String(resolveVariables(schema.value || '', data))}
          label={resolveVariables(schema.props?.label, data) as string | undefined}
          trend={resolveVariables(schema.props?.trend, data) as string | undefined}
          style={style}
        />
      );

    case 'list':
      return <>{renderChildren()}</>;

    case 'divider':
      return <Divider style={style} />;

    case 'space':
      return <Space size={schema.size as number} style={style} />;

    case 'div':
      return <div {...resolvedProps}>{renderChildren()}</div>;

    case 'span':
      return <span {...resolvedProps}>{renderChildren()}</span>;

    case 'p':
      return <p {...resolvedProps} style={{ margin: 0, ...style }}>{renderChildren()}</p>;

    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6':
      return React.createElement(component, { ...resolvedProps, style }, renderChildren());

    case 'button':
      return <button {...resolvedProps}>{renderChildren()}</button>;

    case 'img':
      return <img {...resolvedProps} />;

    case 'a':
      return <a {...resolvedProps}>{renderChildren()}</a>;

    case 'ul':
      return <ul {...resolvedProps}>{renderChildren()}</ul>;

    case 'ol':
      return <ol {...resolvedProps}>{renderChildren()}</ol>;

    case 'li':
      return <li {...resolvedProps}>{renderChildren()}</li>;

    default:
      return <div {...resolvedProps} style={style}>{renderChildren()}</div>;
  }
}

export { UniversalRender };
export default UniversalRender;
