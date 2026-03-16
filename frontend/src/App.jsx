import { Route, Routes } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Registration from './pages/Registration'
import BatchTimeline from './pages/BatchTimeline'
import StudentDirectory from './pages/StudentDirectory'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Registration />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/batches" element={<BatchTimeline />} />
      <Route path="/directory" element={<StudentDirectory />} />
    </Routes>
  )
}

export default App
