import { useEffect, useRef, useState } from 'react';
import { Spin, Alert } from 'antd';
import { customComponentApi } from '../../services/api';

// 动态加载 amis SDK
let amisPromise: Promise<any> | null = null;

function loadAmis(): Promise<any> {
  if (amisPromise) return amisPromise;

  amisPromise = new Promise((resolve, reject) => {
    // 如果已经加载，直接返回
    if ((window as any).amis) {
      resolve((window as any).amis);
      return;
    }

    // 加载 SDK JS
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/amis@2.0.0/sdk/sdk.js';
    script.onload = () => {
      // 加载 CSS
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/amis@2.0.0/sdk/sdk.css';
      document.head.appendChild(link);

      // 使用 amisRequire 获取 embed 模块
      const amisRequire = (window as any).amisRequire;
      amisRequire(['amis/embed'], (amis: any) => {
        resolve(amis);
      });
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return amisPromise;
}

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
export function AmisChart({ customComponentId, schema: directSchema, overrides, loading }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSchema, setCurrentSchema] = useState<Record<string, unknown> | null>(null);
  const [currentData, setCurrentData] = useState<Record<string, unknown>>({});
  const [amisInstance, setAmisInstance] = useState<any>(null);
  const currentIdRef = useRef<string | null>(null);

  // 加载 amis SDK
  useEffect(() => {
    loadAmis().then(amis => {
      console.log('[AmisChart] Amis SDK loaded');
      setAmisInstance(amis);
      setIsLoading(false);
    }).catch(err => {
      console.error('[AmisChart] Failed to load Amis SDK:', err);
      setError('Failed to load Amis SDK');
      setIsLoading(false);
    });
  }, []);

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
    if (!customComponentId) {
      setError('No custom component ID');
      return;
    }

    if (currentIdRef.current === customComponentId && currentSchema) {
      return;
    }

    console.log('[AmisChart] Loading schema for:', customComponentId);
    currentIdRef.current = customComponentId;

    customComponentApi.get(customComponentId)
      .then(async (component) => {
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
        }
      })
      .catch(err => {
        console.error('[AmisChart] Fetch error:', err);
        setError(err.message);
      });
  }, [customComponentId, directSchema, overrides]);

  // 渲染 amis
  useEffect(() => {
    if (!amisInstance || !containerRef.current || !currentSchema) return;

    console.log('[AmisChart] Rendering schema:', currentSchema.type);

    try {
      // 清空容器
      containerRef.current.innerHTML = '';

      // 渲染
      amisInstance.embed(
        containerRef.current,
        currentSchema as any,
        currentData as any,
        {
          fetcher: async () => ({ status: 200, headers: {}, data: { status: 200, msg: 'ok', data: {} } } as any),
        }
      );
    } catch (e) {
      console.error('[AmisChart] Render error:', e);
      setError((e as Error).message);
    }
  }, [amisInstance, currentSchema, currentData]);

  if (isLoading || loading) {
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
}
