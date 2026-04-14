import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// 暂时禁用 StrictMode 以测试 amis 渲染问题
// <StrictMode>
//   <App />
// </StrictMode>

createRoot(document.getElementById('root')!).render(<App />)
