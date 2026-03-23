import { Route, Routes } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Registration from './pages/Registration'
import BatchTimeline from './pages/BatchTimeline'
import StudentDirectory from './pages/StudentDirectory'
import AdminDashboard from './pages/AdminDashboard'
import Discover from './pages/Discover'
import YearbookStudio from './pages/YearbookStudio'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Registration />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/discover" element={<Discover />} />
      <Route path="/batches" element={<BatchTimeline />} />
      <Route path="/directory" element={<StudentDirectory />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/yearbook/studio" element={<YearbookStudio />} />
    </Routes>
  )
}

export default App
