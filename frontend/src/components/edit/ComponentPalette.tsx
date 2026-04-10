import { BarChart3, TrendingUp, PieChart, Gauge, Activity, Hash, Table2 } from 'lucide-react';
import type { ComponentConfig } from '../../types';
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
  onAdd: (type: ComponentConfig['type']) => void;
}

export function ComponentPalette({ onAdd }: Props) {
  return (
    <div className="palette">
      <div className="palette-title">组件库</div>
      <div className="palette-list">
        {COMPONENT_TYPES.map(({ type, label, icon }) => (
          <div
            key={type}
            className="palette-item"
            onClick={() => onAdd(type)}
            title={`添加${label}`}
          >
            <div className="palette-icon">{icon}</div>
            <div className="palette-label">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
