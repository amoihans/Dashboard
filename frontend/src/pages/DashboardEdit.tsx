import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LayoutGrid, Trash2, Eye, Save, Send } from 'lucide-react';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { Button, message, Segmented, Input } from 'antd';

import { useDashboardStore } from '../stores/dashboardStore';
import { ChartRenderer } from '../components/charts';
import { ComponentPalette } from '../components/edit/ComponentPalette';
import { PropertyPanel } from '../components/edit/PropertyPanel';
import { THEME_COLORS, type ComponentConfig, type ThemeType } from '../types';
import { queryApi } from '../services/api';
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
  const dragPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [editingName, setEditingName] = useState(false);
  // 组件数据
  const [componentData, setComponentData] = useState<Record<string, Record<string, unknown>[]>>({});
  const [dataLoading, setDataLoading] = useState(false);

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
    updateName,
  } = useDashboardStore();

  // 加载单个组件数据
  const loadComponentData = useCallback(async (comp: ComponentConfig) => {
    const { dataSource } = comp;
    if (dataSource.sourceType === 'finance-sql' && dataSource.sql) {
      try {
        const result = await queryApi.financeSql(dataSource.sql);
        setComponentData(prev => ({ ...prev, [comp.id]: result.data }));
      } catch {
        setComponentData(prev => ({ ...prev, [comp.id]: [] }));
      }
    } else if (dataSource.sourceType === 'sql' && dataSource.sql) {
      try {
        const result = await queryApi.sql(dataSource.sql);
        setComponentData(prev => ({ ...prev, [comp.id]: result.data }));
      } catch {
        setComponentData(prev => ({ ...prev, [comp.id]: [] }));
      }
    }
  }, []);

  // 组件数据加载：当组件列表变化时，为每个组件加载数据
  useEffect(() => {
    if (components.length === 0) return;
    setDataLoading(true);
    Promise.all(components.map(loadComponentData)).finally(() => setDataLoading(false));
  }, [components, loadComponentData]);

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

  // 预览：未保存的大屏先保存再跳转
  const handlePreview = async () => {
    if (!currentDashboard?.id) {
      await saveDashboard();
      message.success('已保存，即将跳转预览');
    }
    if (currentDashboard?.id) {
      navigate(`/dashboard/${currentDashboard.id}/preview`);
    }
  };

  const handleDelete = (compId: string) => {
    removeComponent(compId);
  };

  const handlePaletteDragStart = (type: ComponentConfig['type']) => {
    setDraggingType(type);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggingType) return;
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (canvasRect) {
      dragPosRef.current = {
        x: e.clientX - canvasRect.left,
        y: e.clientY - canvasRect.top,
      };
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggingType) return;
    const pos = dragPosRef.current;
    const colWidth = canvasWidth > 0 ? canvasWidth / COLS : 50;
    const gridX = Math.max(0, Math.round(pos.x / colWidth));
    const gridY = Math.max(0, Math.round(pos.y / ROW_HEIGHT));
    addComponent(draggingType, { x: gridX, y: gridY });
    setDraggingType(null);
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
          {editingName ? (
            <Input
              value={currentDashboard?.name || ''}
              onChange={(e) => updateName(e.target.value)}
              onBlur={() => setEditingName(false)}
              onPressEnter={() => setEditingName(false)}
              autoFocus
              style={{ width: 200 }}
              size="small"
            />
          ) : (
            <span
              className="dashboard-name"
              onClick={() => setEditingName(true)}
              title="点击修改名称"
              style={{ cursor: 'text' }}
            >
              {currentDashboard?.name || '新大屏'}
            </span>
          )}
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
          <Button icon={<Eye size={16} />} onClick={handlePreview}>
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
          onDragOver={handleDragOver}
          onDrop={handleDrop}
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
                  <ChartRenderer config={comp} data={componentData[comp.id] || []} loading={dataLoading} />
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
