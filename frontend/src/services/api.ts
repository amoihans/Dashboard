import type {
  Dashboard,
  CreateDashboard,
  UpdateDashboard,
  Dataset,
  CreateDataset,
  Datasource,
  CreateDatasource,
  ApiSource,
  CreateApiSource,
  QueryResult,
  RefreshResult,
} from '../types';

const BASE_URL = 'http://localhost:8000/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: '请求失败' }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

// ========== Dashboard ==========
export const dashboardApi = {
  list: () => request<Dashboard[]>('/dashboards'),

  get: (id: string) => request<Dashboard>(`/dashboards/${id}`),

  create: (data: CreateDashboard) =>
    request<Dashboard>('/dashboards', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateDashboard) =>
    request<Dashboard>(`/dashboards/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<{ ok: boolean }>(`/dashboards/${id}`, { method: 'DELETE' }),

  publish: (id: string) =>
    request<{ ok: boolean }>(`/dashboards/${id}/publish`, { method: 'POST' }),

  unpublish: (id: string) =>
    request<{ ok: boolean }>(`/dashboards/${id}/unpublish`, { method: 'POST' }),

  getDisplay: (id: string) =>
    request<{
      id: string;
      name: string;
      description?: string;
      layout: unknown[];
      components: unknown[];
      theme: string;
    }>(`/display/${id}`),

  refreshDisplay: (id: string) => request<RefreshResult>(`/display/${id}/refresh`),
};

// ========== Dataset ==========
export const datasetApi = {
  list: () => request<Dataset[]>('/datasets'),

  get: (id: string) => request<Dataset>(`/datasets/${id}`),

  create: (data: CreateDataset) =>
    request<Dataset>('/datasets', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<CreateDataset>) =>
    request<Dataset>(`/datasets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<{ ok: boolean }>(`/datasets/${id}`, { method: 'DELETE' }),
};

// ========== Datasource ==========
export const datasourceApi = {
  list: () => request<Datasource[]>('/datasources'),

  create: (data: CreateDatasource) =>
    request<Datasource>('/datasources', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<{ ok: boolean }>(`/datasources/${id}`, { method: 'DELETE' }),
};

// ========== ApiSource ==========
export const apiSourceApi = {
  list: () => request<ApiSource[]>('/apisources'),

  create: (data: CreateApiSource) =>
    request<ApiSource>('/apisources', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<{ ok: boolean }>(`/apisources/${id}`, { method: 'DELETE' }),
};

// ========== Query ==========
export const queryApi = {
  sql: (sql: string, datasourceId?: string) =>
    request<QueryResult>('/query/sql', {
      method: 'POST',
      body: JSON.stringify({ sql, datasource_id: datasourceId }),
    }),

  dataset: (datasetId: string) =>
    request<QueryResult>(`/query/dataset/${datasetId}`),
};
