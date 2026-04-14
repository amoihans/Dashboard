import { useEffect, useState } from 'react';
import { Spin, Alert } from 'antd';
import { Eye } from 'lucide-react';
import { useAmis } from '../../hooks/useAmis';
import './AmisPreview.css';

interface AmisPreviewProps {
  schema: Record<string, unknown> | null;
  data: Record<string, unknown>;
  loading?: boolean;
}

export function AmisPreview({ schema, data, loading }: AmisPreviewProps) {
  const [isFetching, setIsFetching] = useState(false);

  const { containerRef, isLoading, error } = useAmis({
    schema: schema,
    data: data,
  });

  const showLoading = isLoading || loading || isFetching;

  useEffect(() => {
    if (loading) {
      setIsFetching(true);
    } else {
      setIsFetching(false);
    }
  }, [loading]);

  const renderContent = () => {
    if (showLoading) {
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

    if (error) {
      return (
        <div className="preview-error">
          <Alert type="error" message="渲染失败" description={error} showIcon />
        </div>
      );
    }

    return (
      <div
        ref={containerRef}
        className="amis-preview-container"
        style={{ width: '100%', height: '100%' }}
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
          {showLoading ? '加载中...' : schema ? '已渲染' : '等待生成'}
        </span>
      </div>

      <div className="preview-content">{renderContent()}</div>
    </div>
  );
}
