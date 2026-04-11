import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LayoutGrid, Trash2, Eye, Save, Send } from 'lucide-react';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { Button, message, Segmented } from 'antd';

import { useDashboardStore } from '../stores/dashboardStore';
import { ChartRenderer } from '../components/charts';
import { ComponentPalette } from '../components/edit/ComponentPalette';
import { PropertyPanel } from '../components/edit/PropertyPanel';
import { THEME_COLORS, type ComponentConfig, type LayoutItem, type ThemeType } from '../types';
import './DashboardEdit.css';

const COLS = 24;
const ROW_HEIGHT = 50;

export function DashboardEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';
  const canvasRef = useRef<HTMLDivElement>(null);

  // 拖拽状态
  const [draggingType, setDraggingType] = useState<ComponentConfig['type'] | null>(null);
  const [canvasWidth, setCanvasWidth] = useState(1200);
  // 用 ref 追踪拖拽位置，避免闭包问题
  const dragPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const {
    currentDashboard,
    components,
    layout,
    selectedComponentId,
    loading,
    error,
    loadDashboard,
    newDashboard,
    saveDashboard,
    publishDashboard,
    addComponent,
    removeComponent,
    selectComponent,
    updateLayout,
    updateTheme,
  } = useDashboardStore();

  useEffect(() => {
    if (isNew) {
      newDashboard('未命名大屏');
    } else {
      loadDashboard(id!);
    }
  }, [id]);

  // 动态计算画布宽度
  useEffect(() => {
    const updateWidth = () => {
      if (canvasRef.current) {
        setCanvasWidth(canvasRef.current.clientWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const handleSave = async () => {
    await saveDashboard();
    message.success('保存成功');
  };

  const handlePublish = async () => {
    if (!currentDashboard?.id) {
      await saveDashboard();
    }
    await publishDashboard();
    message.success('发布成功');
  };

  const handleDelete = (compId: string) => {
    removeComponent(compId);
  };

  // 从组件面板拖拽开始
  const handlePaletteDragStart = (type: ComponentConfig['type']) => {
    setDraggingType(type);
  };

  // 拖拽到画布放下 - 使用 ref 中的实时拖拽位置
  const handleDrop = (_layout: LayoutItem[], _layoutItem: LayoutItem) => {
    if (!draggingType) return;
    // 使用 ref 中捕获的最新拖拽坐标
    const pos = dragPosRef.current;
    const colWidth = canvasWidth > 0 ? canvasWidth / COLS : 50;
    const gridX = Math.max(0, Math.round(pos.x / colWidth));
    const gridY = Math.max(0, Math.round(pos.y / ROW_HEIGHT));
    addComponent(draggingType, { x: gridX, y: gridY });
    setDraggingType(null);
  };

  // 组件面板拖拽中 - 实时更新 ref 坐标
  const handlePaletteDragOver = (e: React.DragEvent) => {
    if (!draggingType) return;
    // 计算相对于画布的坐标
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (canvasRect) {
      dragPosRef.current = {
        x: e.clientX - canvasRect.left,
        y: e.clientY - canvasRect.top,
      };
    }
  };

  const selectedComponent = components.find(c => c.id === selectedComponentId) || null;
  const theme = currentDashboard?.theme || 'light';
  const themeColors = THEME_COLORS[theme as ThemeType];

  if (loading) return <div className="edit-loading">加载中...</div>;
  if (error) return <div className="edit-error">{error}</div>;

  return (
    <div className="edit-page">
      {/* 顶部工具栏 */}
      <div className="edit-toolbar">
        <div className="toolbar-left">
          <Button icon={<LayoutGrid size={16} />} onClick={() => navigate('/')}>
            返回
          </Button>
          <span className="dashboard-name">{currentDashboard?.name || '新大屏'}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: '#666' }}>主题:</span>
          <Segmented
            value={theme}
            onChange={(val) => updateTheme(val as ThemeType)}
            options={Object.entries(THEME_COLORS).map(([key, v]) => ({
              label: v.label,
              value: key,
            }))}
            size="small"
          />
        </div>

        <div className="toolbar-right">
          <Button icon={<Save size={16} />} onClick={handleSave}>
            保存
          </Button>
          <Button
            icon={<Eye size={16} />}
            onClick={() => currentDashboard?.id && navigate(`/dashboard/${currentDashboard.id}/preview`)}
            disabled={!currentDashboard?.id}
          >
            预览
          </Button>
          <Button type="primary" icon={<Send size={16} />} onClick={handlePublish}>
            发布
          </Button>
        </div>
      </div>

      <div className="edit-body">
        {/* 左侧组件面板 */}
        <ComponentPalette onDragStart={handlePaletteDragStart} />

        {/* 中间画布 */}
        <div
          className="edit-canvas"
          ref={canvasRef}
          onDragOver={(e) => {
            e.preventDefault();
            handlePaletteDragOver(e);
          }}
        >
          <GridLayout
            className="layout"
            layout={layout}
            cols={COLS}
            rowHeight={ROW_HEIGHT}
            width={canvasWidth}
            onLayoutChange={(newLayout) => updateLayout([...newLayout])}
            draggableHandle=".component-header"
            isResizable
            compactType="vertical"
            isDroppable
            onDrop={handleDrop}
            droppingItem={{ i: '__dropping__', w: 6, h: 4 }}
          >
            {components.map(comp => (
              <div
                key={comp.id}
                className="grid-item"
                style={{ background: themeColors.card, borderColor: themeColors.border }}
              >
                <div
                  className="component-header"
                  onMouseDown={(e) => {
                    if (e.button === 0) {
                      selectComponent(comp.id);
                    }
                  }}
                  style={{ cursor: 'move', background: themeColors.card, borderColor: themeColors.border }}
                >
                  <span className="component-title" style={{ color: themeColors.text }}>{comp.title}</span>
                  <span
                    className="delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(comp.id);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <Trash2 size={14} />
                  </span>
                </div>
                <div className="component-body">
                  <ChartRenderer config={comp} data={[]} />
                </div>
                {selectedComponentId === comp.id && <div className="selected-border" />}
              </div>
            ))}
          </GridLayout>

          {components.length === 0 && !draggingType && (
            <div className="empty-canvas">
              从左侧拖拽组件到此处开始构建大屏
            </div>
          )}
        </div>

        {/* 右侧属性面板 */}
        <PropertyPanel
          component={selectedComponent}
          onUpdate={(updates) => {
            if (selectedComponentId) {
              useDashboardStore.getState().updateComponent(selectedComponentId, updates);
            }
          }}
        />
      </div>
    </div>
  );
}
