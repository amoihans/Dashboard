import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Button, message, Segmented } from 'antd';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { dashboardApi } from '../services/api';
import { ChartRenderer } from '../components/charts';
import { THEME_COLORS, type ThemeType, type ComponentConfig, type LayoutItem } from '../types';
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
  const [theme, setTheme] = useState<ThemeType>('dark');

  const themeColors = THEME_COLORS[theme];

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const displayData = await dashboardApi.getDisplay(id);
      const comps = displayData.components as ComponentConfig[];
      const lay = displayData.layout as LayoutItem[];
      setLayout(lay);
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
    <div className="preview-page" style={{ background: themeColors.bg }}>
      <div className="preview-toolbar" style={{ background: themeColors.card, borderColor: themeColors.border }}>
        <Button
          icon={<ArrowLeft size={16} />}
          onClick={() => navigate(-1)}
          style={{ color: themeColors.text, borderColor: themeColors.border }}
        >
          返回
        </Button>
        <span className="preview-title" style={{ color: themeColors.text }}>预览模式</span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: themeColors.text, fontSize: 13 }}>主题:</span>
          <Segmented
            value={theme}
            onChange={(val) => setTheme(val as ThemeType)}
            options={Object.entries(THEME_COLORS).map(([key, v]) => ({
              label: v.label,
              value: key,
            }))}
            size="small"
          />
        </div>

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
