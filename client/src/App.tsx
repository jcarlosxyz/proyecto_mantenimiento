import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ActivosList from './pages/ActivosList'
import ActivoForm from './pages/ActivoForm'
import ActivoDetail from './pages/ActivoDetail'
import MaterialesList from './pages/MaterialesList'
import OrdenesPage from './pages/OrdenesPage'
import TecnicosPage from './pages/TecnicosPage'
import PlanesPage from './pages/PlanesPage'
import { ToastProvider } from './components/Toast'

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/activos" replace />} />
            <Route path="/activos" element={<ActivosList />} />
            <Route path="/activos/nuevo" element={<ActivoForm />} />
            <Route path="/activos/:id" element={<ActivoDetail />} />
            <Route path="/activos/:id/editar" element={<ActivoForm />} />
            <Route path="/materiales" element={<MaterialesList />} />
            <Route path="/ordenes-trabajo" element={<OrdenesPage />} />
            <Route path="/planes" element={<PlanesPage />} />
            <Route path="/tecnicos" element={<TecnicosPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  )
}
