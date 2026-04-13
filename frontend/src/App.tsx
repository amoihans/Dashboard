import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { DashboardList } from './pages/DashboardList';
import { DashboardEdit } from './pages/DashboardEdit';
import { DashboardPreview } from './pages/DashboardPreview';
import { DashboardDisplay } from './pages/DashboardDisplay';
import { DatasetManage } from './pages/DatasetManage';
import { DatasourceManage } from './pages/DatasourceManage';
import { CustomComponentBuilder } from './pages/CustomComponentBuilder';
import { CustomComponentLibrary } from './pages/CustomComponentLibrary';

export default function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<DashboardList />} />
          <Route path="/dashboard/new/edit" element={<DashboardEdit />} />
          <Route path="/dashboard/:id/edit" element={<DashboardEdit />} />
          <Route path="/dashboard/:id/preview" element={<DashboardPreview />} />
          <Route path="/display/:id" element={<DashboardDisplay />} />
          <Route path="/datasets" element={<DatasetManage />} />
          <Route path="/datasources" element={<DatasourceManage />} />
          <Route path="/custom-component/builder" element={<CustomComponentBuilder />} />
          <Route path="/custom-component/library" element={<CustomComponentLibrary />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}
