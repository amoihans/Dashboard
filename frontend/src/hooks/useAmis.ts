import { useEffect, useRef, useState } from 'react';

// 动态加载 amis SDK
let amisPromise: Promise<any> | null = null;
let amisInstance: any = null;

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
      // 加载 CSS（如果还没加载）
      if (!document.querySelector('link[href*="amis"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/amis@2.0.0/sdk/sdk.css';
        document.head.appendChild(link);
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载 SDK
  useEffect(() => {
    loadAmis()
      .then(amis => {
        console.log('[useAmis] SDK loaded');
        setIsLoading(false);
      })
      .catch(err => {
        console.error('[useAmis] Failed to load SDK:', err);
        setError('Failed to load Amis SDK');
        setIsLoading(false);
      });
  }, []);

  // 渲染
  useEffect(() => {
    if (!containerRef.current || !amisInstance || !schema) return;

    try {
      // 先卸载之前的组件
      if (scopedRef.current) {
        try {
          scopedRef.current.unmount?.();
        } catch (e) {
          // ignore unmount error
        }
      }

      // 清空容器
      containerRef.current.innerHTML = '';

      // 渲染新组件
      scopedRef.current = amisInstance.embed(
        containerRef.current,
        schema as any,
        data as any,
        {
          fetcher: async () => ({ status: 200, headers: {}, data: { status: 200, msg: 'ok', data: {} } } as any),
        }
      );
    } catch (e) {
      console.error('[useAmis] Render error:', e);
      setError((e as Error).message);
    }
  }, [schema, data]);

  // 组件卸载时清理
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
    isLoading,
    error,
  };
}
