import type { ComponentConfig } from '../../types';
import { LineChart } from './LineChart';
import { BarChart } from './BarChart';
import { PieChart } from './PieChart';
import { GaugeChart } from './GaugeChart';
import { CandlestickChart } from './CandlestickChart';
import { NumberCard } from './NumberCard';
import { TableChart } from './TableChart';

interface Props {
  config: ComponentConfig;
  data: Record<string, unknown>[];
  loading?: boolean;
}

// 数据转换辅助
function extractXData(data: Record<string, unknown>[], key: string): string[] {
  return data.map(d => String(d[key] ?? ''));
}

function extractYData(data: Record<string, unknown>[], key: string): number[] {
  return data.map(d => Number(d[key] ?? 0));
}

export function ChartRenderer({ config, data, loading }: Props) {
  const { type, title } = config;

  switch (type) {
    case 'line': {
      const xKey = config.chartConfig?.xKey as string || 'name';
      const yKey = config.chartConfig?.yKey as string || 'value';
      return <LineChart xData={extractXData(data, xKey)} yData={extractYData(data, yKey)} title={title} loading={loading} />;
    }
    case 'bar': {
      const xKey = config.chartConfig?.xKey as string || 'name';
      const yKey = config.chartConfig?.yKey as string || 'value';
      return <BarChart xData={extractXData(data, xKey)} yData={extractYData(data, yKey)} title={title} loading={loading} />;
    }
    case 'pie': {
      const nameKey = config.chartConfig?.nameKey as string || 'name';
      const valueKey = config.chartConfig?.valueKey as string || 'value';
      const pieData = data.map(d => ({ name: String(d[nameKey] ?? ''), value: Number(d[valueKey] ?? 0) }));
      return <PieChart data={pieData} title={title} loading={loading} />;
    }
    case 'gauge': {
      const valueKey = config.chartConfig?.valueKey as string || 'value';
      const max = (config.chartConfig?.max as number) || 100;
      const unit = (config.chartConfig?.unit as string) || '';
      const val = data.length > 0 ? Number(data[0][valueKey] ?? 0) : 0;
      return <GaugeChart value={val} max={max} title={title} unit={unit} loading={loading} />;
    }
    case 'candlestick': {
      const dateKey = config.chartConfig?.dateKey as string || 'date';
      const cData = data.map(d => ({
        date: String(d[dateKey] ?? ''),
        open: Number(d['open'] ?? 0),
        close: Number(d['close'] ?? 0),
        high: Number(d['high'] ?? 0),
        low: Number(d['low'] ?? 0),
      }));
      return <CandlestickChart data={cData} title={title} loading={loading} />;
    }
    case 'number': {
      const valueKey = config.chartConfig?.valueKey as string || 'value';
      const unit = (config.chartConfig?.unit as string) || '';
      const val = data.length > 0 ? data[0][valueKey] ?? 0 : 0;
      return <NumberCard value={String(val)} unit={unit} title={title} loading={loading} />;
    }
    case 'table': {
      const cols = (config.chartConfig?.columns as { key: string; title: string; dataIndex: string }[]) || [];
      return <TableChart columns={cols} data={data} loading={loading} />;
    }
    default:
      return <div style={{ padding: 20, color: '#999' }}>未知组件类型: {type}</div>;
  }
}
