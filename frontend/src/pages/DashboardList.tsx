import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Eye, Trash2, Send } from 'lucide-react';
import { Button, Table, Tag, Popconfirm, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { dashboardApi } from '../services/api';
import type { Dashboard } from '../types';
import { THEME_COLORS } from '../types';
import './DashboardList.css';

export function DashboardList() {
  const navigate = useNavigate();
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await dashboardApi.list();
      setDashboards(data.map(d => ({
        ...d,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      })));
    } catch (e: unknown) {
      message.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    try {
      await dashboardApi.delete(id);
      message.success('删除成功');
      load();
    } catch (e: unknown) {
      message.error((e as Error).message);
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await dashboardApi.publish(id);
      message.success('发布成功');
      load();
    } catch (e: unknown) {
      message.error((e as Error).message);
    }
  };

  const columns: ColumnsType<Dashboard> = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'published' ? 'green' : 'default'}>
          {status === 'published' ? '已发布' : '草稿'}
        </Tag>
      ),
    },
    {
      title: '主题',
      dataIndex: 'theme',
      key: 'theme',
      render: (theme: string) => (
        <Tag color="default">{THEME_COLORS[theme as keyof typeof THEME_COLORS]?.label || theme}</Tag>
      ),
    },
    { title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt' },
    {
      title: '操作',
      key: 'action',
      width: 220,
      render: (_, record) => (
        <>
          <Button
            type="text"
            size="small"
            icon={<Edit size={14} />}
            onClick={() => navigate(`/dashboard/${record.id}/edit`)}
          />
          {record.status === 'published' && (
            <Button
              type="text"
              size="small"
              icon={<Eye size={14} />}
              onClick={() => navigate(`/display/${record.id}`)}
            />
          )}
          <Button
            type="text"
            size="small"
            icon={<Send size={14} />}
            onClick={() => handlePublish(record.id)}
          />
          <Popconfirm
            title="确认删除？"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button type="text" size="small" danger icon={<Trash2 size={14} />} />
          </Popconfirm>
        </>
      ),
    },
  ];

  return (
    <div className="list-page">
      <div className="list-header">
        <h2>大屏管理</h2>
        <Button type="primary" icon={<Plus size={16} />} onClick={() => navigate('/dashboard/new/edit')}>
          新建大屏
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={dashboards}
        rowKey="id"
        loading={loading}
      />
    </div>
  );
}
