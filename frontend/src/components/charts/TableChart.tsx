import { Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import styled from './TableChart.module.css';

interface Props {
  columns: { key: string; title: string; dataIndex: string }[];
  data: Record<string, unknown>[];
  loading?: boolean;
}

export function TableChart({ columns, data, loading }: Props) {
  const cols: ColumnsType<Record<string, unknown>> = columns.map(c => ({
    key: c.key,
    title: c.title,
    dataIndex: c.dataIndex,
  }));

  return (
    <div className={styled.wrapper}>
      <Table
        columns={cols}
        dataSource={data}
        loading={loading}
        size="small"
        pagination={{ pageSize: 10, size: 'small' }}
        scroll={{ y: 200 }}
      />
    </div>
  );
}
