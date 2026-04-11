// 组件类型
export type ComponentType =
  | 'line'
  | 'bar'
  | 'pie'
  | 'gauge'
  | 'candlestick'
  | 'number'
  | 'table';

// 数据源类型
export type DataSourceType = 'dataset' | 'sql' | 'api';

// 数据源配置
export interface DataSourceConfig {
  sourceType: DataSourceType;
  datasetId?: string;
  sql?: string;
  apiConfig?: ApiConfig;
}

// API 配置
export interface ApiConfig {
  apiSourceId?: string;
  path?: string;
  method?: string;
  params?: Record<string, unknown>;
  body?: Record<string, unknown>;
}

// react-grid-layout 布局项
export interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}

// 组件配置
export interface ComponentConfig {
  id: string;
  type: ComponentType;
  title: string;
  layout: LayoutItem;
  dataSource: DataSourceConfig;
  chartConfig: Record<string, unknown>;
  refreshInterval?: number;
}

// Dashboard 模型
export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  layout: LayoutItem[];
  components: ComponentConfig[];
  theme: ThemeType;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
}

// 主题类型
export type ThemeType = 'dark' | 'light' | 'blue' | 'green' | 'purple' | 'red';

// 预设主题色
export const THEME_COLORS: Record<ThemeType, { bg: string; card: string; border: string; text: string; accent: string; label: string }> = {
  dark:   { bg: '#0a0a0a', card: 'rgba(255,255,255,0.03)',   border: 'rgba(255,255,255,0.08)',   text: 'rgba(255,255,255,0.7)',  accent: '#1890ff', label: '暗色' },
  light:  { bg: '#f5f5f5', card: 'rgba(0,0,0,0.04)',          border: 'rgba(0,0,0,0.06)',          text: 'rgba(0,0,0,0.65)',       accent: '#1890ff', label: '亮色' },
  blue:   { bg: '#0d1b2a', card: 'rgba(0,82,155,0.2)',        border: 'rgba(0,150,255,0.3)',       text: 'rgba(0,200,255,0.85)',   accent: '#00b4d8', label: '科技蓝' },
  green:  { bg: '#0a1a0a', card: 'rgba(0,100,50,0.2)',       border: 'rgba(0,200,100,0.3)',       text: 'rgba(0,220,120,0.85)',   accent: '#00c864', label: '翠绿' },
  purple: { bg: '#1a0a2e', card: 'rgba(100,0,180,0.2)',       border: 'rgba(180,0,255,0.3)',       text: 'rgba(200,100,255,0.85)', accent: '#b44fff', label: '梦幻紫' },
  red:    { bg: '#1a0a0a', card: 'rgba(150,0,0,0.2)',        border: 'rgba(255,50,50,0.3)',        text: 'rgba(255,120,120,0.85)', accent: '#ff4040', label: '警戒红' },
};

// 创建 Dashboard
export interface CreateDashboard {
  name: string;
  description?: string;
  layout?: string;
  components?: string;
  theme?: string;
}

// 更新 Dashboard
export interface UpdateDashboard {
  name?: string;
  description?: string;
  layout?: string;
  components?: string;
  status?: string;
  theme?: string;
}

// Dataset 模型
export interface Dataset {
  id: string;
  name: string;
  description?: string;
  sqlQuery?: string;
  apiConfig?: string;
  dataSchema?: string;
  createdAt: string;
  updatedAt: string;
}

// 创建 Dataset
export interface CreateDataset {
  name: string;
  description?: string;
  sqlQuery?: string;
  apiConfig?: string;
  dataSchema?: string;
}

// Datasource 模型
export interface Datasource {
  id: string;
  name: string;
  dbType: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  createdAt: string;
}

// 创建 Datasource
export interface CreateDatasource {
  name: string;
  dbType: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
}

// ApiSource 模型
export interface ApiSource {
  id: string;
  name: string;
  baseUrl: string;
  authType?: string;
  authConfig?: string;
  createdAt: string;
}

// 创建 ApiSource
export interface CreateApiSource {
  name: string;
  baseUrl: string;
  authType?: string;
  authConfig?: string;
}

// 查询结果
export interface QueryResult {
  data: Record<string, unknown>[];
  total: number;
}

// 刷新结果
export interface RefreshResult {
  components: {
    id: string;
    data: Record<string, unknown>[];
    error?: string;
  }[];
}
