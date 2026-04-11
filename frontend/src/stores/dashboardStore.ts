import { create } from 'zustand';
import type { Dashboard, ComponentConfig, LayoutItem, ThemeType } from '../types';
import { dashboardApi } from '../services/api';

interface DashboardStore {
  // 当前大屏
  currentDashboard: Dashboard | null;
  // 组件列表
  components: ComponentConfig[];
  // 布局
  layout: LayoutItem[];
  // 选中组件
  selectedComponentId: string | null;
  // 加载状态
  loading: boolean;
  // 错误信息
  error: string | null;

  // 加载大屏
  loadDashboard: (id: string) => Promise<void>;
  // 创建空白大屏
  newDashboard: (name: string, description?: string) => void;
  // 保存大屏
  saveDashboard: () => Promise<void>;
  // 发布大屏
  publishDashboard: () => Promise<void>;

  // 添加组件
  addComponent: (type: ComponentConfig['type'], dropPosition?: { x: number; y: number }) => void;
  // 删除组件
  removeComponent: (id: string) => void;
  // 选中组件
  selectComponent: (id: string | null) => void;
  // 更新组件配置
  updateComponent: (id: string, updates: Partial<ComponentConfig>) => void;
  // 更新布局
  updateLayout: (layout: LayoutItem[]) => void;
  // 更新主题
  updateTheme: (theme: ThemeType) => void;
}

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function makeDefaultLayout(): LayoutItem {
  return { i: generateId(), x: 0, y: 0, w: 6, h: 4, minW: 2, minH: 2 };
}

function makeDefaultComponent(type: ComponentConfig['type'], layout: LayoutItem): ComponentConfig {
  return {
    id: generateId(),
    type,
    title: getDefaultTitle(type),
    layout,
    dataSource: { sourceType: 'sql', sql: '' },
    chartConfig: getDefaultChartConfig(type),
    refreshInterval: 0,
  };
}

function getDefaultTitle(type: ComponentConfig['type']): string {
  const map: Record<ComponentConfig['type'], string> = {
    line: '折线图',
    bar: '柱状图',
    pie: '饼图',
    gauge: '仪表盘',
    candlestick: 'K线图',
    number: '数字卡片',
    table: '表格',
  };
  return map[type] || '图表';
}

function getDefaultChartConfig(type: ComponentConfig['type']): Record<string, unknown> {
  const base = {
    grid: { top: 40, right: 30, bottom: 30, left: 50 },
    tooltip: { trigger: 'axis' },
  };

  switch (type) {
    case 'line':
      return { ...base, xAxis: { type: 'category', data: [] }, yAxis: { type: 'value' }, series: [{ type: 'line', data: [] }] };
    case 'bar':
      return { ...base, xAxis: { type: 'category', data: [] }, yAxis: { type: 'value' }, series: [{ type: 'bar', data: [] }] };
    case 'pie':
      return { tooltip: { trigger: 'item' }, series: [{ type: 'pie', radius: '60%', data: [] }] };
    case 'gauge':
      return { series: [{ type: 'gauge', startAngle: 180, endAngle: 0, max: 100, data: [{ value: 0 }] }] };
    case 'candlestick':
      return { xAxis: { type: 'category', data: [] }, yAxis: { type: 'value' }, series: [{ type: 'candlestick', data: [] }] };
    case 'number':
      return { displayValue: 0, unit: '' };
    case 'table':
      return { columns: [], dataSource: [] };
    default:
      return {};
  }
}

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  currentDashboard: null,
  components: [],
  layout: [],
  selectedComponentId: null,
  loading: false,
  error: null,

  loadDashboard: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const data = await dashboardApi.get(id);
      const components = typeof data.components === 'string' ? JSON.parse(data.components) : (data.components || []);
      const layout = typeof data.layout === 'string' ? JSON.parse(data.layout) : (data.layout || []);
      set({
        currentDashboard: data,
        components,
        layout,
        loading: false,
      });
    } catch (e: unknown) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  newDashboard: (name: string, description?: string) => {
    set({
      currentDashboard: {
        id: '',
        name,
        description,
        layout: [],
        components: [],
        theme: 'light',
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      components: [],
      layout: [],
      selectedComponentId: null,
    });
  },

  saveDashboard: async () => {
    const { currentDashboard, components, layout } = get();
    if (!currentDashboard) return;

    const payload = {
      name: currentDashboard.name,
      description: currentDashboard.description,
      layout: JSON.stringify(layout),
      components: JSON.stringify(components),
      theme: currentDashboard.theme,
    };

    try {
      let saved: Dashboard;
      if (currentDashboard.id) {
        saved = await dashboardApi.update(currentDashboard.id, payload);
      } else {
        saved = await dashboardApi.create(payload as never);
      }
      set({ currentDashboard: saved });
    } catch (e: unknown) {
      set({ error: (e as Error).message });
    }
  },

  publishDashboard: async () => {
    const { currentDashboard } = get();
    if (!currentDashboard?.id) return;
    await dashboardApi.publish(currentDashboard.id);
    set(s => ({
      currentDashboard: s.currentDashboard ? { ...s.currentDashboard, status: 'published' } : null,
    }));
  },

  addComponent: (type: ComponentConfig['type'], dropPosition?: { x: number; y: number }) => {
    const layout = makeDefaultLayout();
    const component = makeDefaultComponent(type, layout);

    // 如果有放置位置，直接使用；否则自动计算避免重叠
    if (dropPosition) {
      layout.x = dropPosition.x;
      layout.y = dropPosition.y;
    } else {
      const { layout: currentLayout } = get();
      if (currentLayout.length > 0) {
        const maxY = Math.max(...currentLayout.map(l => l.y + l.h));
        layout.y = maxY;
      }
    }

    set(s => ({
      components: [...s.components, component],
      layout: [...s.layout, layout],
      selectedComponentId: component.id,
    }));
  },

  removeComponent: (id: string) => {
    set(s => ({
      components: s.components.filter(c => c.id !== id),
      layout: s.layout.filter(l => l.i !== id),
      selectedComponentId: s.selectedComponentId === id ? null : s.selectedComponentId,
    }));
  },

  selectComponent: (id: string | null) => {
    set({ selectedComponentId: id });
  },

  updateComponent: (id: string, updates: Partial<ComponentConfig>) => {
    set(s => ({
      components: s.components.map(c => (c.id === id ? { ...c, ...updates } : c)),
    }));
  },

  updateLayout: (layout: LayoutItem[]) => {
    set(s => {
      // 同时更新 components 里的 layout
      const components = s.components.map(c => {
        const l = layout.find(lo => lo.i === c.id);
        return l ? { ...c, layout: l } : c;
      });
      return { layout, components };
    });
  },

  updateTheme: (theme: ThemeType) => {
    set(s => ({
      currentDashboard: s.currentDashboard
        ? { ...s.currentDashboard, theme }
        : null,
    }));
  },
}));
