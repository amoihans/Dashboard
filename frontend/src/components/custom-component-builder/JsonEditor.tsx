import { Button, Alert } from 'antd';
import { Code, Wand2 } from 'lucide-react';
import { useSchemaValidation } from './hooks';
import { MonacoEditor } from '../MonacoEditor';
import './JsonEditor.css';

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function JsonEditor({ value, onChange }: JsonEditorProps) {
  const { error, parsedSchema } = useSchemaValidation(value);

  const handleFormat = () => {
    if (parsedSchema) {
      onChange(JSON.stringify(parsedSchema, null, 2));
    }
  };

  return (
    <div className="json-editor">
      <div className="json-editor-header">
        <div className="header-left">
          <Code size={14} />
          <span>JSON 编辑器</span>
        </div>
        <Button
          size="small"
          icon={<Wand2 size={12} />}
          onClick={handleFormat}
          disabled={!!error || !value.trim()}
        >
          格式化
        </Button>
      </div>

      <div className="json-editor-content">
        <MonacoEditor
          value={value}
          onChange={onChange}
          language="json"
          height="100%"
        />
        {error && (
          <div className="json-editor-error">
            <Alert type="error" message={<span>JSON 解析错误: {error}</span>} showIcon />
          </div>
        )}
      </div>
    </div>
  );
}