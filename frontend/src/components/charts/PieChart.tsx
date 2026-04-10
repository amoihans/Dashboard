import { BaseChart } from './BaseChart';
import type { EChartsOption } from 'echarts';

interface DataItem {
  name: string;
  value: number;
}

interface Props {
  data: DataItem[];
  title?: string;
  loading?: boolean;
  style?: React.CSSProperties;
}

export function PieChart({ data, title, loading, style }: Props) {
  const option: EChartsOption = {
    title: title ? { text: title, left: 'center', textStyle: { fontSize: 14 } } : undefined,
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    series: [{ type: 'pie', radius: '60%', center: ['50%', '55%'], data }],
  };

  return <BaseChart option={option} loading={loading} style={style} />;
}
