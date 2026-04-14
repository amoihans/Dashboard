import { useEffect, useState, useRef } from 'react';
import { Spin, Alert } from 'antd';
import { Eye } from 'lucide-react';
import './AmisPreview.css';

interface AmisPreviewProps {
  schema: Record<string, unknown> | null;
  data: Record<string, unknown>;
  loading?: boolean;
}

export function AmisPreview({ schema, data, loading }: AmisPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);

  // 监听 iframe 就绪消息
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log('[AmisPreview] Received message:', event.data);
      if (event.data?.type === 'iframe-ready') {
        console.log('[AmisPreview] iframe is ready');
        setIsReady(true);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // 向 iframe 发送 schema 更新
  useEffect(() => {
    console.log('[AmisPreview] isReady:', isReady, 'schema:', schema ? 'provided' : 'null');
    if (!isReady || !iframeRef.current?.contentWindow) return;

    console.log('[AmisPreview] Sending schema to iframe');
    try {
      iframeRef.current.contentWindow.postMessage(
        {
          type: 'amis-schema-update',
          schema,
          data,
        },
        '*'
      );
      console.log('[AmisPreview] Message sent successfully');
    } catch (e) {
      console.error('[AmisPreview] Failed to send schema to iframe:', e);
    }
  }, [isReady, schema, data]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="preview-loading">
          <Spin />
          <span>渲染中...</span>
        </div>
      );
    }

    if (!schema) {
      return (
        <div className="preview-empty">
          <Alert
            type="info"
            message="暂无预览内容"
            description="在左侧与 Agent 对话，或在右侧编辑 JSON 来生成组件"
            showIcon
          />
        </div>
      );
    }

    return (
      <iframe
        ref={iframeRef}
        className="amis-iframe"
        src="/amis-preview/index.html"
        title="Amis Preview"
        sandbox="allow-scripts allow-same-origin"
      />
    );
  };

  return (
    <div className="amis-preview">
      <div className="preview-header">
        <div className="header-left">
          <Eye size={14} />
          <span>实时预览</span>
        </div>
        <span style={{ fontSize: 12, color: '#999' }}>
          {loading ? '加载中...' : schema ? '已渲染' : '等待生成'}
        </span>
      </div>

      <div className="preview-content">{renderContent()}</div>
    </div>
  );
}
