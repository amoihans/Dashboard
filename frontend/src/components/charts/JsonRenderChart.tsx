import { useEffect, useState } from 'react';
import { Spin } from 'antd';
import { customComponentApi } from '../../services/api';
import { UniversalRender } from './UniversalRender';
import type { ComponentSchema } from './UniversalRender';
import type { DataSourceConfig } from '../../types';

// 将数组数据转换为键值对对象
function getDataAsObject(data: Record<string, unknown>[] | Record<string, unknown>): Record<string, unknown> {
  console.log('[JsonRenderChart] getDataAsObject input:', JSON.stringify(data)?.slice(0, 200));
  // 如果是对象（非数组），直接返回
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    // data 是空或数组，按原逻辑处理
    if (Array.isArray(data)) {
      if (data.length === 0) return {};
      if (data.length === 1) {
        console.log('[JsonRenderChart] Single item array - unwrapping to:', data[0]);
        return data[0];
      }
      console.log('[JsonRenderChart] Multi-item array - wrapping in { items }');
      return { items: data };
    }
    return {};
  }
  // data 是普通对象，直接返回（支持 { activeTab, domestic, foreign } 结构）
  console.log('[JsonRenderChart] Non-array object - returning as-is');
  return data;
}

interface Props {
  customComponentId?: string;
  schema?: Record<string, unknown>;
  data: Record<string, unknown>[];
  overrides?: Record<string, unknown>;
  loading?: boolean;
}

export function JsonRenderChart({ customComponentId, schema: directSchema, data: directData, overrides, loading }: Props) {
  const [schema, setSchema] = useState<Record<string, unknown> | null>(null);
  const [renderData, setRenderData] = useState<Record<string, unknown>[]>([]);
  const [schemaLoading, setSchemaLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载 schema 和数据
  useEffect(() => {
    // 模式1: 直接传入 schema（Builder 预览模式）
    if (directSchema) {
      console.log('[JsonRenderChart] Direct mode - schema:', directSchema);
      console.log('[JsonRenderChart] Direct mode - data:', directData);
      setSchema(directSchema);
      setRenderData(directData || []);
      setSchemaLoading(false);
      return;
    }

    if (!customComponentId) {
      setError('No custom component ID');
      setSchemaLoading(false);
      return;
    }

    setSchemaLoading(true);
    setError(null);

    customComponentApi.get(customComponentId)
      .then(async (component) => {
        try {
          // 解析 schema - 支持新旧两种格式
          const parsed = JSON.parse(component.json_schema);
          // 新格式: { version: "1.0", root: {...}, exampleData: [...] }
          // 旧格式: 直接是组件 schema 对象
          const schemaRoot = parsed.version === '1.0' ? parsed.root : parsed;
          setSchema(schemaRoot as Record<string, unknown>);

          // 解析数据源配置
          let dataSourceConfig: DataSourceConfig = { sourceType: 'inline' };
          if (component.data_source_config) {
            try {
              dataSourceConfig = JSON.parse(component.data_source_config);
            } catch {
              // 忽略解析错误
            }
          }

          // 加载数据
          setDataLoading(true);
          let finalData: Record<string, unknown>[] = [];

          if (dataSourceConfig.sourceType === 'sql' && dataSourceConfig.sql) {
            // SQL 模式
            try {
              const result = await customComponentApi.previewSql(dataSourceConfig.sql);
              // result.data 是数组的数组 [[val1, val2], [val1, val2]]
              // 需要转换为对象数组
              const columns = result.columns || [];
              finalData = (result.data as unknown[][]).map(row =>
                Object.fromEntries(row.map((val, i) => [columns[i], val]))
              );
            } catch {
              // SQL 查询失败，使用空数据
              finalData = [];
            }
          } else if (dataSourceConfig.sourceType === 'inline') {
            // inline 模式，使用 exampleData（优先使用 overrides 中的 exampleData）
            finalData = (overrides?.exampleData as Record<string, unknown>[]) || dataSourceConfig.exampleData || [];
          } else {
            // 旧格式 fallback
            finalData = [];
          }

          setRenderData(finalData);
        } catch {
          setError('Invalid JSON schema');
        }
      })
      .catch(err => setError(err.message))
      .finally(() => {
        setSchemaLoading(false);
        setDataLoading(false);
      });
  }, [customComponentId, directSchema]);

  if (schemaLoading || loading || dataLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Spin />
      </div>
    );
  }

  if (error || !schema) {
    return (
      <div style={{ padding: 16, color: '#ff4d4f', fontSize: 13 }}>
        {error || 'Failed to load schema'}
      </div>
    );
  }

  // 如果 overrides 中有 exampleData，使用它代替 renderData
  const finalData = (overrides?.exampleData as Record<string, unknown>[]) || renderData;
  const dataObj = getDataAsObject(finalData);
  console.log('[JsonRenderChart] Final dataObj passed to UniversalRender:', JSON.stringify(dataObj)?.slice(0, 200));

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'auto', padding: 16 }}>
      <UniversalRender
        schema={schema as ComponentSchema}
        data={dataObj}
        overrides={overrides}
      />
    </div>
  );
}
