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
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
}

// 创建 Dashboard
export interface CreateDashboard {
  name: string;
  description?: string;
  layout?: string;
  components?: string;
}

// 更新 Dashboard
export interface UpdateDashboard {
  name?: string;
  description?: string;
  layout?: string;
  components?: string;
  status?: string;
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
