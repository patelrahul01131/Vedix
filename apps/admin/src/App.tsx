import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import DashboardLayout from './components/DashboardLayout';
import AdminDashboard from './pages/AdminDashboard';
import Users from './pages/Users';
import UserDetails from './pages/UserDetails';
import Agents from './pages/Agents';
import AgentKnowledge from './pages/AgentKnowledge';
import Tools from './pages/Tools';
import { QueueDashboard } from './pages/QueueDashboard';
import { TokenEconomics } from './pages/TokenEconomics';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<AdminDashboard />} />
          <Route path="/users" element={<Users />} />
          <Route path="/users/:id" element={<UserDetails />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/agent-knowledge" element={<AgentKnowledge />} />
          <Route path="/tools" element={<Tools />} />
          <Route path="/queue" element={<QueueDashboard />} />
          <Route path="/tokens" element={<TokenEconomics />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
