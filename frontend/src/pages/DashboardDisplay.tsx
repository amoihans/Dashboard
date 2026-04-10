import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { dashboardApi } from '../services/api';
import { ChartRenderer } from '../components/charts';
import type { ComponentConfig, LayoutItem } from '../types';
import './DashboardDisplay.css';

const COLS = 24;
const ROW_HEIGHT = 50;

export function DashboardDisplay() {
  const { id } = useParams<{ id: string }>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<LayoutItem[]>([]);
  const [components, setComponents] = useState<ComponentConfig[]>([]);
  const [componentData, setComponentData] = useState<Record<string, Record<string, unknown>[]>>({});
  const refreshTimersRef = useRef<Record<string, number>>({});

  const loadData = async () => {
    if (!id) return;
    try {
      const displayData = await dashboardApi.getDisplay(id);
      const comps = displayData.components as ComponentConfig[];
      setLayout(displayData.layout as LayoutItem[]);
      setComponents(comps);

      const refreshResult = await dashboardApi.refreshDisplay(id);
      const dataMap: Record<string, Record<string, unknown>[]> = {};
      refreshResult.components.forEach(c => {
        dataMap[c.id] = c.data;
      });
      setComponentData(dataMap);
    } catch (e) {
      console.error('加载大屏数据失败:', e);
    }
  };

  useEffect(() => {
    loadData();

    // 设置自动刷新
    components.forEach(comp => {
      if (comp.refreshInterval && comp.refreshInterval > 0) {
        const timer = window.setInterval(() => {
          // 单个组件刷新
          dashboardApi.refreshDisplay(id!).then(res => {
            const dataMap: Record<string, Record<string, unknown>[]> = {};
            res.components.forEach(c => { dataMap[c.id] = c.data; });
            setComponentData(prev => ({ ...prev, [comp.id]: dataMap[comp.id] || [] }));
          });
        }, comp.refreshInterval * 1000);
        refreshTimersRef.current[comp.id] = timer;
      }
    });

    return () => {
      Object.values(refreshTimersRef.current).forEach(clearInterval);
    };
  }, [id]);

  const width = containerRef.current?.clientWidth || 1920;

  return (
    <div className="display-page" ref={containerRef}>
      <GridLayout
        className="layout"
        layout={layout}
        cols={COLS}
        rowHeight={ROW_HEIGHT}
        width={width}
        isDraggable={false}
        isResizable={false}
        margin={[8, 8]}
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
              />
            </div>
          </div>
        ))}
      </GridLayout>
    </div>
  );
}
