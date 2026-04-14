import { useEffect, useRef, useState } from 'react';

// 动态加载 amis SDK - 模块级别单例
let amisPromise: Promise<any> | null = null;
let amisInstance: any = null;
let cssLoaded = false;

async function loadAmis(): Promise<any> {
  if (amisInstance) return amisInstance;
  if (amisPromise) return amisPromise;

  amisPromise = new Promise((resolve, reject) => {
    // 如果已经加载，直接返回
    if ((window as any).amis) {
      amisInstance = (window as any).amis;
      resolve(amisInstance);
      return;
    }

    // 加载 SDK JS
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/amis@2.0.0/sdk/sdk.js';
    script.onload = () => {
      // 加载 CSS（只加载一次）
      if (!cssLoaded) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/amis@2.0.0/sdk/sdk.css';
        link.id = 'amis-sdk-css';
        document.head.appendChild(link);
        cssLoaded = true;
      }

      // 使用 amisRequire 获取 embed 模块
      const amisRequire = (window as any).amisRequire;
      amisRequire(['amis/embed'], (amis: any) => {
        amisInstance = amis;
        resolve(amis);
      });
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return amisPromise;
}

export interface UseAmisOptions {
  schema?: Record<string, unknown> | null;
  data?: Record<string, unknown>;
}

export function useAmis({ schema, data }: UseAmisOptions = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scopedRef = useRef<any>(null);
  // 只在需要时显示 loading
  const [needsInit, setNeedsInit] = useState(!amisInstance);
  // 用 instanceId 追踪实例
  const instanceId = useRef(Math.random().toString(36).slice(2, 8));

  // 只在首次挂载时加载 SDK，不触发 re-render
  useEffect(() => {
    if (amisInstance) return;
    setNeedsInit(true);
    loadAmis().finally(() => setNeedsInit(false));
  }, []);

  // 渲染逻辑 - 用 ref 追踪，只有 schema 真正变化时才重新渲染
  const lastRenderedSchema = useRef<any>(null);
  const lastRenderedData = useRef<any>(null);

  useEffect(() => {
    // 只有 schema 的 JSON 表示变化了才渲染
    if (!schema) return;

    const currentSchemaJson = JSON.stringify(schema);
    const currentDataJson = JSON.stringify(data);

    // 检查是否真的需要渲染
    const shouldRender = !scopedRef.current ||
      lastRenderedSchema.current !== currentSchemaJson ||
      lastRenderedData.current !== currentDataJson;

    if (!shouldRender) {
      console.log('[useAmis] Instance', instanceId.current, 'skipping, no change');
      return;
    }

    console.log('[useAmis] Instance', instanceId.current, 'rendering, schema:', schema?.type, 'changed');

    if (!containerRef.current) return;

    // 等待 SDK 加载
    if (!amisInstance) {
      console.log('[useAmis] Instance', instanceId.current, 'waiting for SDK');
      return;
    }

    // 卸载旧组件
    if (scopedRef.current) {
      try {
        console.log('[useAmis] Instance', instanceId.current, 'unmounting');
        scopedRef.current.unmount?.();
      } catch (e) {
        console.log('[useAmis] Instance', instanceId.current, 'unmount error:', e);
      }
      scopedRef.current = null;
    }

    // 清空并渲染
    containerRef.current.innerHTML = '';
    try {
      scopedRef.current = amisInstance.embed(
        containerRef.current,
        schema as any,
        data as any,
        {
          scope: instanceId.current, // 添加 scope 区分不同实例
          fetcher: async () => ({ status: 200, headers: {}, data: { status: 200, msg: 'ok', data: {} } } as any),
        }
      );
      lastRenderedSchema.current = currentSchemaJson;
      lastRenderedData.current = currentDataJson;
      console.log('[useAmis] Instance', instanceId.current, 'rendered OK');
    } catch (e) {
      console.error('[useAmis] Instance', instanceId.current, 'render error:', e);
    }
  }, [schema, data]);

  // 清理
  useEffect(() => {
    return () => {
      if (scopedRef.current) {
        try {
          scopedRef.current.unmount?.();
        } catch (e) {
          // ignore
        }
      }
    };
  }, []);

  return {
    containerRef,
    isLoading: needsInit,
  };
}
