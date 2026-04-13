import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Eye, Upload, Search } from 'lucide-react';
import { Button, Table, Tag, Popconfirm, message, Input, Modal, Form, Select, Switch } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCustomComponentStore } from '../stores/customComponentStore';
import type { CustomComponent } from '../types';
import './CustomComponentLibrary.css';

export function CustomComponentLibrary() {
  const navigate = useNavigate();
  const {
    components,
    loading,
    fetchComponents,
    deleteComponent,
    updateComponent,
  } = useCustomComponentStore();

  const [searchText, setSearchText] = useState('');
  const [filterPublished, setFilterPublished] = useState<boolean | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingComponent, setEditingComponent] = useState<CustomComponent | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchComponents();
  }, [fetchComponents]);

  // 筛选后的组件列表
  const filteredComponents = components.filter(c => {
    const matchSearch = !searchText ||
      c.name.toLowerCase().includes(searchText.toLowerCase()) ||
      (c.description || '').toLowerCase().includes(searchText.toLowerCase());
    const matchPublished = filterPublished === null ||
      (filterPublished ? c.is_published === 1 : c.is_published === 0);
    return matchSearch && matchPublished;
  });

  // 预览组件
  const handlePreview = (component: CustomComponent) => {
    try {
      const schema = JSON.parse(component.json_schema);
      Modal.info({
        title: `预览: ${component.name}`,
        content: (
          <div style={{ padding: '20px', minHeight: '200px' }}>
            <pre style={{ background: '#f5f5f5', padding: '12px', borderRadius: '4px', fontSize: '12px', overflow: 'auto' }}>
              {JSON.stringify(schema, null, 2)}
            </pre>
          </div>
        ),
        width: 600,
      });
    } catch {
      message.error('无效的 JSON Schema');
    }
  };

  // 编辑组件
  const handleEdit = (component: CustomComponent) => {
    setEditingComponent(component);
    form.setFieldsValue({
      name: component.name,
      description: component.description,
      category: component.category,
      isPublished: component.is_published === 1,
    });
    setEditModalVisible(true);
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!editingComponent) return;
    try {
      const values = await form.validateFields();
      await updateComponent(editingComponent.id, {
        name: values.name,
        description: values.description,
        category: values.category,
        is_published: values.isPublished ? 1 : 0,
      });
      message.success('更新成功');
      setEditModalVisible(false);
      fetchComponents();
    } catch {
      // 表单验证失败
    }
  };

  // 删除组件
  const handleDelete = async (id: string) => {
    try {
      await deleteComponent(id);
      message.success('删除成功');
    } catch {
      message.error('删除失败');
    }
  };

  // 发布/下架
  const handleTogglePublish = async (component: CustomComponent) => {
    try {
      await updateComponent(component.id, {
        is_published: component.is_published === 1 ? 0 : 1,
      });
      message.success(component.is_published === 1 ? '已下架' : '已发布');
      fetchComponents();
    } catch {
      message.error('操作失败');
    }
  };

  const columns: ColumnsType<CustomComponent> = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <strong>{name}</strong>,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      render: (cat: string) => cat ? <Tag>{cat}</Tag> : '-',
    },
    {
      title: '状态',
      dataIndex: 'isPublished',
      key: 'isPublished',
      render: (published: number) => (
        <Tag color={published === 1 ? 'green' : 'default'}>
          {published === 1 ? '已发布' : '草稿'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <>
          <Button
            type="text"
            size="small"
            icon={<Plus size={14} />}
            onClick={() => navigate(`/custom-component/builder?id=${record.id}`)}
            title="在构建器中编辑"
          />
          <Button
            type="text"
            size="small"
            icon={<Eye size={14} />}
            onClick={() => handlePreview(record)}
          />
          <Button
            type="text"
            size="small"
            icon={<Edit size={14} />}
            onClick={() => handleEdit(record)}
          />
          <Button
            type="text"
            size="small"
            icon={<Upload size={14} />}
            onClick={() => handleTogglePublish(record)}
            title={record.is_published === 1 ? '下架' : '发布'}
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
    <div className="library-page">
      <div className="library-header">
        <h2>自定义组件库</h2>
        <Button
          type="primary"
          icon={<Plus size={16} />}
          onClick={() => navigate('/custom-component/builder')}
        >
          构建新组件
        </Button>
      </div>

      <div className="library-filters">
        <Input
          placeholder="搜索组件..."
          prefix={<Search size={14} />}
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          style={{ width: 200 }}
          allowClear
        />
        <div className="filter-tags">
          <Tag
            style={{ cursor: 'pointer', background: filterPublished === null ? '#1890ff' : undefined, color: filterPublished === null ? '#fff' : undefined, borderColor: filterPublished === null ? '#1890ff' : undefined }}
            onClick={() => setFilterPublished(null)}
          >
            全部
          </Tag>
          <Tag
            style={{ cursor: 'pointer', background: filterPublished === true ? '#1890ff' : undefined, color: filterPublished === true ? '#fff' : undefined, borderColor: filterPublished === true ? '#1890ff' : undefined }}
            onClick={() => setFilterPublished(true)}
          >
            已发布
          </Tag>
          <Tag
            style={{ cursor: 'pointer', background: filterPublished === false ? '#1890ff' : undefined, color: filterPublished === false ? '#fff' : undefined, borderColor: filterPublished === false ? '#1890ff' : undefined }}
            onClick={() => setFilterPublished(false)}
          >
            草稿
          </Tag>
        </div>
      </div>

      <Table
        columns={columns}
        dataSource={filteredComponents}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      {/* 编辑弹窗 */}
      <Modal
        title="编辑组件"
        open={editModalVisible}
        onOk={handleSaveEdit}
        onCancel={() => setEditModalVisible(false)}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="组件名称"
            rules={[{ required: true, message: '请输入组件名称' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="category" label="分类">
            <Select allowClear>
              <Select.Option value="card">卡片</Select.Option>
              <Select.Option value="chart">图表</Select.Option>
              <Select.Option value="info">信息展示</Select.Option>
              <Select.Option value="other">其他</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="isPublished" label="发布状态" valuePropName="checked">
            <Switch checkedChildren="已发布" unCheckedChildren="草稿" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}