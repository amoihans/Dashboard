import { BaseChart } from './BaseChart';
import type { EChartsOption } from 'echarts';

interface Props {
  value: number;
  max?: number;
  min?: number;
  title?: string;
  unit?: string;
  loading?: boolean;
  style?: React.CSSProperties;
}

export function GaugeChart({ value, max = 100, min = 0, title, unit = '', loading, style }: Props) {
  const option: EChartsOption = {
    title: title ? { text: title, left: 'center', textStyle: { fontSize: 14 } } : undefined,
    series: [{
      type: 'gauge',
      startAngle: 180,
      endAngle: 0,
      center: ['50%', '70%'],
      min,
      max,
      splitNumber: 5,
      axisLine: { lineStyle: { width: 6, color: [[1, '#5470c6']] } },
      pointer: { icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z', length: '12%', width: 6 },
      axisTick: { length: 6 },
      splitLine: { length: 10 },
      axisLabel: { distance: 15, fontSize: 10 },
      detail: { valueAnimation: true, formatter: `{value}${unit}`, fontSize: 20, offsetCenter: [0, '30%'] },
      data: [{ value }],
    }],
  };

  return <BaseChart option={option} loading={loading} style={style} />;
}
