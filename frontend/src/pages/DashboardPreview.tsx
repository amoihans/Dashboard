import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Button, message } from 'antd';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { dashboardApi } from '../services/api';
import { ChartRenderer } from '../components/charts';
import type { ComponentConfig, LayoutItem } from '../types';
import './DashboardPreview.css';

const COLS = 24;
const ROW_HEIGHT = 50;

export function DashboardPreview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [layout, setLayout] = useState<LayoutItem[]>([]);
  const [components, setComponents] = useState<ComponentConfig[]>([]);
  const [componentData, setComponentData] = useState<Record<string, Record<string, unknown>[]>>({});
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const displayData = await dashboardApi.getDisplay(id);
      const comps = displayData.components as ComponentConfig[];
      setLayout(displayData.layout as LayoutItem[]);
      setComponents(comps);

      // 刷新数据
      const refreshResult = await dashboardApi.refreshDisplay(id);
      const dataMap: Record<string, Record<string, unknown>[]> = {};
      refreshResult.components.forEach(c => {
        dataMap[c.id] = c.data;
      });
      setComponentData(dataMap);
    } catch (e: unknown) {
      message.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  return (
    <div className="preview-page">
      <div className="preview-toolbar">
        <Button icon={<ArrowLeft size={16} />} onClick={() => navigate(-1)}>
          返回
        </Button>
        <span className="preview-title">预览模式</span>
        <Button icon={<RefreshCw size={16} />} onClick={loadData}>
          刷新数据
        </Button>
      </div>

      <div className="preview-canvas">
        <GridLayout
          className="layout"
          layout={layout}
          cols={COLS}
          rowHeight={ROW_HEIGHT}
          width={1920}
          isDraggable={false}
          isResizable={false}
        >
          {components.map(comp => (
            <div key={comp.id} className="grid-item">
              <div className="component-header">
                <span className="component-title">{comp.title}</span>
              </div>
              <div className="component-body">
                <ChartRenderer
                  config={comp}
                  data={componentData[comp.id] || []}
                  loading={loading}
                />
              </div>
            </div>
          ))}
        </GridLayout>
      </div>
    </div>
  );
}
