import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LayoutGrid, Trash2, Eye, Save, Send } from 'lucide-react';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { Button, message } from 'antd';

import { useDashboardStore } from '../stores/dashboardStore';
import { ChartRenderer } from '../components/charts';
import { ComponentPalette } from '../components/edit/ComponentPalette';
import { PropertyPanel } from '../components/edit/PropertyPanel';
import './DashboardEdit.css';

const COLS = 24;
const ROW_HEIGHT = 50;

export function DashboardEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

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
  } = useDashboardStore();

  useEffect(() => {
    if (isNew) {
      newDashboard('未命名大屏');
    } else {
      loadDashboard(id!);
    }
  }, [id]);

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

  const handleDelete = (id: string) => {
    removeComponent(id);
  };

  const selectedComponent = components.find(c => c.id === selectedComponentId) || null;

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
        <ComponentPalette onAdd={addComponent} />

        {/* 中间画布 */}
        <div className="edit-canvas">
          <GridLayout
            className="layout"
            layout={layout}
            cols={COLS}
            rowHeight={ROW_HEIGHT}
            width={1200}
            onLayoutChange={(newLayout) => updateLayout([...newLayout])}
            draggableHandle=".component-header"
            isResizable
            compactType="vertical"
          >
            {components.map(comp => (
              <div key={comp.id} className="grid-item">
                <div
                  className="component-header"
                  onClick={() => selectComponent(comp.id)}
                  style={{ cursor: 'move' }}
                >
                  <span className="component-title">{comp.title}</span>
                  <Button
                    type="text"
                    size="small"
                    icon={<Trash2 size={14} />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(comp.id);
                    }}
                  />
                </div>
                <div className="component-body">
                  <ChartRenderer config={comp} data={[]} />
                </div>
                {selectedComponentId === comp.id && <div className="selected-border" />}
              </div>
            ))}
          </GridLayout>

          {components.length === 0 && (
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
