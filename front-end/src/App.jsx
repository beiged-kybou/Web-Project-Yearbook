import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import Albums from "./pages/Albums";
import CreateAlbum from "./pages/CreateAlbum";
import AlbumDetail from "./pages/AlbumDetail";
import AdminDashboard from "./pages/AdminDashboard";
import SearchResults from "./pages/SearchResults";
import Layout from "./components/layout/Layout";

// Placeholder components - will be replaced as we build them
const Dashboard = () => <h1>Dashboard (Protected)</h1>;

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Routes */}
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/albums" element={<Albums />} />
          <Route path="/albums/create" element={<CreateAlbum />} />
          <Route path="/albums/:id" element={<AlbumDetail />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/search" element={<SearchResults />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
