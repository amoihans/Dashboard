import { create } from 'zustand';
import type { CustomComponent, CreateCustomComponent, UpdateCustomComponent } from '../types';
import { customComponentApi } from '../services/api';

interface CustomComponentStore {
  components: CustomComponent[];
  currentComponent: CustomComponent | null;
  loading: boolean;
  error: string | null;

  // 获取组件列表
  fetchComponents: (published?: number, category?: string) => Promise<void>;
  // 获取单个组件
  getComponent: (id: string) => Promise<CustomComponent>;
  // 创建组件
  createComponent: (data: CreateCustomComponent) => Promise<CustomComponent>;
  // 更新组件
  updateComponent: (id: string, data: UpdateCustomComponent) => Promise<CustomComponent>;
  // 删除组件
  deleteComponent: (id: string) => Promise<void>;
  // 验证 JSON Schema
  validateSchema: (schema: object) => Promise<{ valid: boolean; error?: string }>;
  // 设置当前组件
  setCurrentComponent: (component: CustomComponent | null) => void;
  // 清除错误
  clearError: () => void;
}

export const useCustomComponentStore = create<CustomComponentStore>((set, get) => ({
  components: [],
  currentComponent: null,
  loading: false,
  error: null,

  fetchComponents: async (published?: number, category?: string) => {
    set({ loading: true, error: null });
    try {
      const components = await customComponentApi.list(published, category);
      set({ components, loading: false });
    } catch (e: unknown) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  getComponent: async (id: string) => {
    const component = await customComponentApi.get(id);
    set({ currentComponent: component });
    return component;
  },

  createComponent: async (data: CreateCustomComponent) => {
    set({ loading: true, error: null });
    try {
      // 检查重名（从已加载的组件列表）
      const state = get();
      if (state.components.some(c => c.name === data.name)) {
        set({ error: '组件名称已存在', loading: false });
        throw new Error('组件名称已存在');
      }
      const component = await customComponentApi.create(data);
      set(s => ({
        components: [component, ...s.components],
        loading: false,
      }));
      return component;
    } catch (e: unknown) {
      set({ error: (e as Error).message, loading: false });
      throw e;
    }
  },

  updateComponent: async (id: string, data: UpdateCustomComponent) => {
    set({ loading: true, error: null });
    try {
      const component = await customComponentApi.update(id, data);
      set(s => ({
        components: s.components.map(c => (c.id === id ? component : c)),
        currentComponent: s.currentComponent?.id === id ? component : s.currentComponent,
        loading: false,
      }));
      return component;
    } catch (e: unknown) {
      set({ error: (e as Error).message, loading: false });
      throw e;
    }
  },

  deleteComponent: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await customComponentApi.delete(id);
      set(s => ({
        components: s.components.filter(c => c.id !== id),
        currentComponent: s.currentComponent?.id === id ? null : s.currentComponent,
        loading: false,
      }));
    } catch (e: unknown) {
      set({ error: (e as Error).message, loading: false });
      throw e;
    }
  },

  validateSchema: async (schema: object) => {
    try {
      return await customComponentApi.validate(schema);
    } catch {
      return { valid: false, error: '验证请求失败' };
    }
  },

  setCurrentComponent: (component: CustomComponent | null) => {
    set({ currentComponent: component });
  },

  clearError: () => {
    set({ error: null });
  },
}));