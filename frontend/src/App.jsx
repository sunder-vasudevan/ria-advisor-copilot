import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import RequireAdvisorAuth from './components/RequireAdvisorAuth'
import RequireClientAuth from './components/RequireClientAuth'

const ClientList   = lazy(() => import('./pages/ClientList'))
const Client360    = lazy(() => import('./pages/Client360'))
const ClientForm   = lazy(() => import('./pages/ClientForm'))
const AdvisorLogin = lazy(() => import('./pages/AdvisorLogin'))
const ClientLogin  = lazy(() => import('./pages/ClientLogin'))
const ClientPortal = lazy(() => import('./pages/ClientPortal'))
const HelpPage     = lazy(() => import('./pages/HelpPage'))

function PageLoader() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#1D6FDB] border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<AdvisorLogin />} />
          <Route path="/client-portal/login" element={<ClientLogin />} />
          <Route path="/client-portal" element={
            <RequireClientAuth><ClientPortal /></RequireClientAuth>
          } />
          <Route path="/" element={
            <RequireAdvisorAuth><ClientList /></RequireAdvisorAuth>
          } />
          <Route path="/clients/new" element={
            <RequireAdvisorAuth><ClientForm /></RequireAdvisorAuth>
          } />
          <Route path="/clients/:id" element={
            <RequireAdvisorAuth><Client360 /></RequireAdvisorAuth>
          } />
          <Route path="/clients/:id/edit" element={
            <RequireAdvisorAuth><ClientForm /></RequireAdvisorAuth>
          } />
          <Route path="/help" element={
            <RequireAdvisorAuth><HelpPage /></RequireAdvisorAuth>
          } />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
