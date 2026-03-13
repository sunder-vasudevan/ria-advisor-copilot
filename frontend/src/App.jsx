import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ClientList from './pages/ClientList'
import Client360 from './pages/Client360'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ClientList />} />
        <Route path="/clients/:id" element={<Client360 />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
