import { useState, useEffect } from 'react';

// JSON 验证 hook
export function useSchemaValidation(schemaText: string) {
  const [error, setError] = useState<string | null>(null);
  const [parsedSchema, setParsedSchema] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!schemaText.trim()) {
      setError(null);
      setParsedSchema(null);
      return;
    }

    try {
      const parsed = JSON.parse(schemaText);
      setParsedSchema(parsed);
      setError(null);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Invalid JSON';
      setError(errorMessage);
      setParsedSchema(null);
    }
  }, [schemaText]);

  return { error, parsedSchema };
}
