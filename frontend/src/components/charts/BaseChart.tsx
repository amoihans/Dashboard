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

export function BaseChart({ option, loading, style, overrideConfig }: Props) {
  const mergedOption = overrideConfig
    ? ({ ...option, ...overrideConfig } as EChartsOption)
    : option;

  return (
    <div className={styled.wrapper} style={style}>
      {loading && <div className={styled.loading}>加载中...</div>}
      <ReactECharts option={mergedOption} notMerge={true} style={{ height: '100%', width: '100%' }} />
    </div>
  );
}
