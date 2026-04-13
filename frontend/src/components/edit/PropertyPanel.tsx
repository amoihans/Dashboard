import { useEffect, useCallback, useState } from 'react';
import { Input, Select, InputNumber, Button, Form, Collapse, message } from 'antd';
import type { ComponentConfig, DataSourceType } from '../../types';
import { queryApi, customComponentApi } from '../../services/api';
import './PropertyPanel.css';

const { TextArea } = Input;
const { Panel } = Collapse;

interface Props {
  component: ComponentConfig | null;
  onUpdate: (updates: Partial<ComponentConfig>) => void;
}

export function PropertyPanel({ component, onUpdate }: Props) {
  const [form] = Form.useForm();
  const [editingExampleData, setEditingExampleData] = useState(false);
  const [exampleDataText, setExampleDataText] = useState('');
  const [exampleData, setExampleData] = useState<Record<string, unknown>[]>([]);

  // 判断是否是自定义组件
  const isCustom = component?.type === 'custom';

  // 加载自定义组件的 exampleData
  useEffect(() => {
    if (!isCustom || !component?.customComponentId) {
      setExampleData([]);
      setExampleDataText('');
      return;
    }

    customComponentApi.get(component.customComponentId).then(comp => {
      try {
        const config = comp.data_source_config ? JSON.parse(comp.data_source_config) : {};
        const data = config.exampleData || [];
        setExampleData(data);
        setExampleDataText(JSON.stringify(data, null, 2));
      } catch {
        setExampleData([]);
        setExampleDataText('');
      }
    }).catch(() => {
      setExampleData([]);
      setExampleDataText('');
    });
  }, [isCustom, component?.customComponentId]);

  useEffect(() => {
    if (component) {
      form.setFieldsValue({
        title: component.title,
        sourceType: component.dataSource.sourceType,
        sql: component.dataSource.sql || '',
        datasetId: component.dataSource.datasetId || '',
        refreshInterval: component.refreshInterval || 0,
        xKey: component.chartConfig?.xKey || 'name',
        yKey: component.chartConfig?.yKey || 'value',
        valueKey: component.chartConfig?.valueKey || 'value',
        nameKey: component.chartConfig?.nameKey || 'name',
        max: component.chartConfig?.max || 100,
        unit: component.chartConfig?.unit || '',
        echartsJson: JSON.stringify(component.chartConfig?.echartsConfig || {}, null, 2),
      });
    }
  }, [component]);

  const handleEchartsChange = useCallback((value: string) => {
    let parsed = {};
    try {
      if (value.trim()) {
        parsed = JSON.parse(value);
      }
    } catch {
      // ignore
    }
    const current = form.getFieldsValue();
    const { title, sourceType, sql, datasetId, refreshInterval, xKey, yKey, valueKey, nameKey, max, unit, ...rest } = current;
    onUpdate({
      title: title as string,
      dataSource: {
        sourceType: sourceType as DataSourceType,
        sql: sql as string,
        datasetId: datasetId as string,
      },
      refreshInterval: refreshInterval as number,
      chartConfig: {
        ...rest,
        xKey: xKey as string,
        yKey: yKey as string,
        valueKey: valueKey as string,
        nameKey: nameKey as string,
        max: max as number,
        unit: unit as string,
        echartsConfig: parsed,
      },
    });
  }, [form, onUpdate]);

  const handleValuesChange = useCallback((_: unknown, allValues: Record<string, unknown>) => {
    // 对于自定义组件，只更新标题
    if (isCustom) {
      onUpdate({ title: allValues.title as string });
      return;
    }

    const { title, sourceType, sql, datasetId, refreshInterval, xKey, yKey, valueKey, nameKey, max, unit, ...rest } = allValues;

    // 从表单当前值读取 echartsJson，不依赖 allValues（因为它的变更由 handleEchartsChange 单独处理）
    const echartsJsonStr = form.getFieldValue('echartsJson') as string | undefined;
    let echartsConfig: Record<string, unknown> = {};
    if (echartsJsonStr && typeof echartsJsonStr === 'string') {
      try {
        echartsConfig = JSON.parse(echartsJsonStr);
      } catch {
        // ignore
      }
    }

    onUpdate({
      title: title as string,
      dataSource: {
        sourceType: sourceType as DataSourceType,
        sql: sql as string,
        datasetId: datasetId as string,
      },
      refreshInterval: refreshInterval as number,
      chartConfig: {
        ...rest,
        xKey: xKey as string,
        yKey: yKey as string,
        valueKey: valueKey as string,
        nameKey: nameKey as string,
        max: max as number,
        unit: unit as string,
        echartsConfig,
      },
    });
  }, [onUpdate, isCustom]);

  const handleTestSql = async () => {
    const sql = form.getFieldValue('sql');
    if (!sql) return;
    const sourceType = form.getFieldValue('sourceType');
    try {
      const result = sourceType === 'finance-sql'
        ? await queryApi.financeSql(sql)
        : await queryApi.sql(sql);
      message.success(`查询成功，共 ${result.total} 条数据`);
    } catch (e: unknown) {
      message.error((e as Error).message);
    }
  };

  const handleExampleDataChange = (value: string) => {
    setExampleDataText(value);
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        setExampleData(parsed);
      }
    } catch {
      // ignore
    }
  };

  const handleSaveExampleData = () => {
    // 保存 exampleData 到组件配置
    onUpdate({
      customOverrides: {
        ...component?.customOverrides,
        exampleData,
      },
    });
    message.success('Example 数据已更新');
    setEditingExampleData(false);
  };

  if (!component) {
    return (
      <div className="property-panel empty">
        <div className="empty-hint">点击组件进行配置</div>
      </div>
    );
  }

  const displayTitle = isCustom && component.customComponentName ? component.customComponentName : component.title;

  return (
    <div className="property-panel">
      <div className="panel-title">属性配置</div>
      <div className="panel-subtitle">{displayTitle}</div>

      <Form
        form={form}
        layout="vertical"
        size="small"
        onValuesChange={handleValuesChange}
      >
        <div className="form-section">
          <div className="section-title">基本信息</div>
          <Form.Item label="标题" name="title">
            <Input />
          </Form.Item>
        </div>

        {/* 自定义组件数据配置 */}
        {isCustom ? (
          <div className="form-section">
            <div className="section-title">数据配置</div>
            <div className="example-data-hint">修改 Example 数据，预览将实时更新</div>
            <TextArea
              rows={8}
              value={exampleDataText}
              onChange={(e) => handleExampleDataChange(e.target.value)}
              onFocus={() => setEditingExampleData(true)}
              placeholder='[{"name": "示例1", "value": 100}]'
              style={{ fontFamily: 'monospace', fontSize: 12 }}
            />
            {editingExampleData && (
              <Button
                type="primary"
                size="small"
                onClick={handleSaveExampleData}
                style={{ marginTop: 8 }}
              >
                保存 Example 数据
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="form-section">
              <div className="section-title">数据源</div>
              <Form.Item label="类型" name="sourceType">
                <Select>
                  <Select.Option value="finance-sql">财经数据</Select.Option>
                  <Select.Option value="sql">SQL 查询</Select.Option>
                  <Select.Option value="dataset">数据集</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item noStyle shouldUpdate={(prev: Record<string, unknown>, curr: Record<string, unknown>) => prev.sourceType !== curr.sourceType}>
                {() => {
                  const st = form.getFieldValue('sourceType');
                  if (st === 'sql' || st === 'finance-sql') {
                    return (
                      <>
                        <Form.Item label="SQL" name="sql">
                          <TextArea rows={4} placeholder="SELECT ..." />
                        </Form.Item>
                        <Button size="small" onClick={handleTestSql} style={{ marginBottom: 8 }}>
                          测试查询
                        </Button>
                      </>
                    );
                  }
                  if (st === 'dataset') {
                    return (
                      <Form.Item label="数据集" name="datasetId">
                        <Select placeholder="选择数据集" />
                      </Form.Item>
                    );
                  }
                  return null;
                }}
              </Form.Item>

              <Form.Item label="刷新间隔(秒)" name="refreshInterval">
                <InputNumber min={0} max={3600} style={{ width: '100%' }} />
              </Form.Item>
            </div>

            <div className="form-section">
              <div className="section-title">图表配置</div>
              {(component.type === 'line' || component.type === 'bar') && (
                <>
                  <Form.Item label="X轴字段" name="xKey">
                    <Input placeholder="字段名" />
                  </Form.Item>
                  <Form.Item label="Y轴字段" name="yKey">
                    <Input placeholder="字段名" />
                  </Form.Item>
                </>
              )}
              {component.type === 'pie' && (
                <>
                  <Form.Item label="名称字段" name="nameKey">
                    <Input placeholder="字段名" />
                  </Form.Item>
                  <Form.Item label="值字段" name="valueKey">
                    <Input placeholder="字段名" />
                  </Form.Item>
                </>
              )}
              {component.type === 'gauge' && (
                <>
                  <Form.Item label="值字段" name="valueKey">
                    <Input placeholder="字段名" />
                  </Form.Item>
                  <Form.Item label="最大值" name="max">
                    <InputNumber min={1} style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item label="单位" name="unit">
                    <Input placeholder="如: %, 元" />
                  </Form.Item>
                </>
              )}
              {component.type === 'number' && (
                <>
                  <Form.Item label="值字段" name="valueKey">
                    <Input placeholder="字段名" />
                  </Form.Item>
                  <Form.Item label="单位" name="unit">
                    <Input placeholder="如: 万, %" />
                  </Form.Item>
                </>
              )}
            </div>

            <div className="form-section">
              <Collapse defaultActiveKey={[]} ghost>
                <Panel header="ECharts 高级配置" key="echarts">
                  <TextArea
                    rows={10}
                    placeholder='{"color": ["#5470c6"], "animation": true}'
                    style={{ fontFamily: 'monospace', fontSize: 12 }}
                    value={form.getFieldValue('echartsJson')}
                    onChange={(e) => {
                      const val = e.target.value;
                      form.setFieldValue('echartsJson', val);
                      handleEchartsChange(val);
                    }}
                  />
                </Panel>
              </Collapse>
            </div>
          </>
        )}
      </Form>
    </div>
  );
}