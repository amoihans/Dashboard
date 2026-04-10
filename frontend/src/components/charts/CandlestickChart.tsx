import { BaseChart } from './BaseChart';
import type { EChartsOption } from 'echarts';

interface CandlestickData {
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
}

interface Props {
  data: CandlestickData[];
  title?: string;
  loading?: boolean;
  style?: React.CSSProperties;
}

export function CandlestickChart({ data, title, loading, style }: Props) {
  const categories = data.map(d => d.date);
  const candleData = data.map(d => [d.open, d.close, d.low, d.high]);

  const option: EChartsOption = {
    title: title ? { text: title, left: 'center', textStyle: { fontSize: 14 } } : undefined,
    grid: { top: title ? 40 : 20, right: 30, bottom: 30, left: 50 },
    tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
    xAxis: { type: 'category', data: categories, boundaryGap: true },
    yAxis: { type: 'value', scale: true },
    series: [{ type: 'candlestick', data: candleData }],
  };

  return <BaseChart option={option} loading={loading} style={style} />;
}
