import { BaseChart } from './BaseChart';
import type { EChartsOption } from 'echarts';

interface Props {
  xData: string[];
  yData: number[];
  title?: string;
  loading?: boolean;
  style?: React.CSSProperties;
}

export function BarChart({ xData, yData, title, loading, style }: Props) {
  const option: EChartsOption = {
    title: title ? { text: title, left: 'center', textStyle: { fontSize: 14 } } : undefined,
    grid: { top: title ? 40 : 20, right: 30, bottom: 30, left: 50 },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: xData },
    yAxis: { type: 'value' },
    series: [{ type: 'bar', data: yData }],
  };

  return <BaseChart option={option} loading={loading} style={style} />;
}
