import { useRef, useEffect, useState } from 'react';

export interface MonacoEditorProps {
  value: string;
  language?: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  height?: string | number;
}

export function MonacoEditor({
  value,
  language = 'json',
  onChange,
  readOnly = false,
  height = '100%',
}: MonacoEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<unknown>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const onChangeRef = useRef(onChange);
  const mountedRef = useRef(true);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    mountedRef.current = true;
    let editor: unknown = null;

    async function initEditor() {
      try {
        const monaco = await import('monaco-editor');
        if (!mountedRef.current || !containerRef.current) return;

        editor = monaco.editor.create(containerRef.current, {
          value,
          language,
          theme: 'vs-dark',
          readOnly,
          automaticLayout: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          folding: true,
          lineNumbers: 'on',
          renderLineHighlight: 'all',
          fontSize: 13,
          fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
          tabSize: 2,
          wordWrap: 'on',
          padding: { top: 12, bottom: 12 },
        });

        if (!mountedRef.current) {
          (editor as { dispose: () => void })?.dispose?.();
          return;
        }

        editorRef.current = editor;

        // Listen to content changes
        (editor as { onDidChangeModelContent: (cb: () => void) => { dispose: () => void } })
          .onDidChangeModelContent(() => {
            if (mountedRef.current && editorRef.current) {
              const ed = editorRef.current as { getValue: () => string };
              onChangeRef.current?.(ed.getValue());
            }
          });

        setIsLoaded(true);
      } catch (err) {
        console.error('Monaco editor init error:', err);
      }
    }

    initEditor();

    return () => {
      mountedRef.current = false;
      if (editor) {
        (editor as { dispose: () => void })?.dispose?.();
      }
      editorRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (isLoaded && editorRef.current) {
      const ed = editorRef.current as { getValue: () => string; setValue: (v: string) => void };
      if (value !== ed.getValue()) {
        ed.setValue(value);
      }
    }
  }, [value, isLoaded]);

  useEffect(() => {
    if (isLoaded && editorRef.current) {
      const ed = editorRef.current as { getModel: () => { setLanguage: (lang: string) => void } | null };
      const model = ed.getModel();
      if (model) {
        model.setLanguage(language);
      }
    }
  }, [language, isLoaded]);

  const finalHeight = typeof height === 'number' ? `${height}px` : height || '300px';

  return (
    <div
      ref={containerRef}
      style={{
        height: finalHeight,
        minHeight: '200px',
        background: '#1e1e1e',
      }}
    />
  );
}