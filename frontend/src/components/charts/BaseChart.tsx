import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import styled from './BaseChart.module.css';

interface Props {
  option: EChartsOption;
  loading?: boolean;
  style?: React.CSSProperties;
}

export function BaseChart({ option, loading, style }: Props) {
  return (
    <div className={styled.wrapper} style={style}>
      {loading && <div className={styled.loading}>加载中...</div>}
      <ReactECharts option={option} notMerge={true} style={{ height: '100%', width: '100%' }} />
    </div>
  );
}
