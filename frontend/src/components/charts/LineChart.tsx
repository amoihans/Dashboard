import { BaseChart } from './BaseChart';
import type { EChartsOption } from 'echarts';

interface Props {
  xData: string[];
  yData: number[];
  title?: string;
  loading?: boolean;
  style?: React.CSSProperties;
  overrideConfig?: Record<string, unknown>;
}

export function LineChart({ xData, yData, title, loading, style, overrideConfig }: Props) {
  const option: EChartsOption = {
    title: title ? { text: title, left: 'center', textStyle: { fontSize: 14 } } : undefined,
    grid: { top: title ? 40 : 20, right: 30, bottom: 30, left: 50 },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: xData, boundaryGap: false },
    yAxis: { type: 'value' },
    series: [{ type: 'line', data: yData, smooth: true, areaStyle: { opacity: 0.2 } }],
  };

  return <BaseChart option={option} loading={loading} style={style} overrideConfig={overrideConfig} />;
}
