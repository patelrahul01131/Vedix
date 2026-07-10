import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ShieldAlert, LogOut, Users, Activity, MessageSquare } from 'lucide-react';

const API_URL = 'http://localhost:3001/api/admin';

interface User {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  _count: {
    missions: number;
    apiKeys: number;
  };
}

interface Stats {
  totalUsers: number;
  totalMissions: number;
  totalMessages: number;
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  
  const navigate = useNavigate();
  const token = localStorage.getItem('adminToken');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchData();
  }, [token, navigate]);

  const fetchData = async () => {
    try {
      const [usersRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/users`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/stats`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setUsers(usersRes.data.users);
      setStats(statsRes.data.stats);
    } catch (err) {
      if (axios.isAxiosError(err) && (err.response?.status === 401 || err.response?.status === 403)) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    navigate('/login');
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-textPrimary">Loading System Data...</div>;

  return (
    <div className="min-h-screen bg-background text-textPrimary p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center bg-surface p-6 rounded-2xl border border-gray-800 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-primary/20 text-primary rounded-xl flex items-center justify-center">
              <ShieldAlert size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">System Administration</h1>
              <p className="text-textSecondary text-sm">Global overview and user management</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-textSecondary hover:text-red-400 transition-colors"
          >
            <LogOut size={20} /> Logout
          </button>
        </div>

        {/* Stats Row */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-surface p-6 rounded-2xl border border-gray-800 shadow-lg flex items-center gap-4">
              <div className="p-4 bg-blue-500/10 text-blue-400 rounded-xl"><Users size={32} /></div>
              <div>
                <div className="text-3xl font-bold">{stats.totalUsers}</div>
                <div className="text-textSecondary text-sm">Total Users</div>
              </div>
            </div>
            <div className="bg-surface p-6 rounded-2xl border border-gray-800 shadow-lg flex items-center gap-4">
              <div className="p-4 bg-green-500/10 text-green-400 rounded-xl"><Activity size={32} /></div>
              <div>
                <div className="text-3xl font-bold">{stats.totalMissions}</div>
                <div className="text-textSecondary text-sm">Agent Missions</div>
              </div>
            </div>
            <div className="bg-surface p-6 rounded-2xl border border-gray-800 shadow-lg flex items-center gap-4">
              <div className="p-4 bg-purple-500/10 text-purple-400 rounded-xl"><MessageSquare size={32} /></div>
              <div>
                <div className="text-3xl font-bold">{stats.totalMessages}</div>
                <div className="text-textSecondary text-sm">Total Interactions</div>
              </div>
            </div>
          </div>
        )}

        {/* Users List */}
        <div className="bg-surface rounded-2xl border border-gray-800 shadow-xl overflow-hidden">
          <div className="p-6 border-b border-gray-800">
            <h2 className="text-lg font-semibold">Registered Users</h2>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-900/50 border-b border-gray-800">
                <th className="py-4 px-6 font-medium text-textSecondary">Email</th>
                <th className="py-4 px-6 font-medium text-textSecondary">Role</th>
                <th className="py-4 px-6 font-medium text-textSecondary">Joined</th>
                <th className="py-4 px-6 font-medium text-textSecondary">Missions</th>
                <th className="py-4 px-6 font-medium text-textSecondary">Active Keys</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                  <td className="py-4 px-6 font-medium">{user.email}</td>
                  <td className="py-4 px-6">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${user.role === 'ADMIN' ? 'bg-primary/20 text-primary' : 'bg-gray-700 text-gray-300'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-sm text-textSecondary">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-4 px-6 font-mono text-sm">{user._count.missions}</td>
                  <td className="py-4 px-6 font-mono text-sm">{user._count.apiKeys}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
