import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Key, LogOut, Plus, Trash2, Clock, Copy, Check } from 'lucide-react';

const API_URL = 'http://localhost:3001/api/keys';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  expiresAt: string | null;
}

export default function Dashboard() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState('');
  const [expiresIn, setExpiresIn] = useState('0'); // 0 = never
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchKeys();
  }, [token, navigate]);

  const fetchKeys = async () => {
    try {
      const res = await axios.get(API_URL, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setKeys(res.data.apiKeys);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(
        `${API_URL}/generate`,
        { name: newKeyName, expiresInDays: parseInt(expiresIn) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewKeyName('');
      setExpiresIn('0');
      fetchKeys();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await axios.delete(`${API_URL}/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchKeys();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-textPrimary">Loading...</div>;

  return (
    <div className="min-h-screen bg-background text-textPrimary p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center bg-surface p-6 rounded-2xl border border-gray-800 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-primary/20 text-primary rounded-xl flex items-center justify-center">
              <Key size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">API Keys</h1>
              <p className="text-textSecondary text-sm">Manage your agent access tokens ({user?.email})</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-textSecondary hover:text-red-400 transition-colors"
          >
            <LogOut size={20} /> Logout
          </button>
        </div>

        {/* Generate New Key Form */}
        <div className="bg-surface p-6 rounded-2xl border border-gray-800 shadow-xl">
          <h2 className="text-lg font-semibold mb-4">Create New Key</h2>
          <form onSubmit={handleGenerate} className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-textSecondary mb-2">Key Name</label>
              <input
                type="text"
                required
                placeholder="e.g., VSCode Extension"
                className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
              />
            </div>
            <div className="w-48">
              <label className="block text-sm font-medium text-textSecondary mb-2">Expiration</label>
              <select 
                className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary"
                value={expiresIn}
                onChange={(e) => setExpiresIn(e.target.value)}
              >
                <option value="0">Never</option>
                <option value="7">7 Days</option>
                <option value="30">30 Days</option>
                <option value="90">90 Days</option>
              </select>
            </div>
            <button
              type="submit"
              className="bg-primary hover:bg-primaryHover text-white px-6 py-2.5 rounded-lg flex items-center gap-2 transition-colors font-medium h-[46px]"
            >
              <Plus size={20} /> Generate
            </button>
          </form>
        </div>

        {/* Keys List */}
        <div className="bg-surface rounded-2xl border border-gray-800 shadow-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-900/50 border-b border-gray-800">
                <th className="py-4 px-6 font-medium text-textSecondary">Name</th>
                <th className="py-4 px-6 font-medium text-textSecondary">Key</th>
                <th className="py-4 px-6 font-medium text-textSecondary">Created</th>
                <th className="py-4 px-6 font-medium text-textSecondary">Expires</th>
                <th className="py-4 px-6 font-medium text-textSecondary text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-textSecondary">No API keys generated yet.</td>
                </tr>
              ) : (
                keys.map((key) => {
                  const isExpired = key.expiresAt && new Date(key.expiresAt) < new Date();
                  return (
                    <tr key={key.id} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                      <td className="py-4 px-6 font-medium">{key.name}</td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <code className="bg-black/50 px-3 py-1 rounded text-primary text-sm font-mono">
                            {key.key.substring(0, 8)}...{key.key.substring(key.key.length - 4)}
                          </code>
                          <button 
                            onClick={() => handleCopy(key.key)}
                            className="text-textSecondary hover:text-white p-1 rounded transition-colors"
                            title="Copy full key"
                          >
                            {copiedKey === key.key ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                          </button>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-sm text-textSecondary">
                        {new Date(key.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-6">
                        {key.expiresAt ? (
                          <span className={`flex items-center gap-1 text-sm ${isExpired ? 'text-red-400' : 'text-textSecondary'}`}>
                            <Clock size={14} /> {new Date(key.expiresAt).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-sm text-green-400">Never</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => handleRevoke(key.id)}
                          className="text-textSecondary hover:text-red-400 p-2 rounded transition-colors"
                          title="Revoke Key"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
