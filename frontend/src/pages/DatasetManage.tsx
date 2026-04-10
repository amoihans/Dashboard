import { useEffect, useState } from 'react';
import { Table, Button, Popconfirm, message, Modal, Form, Input } from 'antd';
import { Plus, Trash2 } from 'lucide-react';
import type { ColumnsType } from 'antd/es/table';
import { datasetApi } from '../services/api';
import type { Dataset } from '../types';
import './DatasetManage.css';

export function DatasetManage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const data = await datasetApi.list();
      setDatasets(data);
    } catch (e: unknown) {
      message.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    try {
      await datasetApi.delete(id);
      message.success('删除成功');
      load();
    } catch (e: unknown) {
      message.error((e as Error).message);
    }
  };

  const handleCreate = async (values: { name: string; description?: string; sqlQuery?: string }) => {
    try {
      await datasetApi.create(values);
      message.success('创建成功');
      setModalOpen(false);
      form.resetFields();
      load();
    } catch (e: unknown) {
      message.error((e as Error).message);
    }
  };

  const columns: ColumnsType<Dataset> = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: '类型',
      key: 'type',
      render: (_, r) => r.sqlQuery ? 'SQL' : 'API',
    },
    { title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt' },
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
        <h2>数据集管理</h2>
        <Button type="primary" icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
          新建数据集
        </Button>
      </div>

      <Table columns={columns} dataSource={datasets} rowKey="id" loading={loading} />

      <Modal title="新建数据集" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item label="名称" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input />
          </Form.Item>
          <Form.Item label="SQL 查询" name="sqlQuery">
            <Input.TextArea rows={4} placeholder="SELECT ..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
