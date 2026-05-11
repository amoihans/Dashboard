import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import { dashboardApi } from '../services/api';
import { ChartRenderer } from '../components/charts';
import { THEME_COLORS, type ThemeType, type ComponentConfig, type LayoutItem } from '../types';
import './DashboardDisplay.css';

const COLS = 24;
const ROW_HEIGHT = 50;

export function DashboardDisplay() {
  const { id } = useParams<{ id: string }>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<LayoutItem[]>([]);
  const [components, setComponents] = useState<ComponentConfig[]>([]);
  const [componentData, setComponentData] = useState<Record<string, Record<string, unknown>[]>>({});
  const [theme, setTheme] = useState<ThemeType>('dark');
  const refreshTimersRef = useRef<Record<string, number>>({});

  const themeColors = THEME_COLORS[theme];

  const loadData = async () => {
    if (!id) return;
    try {
      const displayData = await dashboardApi.getDisplay(id);
      const comps = displayData.components as ComponentConfig[];
      const lay = displayData.layout as LayoutItem[];
      setLayout(lay);
      setComponents(comps);
      setTheme((displayData.theme as ThemeType) || 'dark');

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

    return () => {
      Object.values(refreshTimersRef.current).forEach(clearInterval);
    };
  }, [id]);

  // 设置自动刷新
  useEffect(() => {
    Object.values(refreshTimersRef.current).forEach(clearInterval);
    refreshTimersRef.current = {};

    components.forEach(comp => {
      if (comp.refreshInterval && comp.refreshInterval > 0) {
        const timer = window.setInterval(() => {
          dashboardApi.refreshDisplay(id!).then(res => {
            const dataMap: Record<string, Record<string, unknown>[]> = {};
            res.components.forEach(c => { dataMap[c.id] = c.data; });
            setComponentData(prev => ({ ...prev, [comp.id]: dataMap[comp.id] || [] }));
          });
        }, comp.refreshInterval * 1000);
        refreshTimersRef.current[comp.id] = timer;
      }
    });
  }, [components, id]);

  const width = containerRef.current?.clientWidth || 1920;

  return (
    <div className="display-page" ref={containerRef} style={{ background: themeColors.bg }}>
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
          <div
            key={comp.id}
            className="grid-item"
            style={{ background: themeColors.card, borderColor: themeColors.border }}
          >
            <div className="component-header" style={{ background: themeColors.card, borderColor: themeColors.border }}>
              <span className="component-title" style={{ color: themeColors.text }}>{comp.title}</span>
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
