import styled from './NumberCard.module.css';

interface Props {
  value: number | string;
  unit?: string;
  title?: string;
  loading?: boolean;
}

export function NumberCard({ value, unit = '', title, loading }: Props) {
  return (
    <div className={styled.wrapper}>
      {title && <div className={styled.title}>{title}</div>}
      {loading ? (
        <div className={styled.loading}>加载中...</div>
      ) : (
        <div className={styled.value}>
          {value}
          {unit && <span className={styled.unit}>{unit}</span>}
        </div>
      )}
    </div>
  );
}
