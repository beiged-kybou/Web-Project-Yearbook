import { Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Registration from "./pages/Registration";
import BatchTimeline from "./pages/BatchTimeline";
import StudentDirectory from "./pages/StudentDirectory";
import ClubDetail from "./pages/ClubDetail";
import AdminDashboard from "./pages/AdminDashboard";
// import Discover from './pages/Discover'
import DigitalYearbookStudio from "./pages/DigitalYearbookStudio";
import YearbookViewer from "./pages/YearbookViewer";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Registration />} />
      <Route path="/dashboard" element={<Dashboard />} />
      {/* <Route path="/discover" element={<Discover />} /> */}
      <Route path="/batches" element={<BatchTimeline />} />
      <Route path="/directory" element={<StudentDirectory />} />
      <Route path="/clubs/:clubCode" element={<ClubDetail />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/yearbook/studio" element={<DigitalYearbookStudio />} />
      <Route path="/yearbook/:id" element={<YearbookViewer />} />
    </Routes>
  );
}

export default App;
