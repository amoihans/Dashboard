import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, PieChart, Gauge, Activity, Hash, Table2, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ComponentConfig } from '../../types';
import { useCustomComponentStore } from '../../stores/customComponentStore';
import './ComponentPalette.css';

const COMPONENT_TYPES: { type: ComponentConfig['type']; label: string; icon: React.ReactNode }[] = [
  { type: 'line', label: '折线图', icon: <TrendingUp size={20} /> },
  { type: 'bar', label: '柱状图', icon: <BarChart3 size={20} /> },
  { type: 'pie', label: '饼图', icon: <PieChart size={20} /> },
  { type: 'gauge', label: '仪表盘', icon: <Gauge size={20} /> },
  { type: 'candlestick', label: 'K线图', icon: <Activity size={20} /> },
  { type: 'number', label: '数字卡片', icon: <Hash size={20} /> },
  { type: 'table', label: '表格', icon: <Table2 size={20} /> },
];

interface Props {
  onDragStart: (type: ComponentConfig['type'], customComponentId?: string) => void;
  onAddCustomComponent: (customComponentId: string, customComponentName: string) => void;
}

export function ComponentPalette({ onDragStart, onAddCustomComponent }: Props) {
  const navigate = useNavigate();
  const { components: customComponents, fetchComponents } = useCustomComponentStore();

  useEffect(() => {
    fetchComponents(1); // 只获取已发布的组件
  }, [fetchComponents]);

  return (
    <div className="palette">
      <div className="palette-title">组件库</div>
      <div className="palette-hint">点击或拖拽到画布</div>
      <div className="palette-list">
        {COMPONENT_TYPES.map(({ type, label, icon }) => (
          <div
            key={type}
            className="palette-item"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('componentType', type);
              onDragStart(type);
            }}
            title={`拖拽添加${label}`}
            onClick={() => {
              // 点击直接添加（不拖拽）
              onDragStart(type);
              // 模拟一次放置在画布中心
              const canvas = document.querySelector('.edit-canvas');
              if (canvas) {
                const rect = canvas.getBoundingClientRect();
                const fakeEvent = {
                  preventDefault: () => {},
                  clientX: rect.left + rect.width / 2,
                  clientY: rect.top + rect.height / 2,
                } as React.DragEvent;
                // 通过自定义事件触发添加
                canvas.dispatchEvent(new CustomEvent('palette-add', {
                  detail: { type, x: rect.width / 2, y: rect.height / 2 }
                }));
              }
            }}
          >
            <div className="palette-icon">{icon}</div>
            <div className="palette-label">{label}</div>
          </div>
        ))}

        {/* 自定义组件列表 */}
        {customComponents.length > 0 && (
          <>
            <div className="palette-divider">
              <span>自定义组件</span>
            </div>
            {customComponents.map(comp => (
              <div
                key={comp.id}
                className="palette-item palette-item-custom"
                title={`添加${comp.name}`}
                onClick={() => onAddCustomComponent(comp.id, comp.name)}
              >
                <div className="palette-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M9 9h6M9 15h6M9 12h6" />
                  </svg>
                </div>
                <div className="palette-label">{comp.name}</div>
              </div>
            ))}
          </>
        )}

        {/* 添加自定义组件按钮 */}
        <div
          className="palette-item palette-item-add"
          onClick={() => navigate('/custom-component/builder')}
          title="构建新自定义组件"
        >
          <div className="palette-icon"><Plus size={20} /></div>
          <div className="palette-label">添加组件</div>
        </div>
      </div>
    </div>
  );
}