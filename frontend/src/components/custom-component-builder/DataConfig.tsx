import { Button, Alert } from 'antd';
import { Play, Database } from 'lucide-react';
import { useState } from 'react';
import { MonacoEditor } from '../MonacoEditor';
import './DataConfig.css';

type SourceType = 'inline' | 'sql';

interface DataConfigProps {
  sourceType: SourceType;
  exampleData: Record<string, unknown>[];
  sql: string;
  sqlPreviewData: Record<string, unknown>[];
  sqlError: string | null;
  sqlPreviewing: boolean;
  onSourceTypeChange: (type: SourceType) => void;
  onExampleDataChange: (data: Record<string, unknown>[]) => void;
  onSqlChange: (sql: string) => void;
  onTestSql: () => void;
}

const DEFAULT_EXAMPLE_DATA = [
  { name: '示例项 A', value: 1234 },
  { name: '示例项 B', value: 5678 },
  { name: '示例项 C', value: 9012 },
];

export function DataConfig({
  sourceType,
  exampleData,
  sql,
  sqlPreviewData,
  sqlError,
  sqlPreviewing,
  onSourceTypeChange,
  onExampleDataChange,
  onSqlChange,
  onTestSql,
}: DataConfigProps) {
  const [localExampleData, setLocalExampleData] = useState(
    JSON.stringify(exampleData.length > 0 ? exampleData : DEFAULT_EXAMPLE_DATA, null, 2)
  );
  const [localSql, setLocalSql] = useState(sql);

  const handleExampleDataChange = (value: string) => {
    setLocalExampleData(value);
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        onExampleDataChange(parsed);
      }
    } catch {
      // ignore parse errors while typing
    }
  };

  return (
    <div className="data-config">
      <div className="data-config-header">
        <div className="header-left">
          <Database size={14} />
          <span>数据配置</span>
        </div>
        <div className="source-type-toggle">
          <span className={sourceType === 'inline' ? 'active' : ''}>Example</span>
          <Button
            size="small"
            type={sourceType === 'sql' ? 'primary' : 'default'}
            onClick={() => onSourceTypeChange(sourceType === 'inline' ? 'sql' : 'inline')}
          >
            {sourceType === 'inline' ? '切换 SQL' : '切换 Example'}
          </Button>
        </div>
      </div>

      <div className="data-config-content">
        {sourceType === 'inline' ? (
          <div className="example-data-editor">
            <div className="data-editor-hint">修改 Example 数据，预览将实时更新</div>
            <MonacoEditor
              value={localExampleData}
              onChange={handleExampleDataChange}
              language="json"
              height={120}
            />
          </div>
        ) : (
          <div className="sql-editor">
            <div className="data-editor-hint">输入 SQL 查询，预览将执行查询并显示结果</div>
            <MonacoEditor
              value={localSql}
              onChange={(value) => {
                setLocalSql(value);
                onSqlChange(value);
              }}
              language="sql"
              height={120}
            />
            <Button
              icon={<Play size={14} />}
              onClick={onTestSql}
              loading={sqlPreviewing}
              size="small"
              style={{ marginTop: 8 }}
            >
              执行查询
            </Button>
            {sqlError && (
              <Alert type="error" message={sqlError} style={{ marginTop: 8 }} />
            )}
            {sqlPreviewData.length > 0 && (
              <Alert
                type="success"
                message={`查询成功，返回 ${sqlPreviewData.length} 条数据`}
                style={{ marginTop: 8 }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}