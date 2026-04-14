import { useEffect, useState, useRef, useCallback } from 'react';
import { Spin, Alert } from 'antd';
import { customComponentApi } from '../../services/api';

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

// 使用 iframe 渲染 amis 的版本
export function AmisChart({ customComponentId, schema: directSchema, overrides, loading }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSchema, setCurrentSchema] = useState<Record<string, unknown> | null>(null);
  const [currentData, setCurrentData] = useState<Record<string, unknown>>({});
  // 标记当前组件 ID，避免重复加载
  const currentIdRef = useRef<string | null>(null);

  // 监听 iframe 就绪消息
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'iframe-ready' && event.data?.commId === customComponentId) {
        console.log('[AmisChart] iframe is ready for', customComponentId);
        setIsReady(true);
        setIsLoading(false);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [customComponentId]);

  // 发送 schema 给 iframe
  const sendToIframe = useCallback((schema: Record<string, unknown> | null, data: Record<string, unknown>) => {
    if (!iframeRef.current?.contentWindow) {
      console.log('[AmisChart] iframe not ready, retrying...');
      setTimeout(() => sendToIframe(schema, data), 50);
      return;
    }
    console.log('[AmisChart] Sending to iframe:', schema?.type);
    iframeRef.current.contentWindow.postMessage(
      { type: 'amis-schema-update', schema, data, commId: customComponentId },
      '*'
    );
  }, [customComponentId]);

  // 当 iframe 就绪后，如果有 schema 就发送
  useEffect(() => {
    if (isReady && currentSchema) {
      console.log('[AmisChart] iframe ready, sending schema');
      sendToIframe(currentSchema, currentData);
    }
  }, [isReady, currentSchema, currentData, sendToIframe]);

  // 直接传入 schema 模式
  useEffect(() => {
    if (directSchema) {
      console.log('[AmisChart] Direct schema mode');
      setCurrentSchema(directSchema);
      setCurrentData(overrides?.exampleData
        ? { items: overrides.exampleData as Record<string, unknown>[] }
        : {});
      setError(null);
      setIsLoading(false);
    }
  }, [directSchema, overrides]);

  // 通过 customComponentId 加载 schema
  useEffect(() => {
    if (directSchema) return;
    if (!customComponentId) {
      setError('No custom component ID');
      setIsLoading(false);
      return;
    }

    // 避免重复加载同一个组件
    if (currentIdRef.current === customComponentId && currentSchema) {
      console.log('[AmisChart] Schema already loaded for', customComponentId);
      return;
    }

    console.log('[AmisChart] Loading schema for:', customComponentId);
    currentIdRef.current = customComponentId;
    setIsLoading(true);
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
          setIsLoading(false);
        }
      })
      .catch(err => {
        console.error('[AmisChart] Fetch error:', err);
        setError(err.message);
        setIsLoading(false);
      });
  }, [customComponentId, directSchema, overrides]);

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

  // 只有当 customComponentId 存在时才渲染 iframe
  if (!customComponentId && !directSchema) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999' }}>
        未选择组件
      </div>
    );
  }

  return (
    <div className="amis-chart-wrapper" style={{ width: '100%', height: '100%' }}>
      <iframe
        ref={iframeRef}
        src={`/amis-preview/index.html?commId=${customComponentId}`}
        title="Amis Preview"
        style={{ width: '100%', height: '100%', border: 'none' }}
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
}
