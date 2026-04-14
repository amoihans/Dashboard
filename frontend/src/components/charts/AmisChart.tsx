import { useEffect, useState, useRef, memo } from 'react';
import { Spin, Alert } from 'antd';
import { customComponentApi } from '../../services/api';
import { useAmis } from '../../hooks/useAmis';

interface Props {
  /** 自定义组件 ID */
  customComponentId?: string;
  /** 直接传入的 amis schema (page 类型) */
  schema?: Record<string, unknown>;
  /** 预览数据 */
  data?: Record<string, unknown>;
  /** 自定义覆盖配置 */
  overrides?: Record<string, unknown>;
  loading?: boolean;
}

// 直接使用 amis SDK 渲染（不用 iframe）
export const AmisChart = memo(function AmisChart({ customComponentId, schema: directSchema, overrides, loading }: Props) {
  const [currentSchema, setCurrentSchema] = useState<Record<string, unknown> | null>(null);
  const [currentData, setCurrentData] = useState<Record<string, unknown>>({});
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentIdRef = useRef<string | null>(null);

  const { containerRef, isLoading } = useAmis({
    schema: currentSchema,
    data: currentData,
  });

  // 直接传入 schema 模式
  useEffect(() => {
    if (directSchema) {
      console.log('[AmisChart] Direct schema mode');
      setCurrentSchema(directSchema);
      setCurrentData(overrides?.exampleData
        ? { items: overrides.exampleData as Record<string, unknown>[] }
        : {});
      setError(null);
    }
  }, [directSchema, overrides]);

  // 通过 customComponentId 加载 schema
  useEffect(() => {
    if (directSchema) return;
    if (!customComponentId) return;

    // 避免重复加载同一个组件
    if (currentIdRef.current === customComponentId) return;

    console.log('[AmisChart] Loading schema for:', customComponentId);
    currentIdRef.current = customComponentId;
    setIsFetching(true);
    setError(null);

    customComponentApi.get(customComponentId)
      .then(async (component) => {
        // 检查是否仍然是同一个组件
        if (currentIdRef.current !== customComponentId) {
          console.log('[AmisChart] Component changed, ignoring response');
          return;
        }

        try {
          const parsed = JSON.parse(component.json_schema);
          console.log('[AmisChart] Parsed schema:', parsed);
          const finalSchema = parsed.type === 'page' ? parsed : { type: 'page', body: parsed };
          setCurrentSchema(finalSchema);

          // 解析数据源配置
          let dataSourceConfig: { sourceType: string; exampleData?: unknown[]; sql?: string } = { sourceType: 'inline' };
          if (component.data_source_config) {
            try {
              dataSourceConfig = JSON.parse(component.data_source_config);
            } catch {}
          }

          let renderData: Record<string, unknown> = {};

          if (dataSourceConfig.sourceType === 'sql' && dataSourceConfig.sql) {
            try {
              const result = await customComponentApi.previewSql(dataSourceConfig.sql);
              renderData = { items: result.data || [] };
            } catch {
              renderData = {};
            }
          } else {
            const exampleData = (overrides?.exampleData as Record<string, unknown>[]) ||
              (dataSourceConfig.exampleData as Record<string, unknown>[]) || [];
            if (exampleData.length > 0) {
              renderData = exampleData.length === 1
                ? exampleData[0]
                : { items: exampleData };
            }
          }

          setCurrentData(renderData);
          console.log('[AmisChart] Loaded data:', renderData);
        } catch (e) {
          console.error('[AmisChart] Error:', e);
          setError('Invalid JSON schema');
        } finally {
          setIsFetching(false);
        }
      })
      .catch(err => {
        console.error('[AmisChart] Fetch error:', err);
        setError(err.message);
        setIsFetching(false);
      });
  }, [customComponentId, directSchema, overrides]);

  const showLoading = isLoading || loading || isFetching;

  if (showLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Spin />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 16, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Alert type="error" message="加载失败" description={error} showIcon />
      </div>
    );
  }

  if (!customComponentId && !directSchema) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999' }}>
        未选择组件
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="amis-chart-wrapper"
      style={{ width: '100%', height: '100%', overflow: 'auto' }}
    />
  );
});
