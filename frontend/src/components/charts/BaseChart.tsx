import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import styled from './BaseChart.module.css';

interface Props {
  option: EChartsOption;
  loading?: boolean;
  style?: React.CSSProperties;
  /** ECharts 原生配置，会覆盖默认配置 */
  overrideConfig?: Record<string, unknown>;
}

/** 简单的深度合并：target 合并 source，source 的值优先 */
function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...target };
  for (const key of Object.keys(source)) {
    const sVal = source[key];
    const tVal = result[key];
    if (Array.isArray(sVal)) {
      result[key] = sVal;
    } else if (sVal !== null && typeof sVal === 'object' && !Array.isArray(sVal) && tVal !== null && typeof tVal === 'object' && !Array.isArray(tVal)) {
      result[key] = deepMerge(tVal as Record<string, unknown>, sVal as Record<string, unknown>);
    } else {
      result[key] = sVal;
    }
  }
  return result;
}

export function BaseChart({ option, loading, style, overrideConfig }: Props) {
  const mergedOption = overrideConfig
    ? deepMerge(option as Record<string, unknown>, overrideConfig) as EChartsOption
    : option;

  return (
    <div className={styled.wrapper} style={style}>
      {loading && <div className={styled.loading}>加载中...</div>}
      <ReactECharts option={mergedOption} notMerge={false} style={{ height: '100%', width: '100%' }} />
    </div>
  );
}
