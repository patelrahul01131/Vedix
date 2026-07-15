import { useState, useEffect } from 'react';
import axios from 'axios';
import { Key, Copy, Trash2, Plus } from 'lucide-react';

const API_URL = '/api/keys';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  expiresAt: string | null;
}

export default function Settings() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState('');
  const [expiresIn, setExpiresIn] = useState('0');
  
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      const res = await axios.get(API_URL, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setKeys(res.data.apiKeys);
    } catch (err) {
      console.error(err);
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
    alert('Key copied to clipboard');
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1 style={{ marginBottom: '24px', fontSize: '2rem', fontWeight: 'bold' }}>Settings & API Keys</h1>
      
      <div className="glass-panel">
        <h3 style={{ marginBottom: '16px', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Key size={20} /> Generate New Key
        </h3>
        <form onSubmit={handleGenerate} style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Key Name (e.g. My MacBook)"
            required
            style={{ 
              flex: 1, padding: '12px 16px', borderRadius: '8px', 
              border: '1px solid var(--border-color)', background: 'var(--bg-dark)', 
              color: 'white', minWidth: '200px'
            }}
          />
          <select
            value={expiresIn}
            onChange={(e) => setExpiresIn(e.target.value)}
            style={{ 
              padding: '12px 16px', borderRadius: '8px', 
              border: '1px solid var(--border-color)', background: 'var(--bg-dark)', 
              color: 'white', minWidth: '150px'
            }}
          >
            <option value="0">Never expire</option>
            <option value="7">7 Days</option>
            <option value="30">30 Days</option>
            <option value="90">90 Days</option>
          </select>
          <button 
            type="submit"
            style={{ 
              padding: '12px 24px', borderRadius: '8px', background: 'var(--accent-color)', 
              color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: '8px'
            }}
          >
            <Plus size={18} /> Generate Key
          </button>
        </form>
      </div>

      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Key</th>
              <th>Created</th>
              <th>Expires</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {keys.map(k => (
              <tr key={k.id}>
                <td style={{ fontWeight: 500 }}>{k.name}</td>
                <td>
                  <code style={{ background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '4px' }}>
                    {k.key.substring(0, 12)}...
                  </code>
                </td>
                <td style={{ color: 'var(--text-secondary)' }}>
                  {new Date(k.createdAt).toLocaleDateString()}
                </td>
                <td>
                  {k.expiresAt ? (
                    <span className={new Date(k.expiresAt) > new Date() ? 'badge badge-success' : 'badge badge-danger'}>
                      {new Date(k.expiresAt).toLocaleDateString()}
                    </span>
                  ) : (
                    <span className="badge badge-success">Never</span>
                  )}
                </td>
                <td style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => handleCopy(k.key)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                    title="Copy Key"
                  >
                    <Copy size={18} />
                  </button>
                  <button 
                    onClick={() => handleRevoke(k.id)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--danger-color)', cursor: 'pointer' }}
                    title="Revoke Key"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {keys.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                  No API keys generated yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
