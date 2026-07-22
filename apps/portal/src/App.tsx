import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import DashboardLayout from './components/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import AgentLearning from './pages/AgentLearning';

// Admin imports
import AdminLogin from './pages/admin/Login';
import AdminDashboardLayout from './components/admin/DashboardLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import Users from './pages/admin/Users';
import UserDetails from './pages/admin/UserDetails';
import Agents from './pages/admin/Agents';
import MissionDetails from './pages/admin/MissionDetails';
import AgentKnowledge from './pages/admin/AgentKnowledge';
import Tools from './pages/admin/Tools';
import { QueueDashboard } from './pages/admin/QueueDashboard';
import { TokenEconomics } from './pages/admin/TokenEconomics';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* User Portal Routes */}
        <Route path="/login" element={<Login />} />
        
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/learning" element={<AgentLearning />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Route>

        {/* Admin Portal Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        
        <Route path="/admin" element={<AdminDashboardLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="users/:id" element={<UserDetails />} />
          <Route path="agents" element={<Agents />} />
          <Route path="missions/:id" element={<MissionDetails />} />
          <Route path="agent-knowledge" element={<AgentKnowledge />} />
          <Route path="tools" element={<Tools />} />
          <Route path="queue" element={<QueueDashboard />} />
          <Route path="tokens" element={<TokenEconomics />} />
        </Route>
        
        <Route path="/admin/*" element={<Navigate to="/admin/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
