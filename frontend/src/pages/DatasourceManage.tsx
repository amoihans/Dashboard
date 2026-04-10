import { useEffect, useState } from 'react';
import { Table, Button, Popconfirm, message, Modal, Form, Input, Select } from 'antd';
import { Plus, Trash2 } from 'lucide-react';
import type { ColumnsType } from 'antd/es/table';
import { datasourceApi } from '../services/api';
import type { Datasource } from '../types';
import './DatasetManage.css';

export function DatasourceManage() {
  const [datasources, setDatasources] = useState<Datasource[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const data = await datasourceApi.list();
      setDatasources(data);
    } catch (e: unknown) {
      message.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    try {
      await datasourceApi.delete(id);
      message.success('删除成功');
      load();
    } catch (e: unknown) {
      message.error((e as Error).message);
    }
  };

  const handleCreate = async (values: Record<string, unknown>) => {
    try {
      await datasourceApi.create(values as never);
      message.success('创建成功');
      setModalOpen(false);
      form.resetFields();
      load();
    } catch (e: unknown) {
      message.error((e as Error).message);
    }
  };

  const columns: ColumnsType<Datasource> = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '类型', dataIndex: 'dbType', key: 'dbType' },
    { title: '地址', key: 'address', render: (_, r) => `${r.host}:${r.port}` },
    { title: '数据库', dataIndex: 'database', key: 'database' },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt' },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.id)}>
          <Button type="text" size="small" danger icon={<Trash2 size={14} />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div className="manage-page">
      <div className="manage-header">
        <h2>数据源管理</h2>
        <Button type="primary" icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
          添加数据源
        </Button>
      </div>

      <Table columns={columns} dataSource={datasources} rowKey="id" loading={loading} />

      <Modal title="添加数据源" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item label="名称" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="数据库类型" name="dbType" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="mysql">MySQL</Select.Option>
              <Select.Option value="postgresql">PostgreSQL</Select.Option>
              <Select.Option value="sqlite">SQLite</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="主机" name="host">
            <Input placeholder="localhost" />
          </Form.Item>
          <Form.Item label="端口" name="port">
            <Input type="number" placeholder="3306" />
          </Form.Item>
          <Form.Item label="数据库名" name="database">
            <Input />
          </Form.Item>
          <Form.Item label="用户名" name="username">
            <Input />
          </Form.Item>
          <Form.Item label="密码" name="password">
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
