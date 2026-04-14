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

// 用于大屏编辑页面的 iframe 渲染版本
export function AmisChart({ customComponentId, schema: directSchema, overrides, loading }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  // 使用 commId 区分不同的 iframe 实例
  const commId = customComponentId || 'default';
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadedSchema, setLoadedSchema] = useState<Record<string, unknown> | null>(null);
  const [loadedData, setLoadedData] = useState<Record<string, unknown>>({});

  // 监听 iframe 就绪消息 - 只处理 commId 匹配的消息
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // 只处理来自自己的 iframe 的消息
      if (event.data?.commId !== commId) return;

      console.log('[AmisChart] Received message for', commId, ':', event.data);
      if (event.data?.type === 'iframe-ready') {
        console.log('[AmisChart] iframe is ready for', commId);
        setIsReady(true);
        setIsLoading(false);
      }
      if (event.data?.type === 'iframe-error') {
        setError(event.data?.message || '加载失败');
        setIsLoading(false);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [commId]);

  // 发送 schema 给 iframe
  const sendToIframe = useCallback((schema: Record<string, unknown> | null, data: Record<string, unknown>) => {
    if (!iframeRef.current?.contentWindow) {
      console.log('[AmisChart] iframe not ready for', commId, ', retrying...');
      setTimeout(() => sendToIframe(schema, data), 50);
      return;
    }
    console.log('[AmisChart] Sending to iframe', commId, ':', schema?.type, data);
    iframeRef.current.contentWindow.postMessage(
      { type: 'amis-schema-update', schema, data, commId },
      '*'
    );
  }, [commId]);

  // 当 iframe 就绪后，如果有已加载的数据就发送
  useEffect(() => {
    if (isReady && loadedSchema) {
      console.log('[AmisChart] iframe ready, sending loaded schema');
      sendToIframe(loadedSchema, loadedData);
    }
  }, [isReady, loadedSchema, loadedData, sendToIframe]);

  // 直接传入 schema 模式
  useEffect(() => {
    if (directSchema) {
      console.log('[AmisChart] Direct schema mode:', directSchema);
      setLoadedSchema(directSchema);
      setLoadedData(overrides?.exampleData
        ? { items: overrides.exampleData as Record<string, unknown>[] }
        : {});
      setError(null);
      setIsLoading(false);
    }
  }, [directSchema, overrides]);

  // 通过 customComponentId 加载 schema
  useEffect(() => {
    if (directSchema) return; // 直接 schema 模式不加载

    if (!customComponentId) {
      setError('No custom component ID');
      setIsLoading(false);
      return;
    }

    console.log('[AmisChart] Loading schema for:', customComponentId);
    setIsLoading(true);
    setError(null);

    customComponentApi.get(customComponentId)
      .then(async (component) => {
        try {
          const parsed = JSON.parse(component.json_schema);
          console.log('[AmisChart] Parsed schema:', parsed);
          const finalSchema = parsed.type === 'page' ? parsed : { type: 'page', body: parsed };
          setLoadedSchema(finalSchema);

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

          setLoadedData(renderData);
          console.log('[AmisChart] Loaded data:', renderData);

          // 如果 iframe 已就绪，立即发送
          if (isReady) {
            sendToIframe(finalSchema, renderData);
          }
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
  }, [customComponentId, directSchema, isReady, overrides, sendToIframe]);

  // 当 schema 或 data 变化时，如果 iframe 已就绪就发送
  useEffect(() => {
    if (isReady && loadedSchema) {
      console.log('[AmisChart] Schema/data changed, sending to iframe');
      sendToIframe(loadedSchema, loadedData);
    }
  }, [loadedSchema, loadedData, isReady, sendToIframe]);

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

  return (
    <div className="amis-chart-wrapper" style={{ width: '100%', height: '100%' }}>
      <iframe
        ref={iframeRef}
        src={`/amis-preview/index.html?commId=${commId}`}
        title="Amis Preview"
        style={{ width: '100%', height: '100%', border: 'none' }}
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
}
