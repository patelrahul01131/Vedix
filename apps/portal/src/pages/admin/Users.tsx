import { useState, useEffect } from 'react';
import axios from 'axios';
import { Users as UsersIcon, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_URL = '/api/admin/users';

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

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  const token = localStorage.getItem('adminToken');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get(API_URL, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data.users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <UsersIcon size={32} color="var(--accent-color)" />
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>User Management</h1>
      </div>
      
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
        View all registered users and their platform activity. Click a user for detailed insights.
      </p>

      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Email</th>
              <th>Role</th>
              <th>Missions</th>
              <th>API Keys</th>
              <th>Joined Date</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr 
                key={u.id} 
                onClick={() => navigate(`/admin/users/${u.id}`)}
                style={{ cursor: 'pointer' }}
              >
                <td>
                  <code style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {u.id.substring(0, 8)}...
                  </code>
                </td>
                <td style={{ fontWeight: 500 }}>{u.email}</td>
                <td>
                  {u.role === 'ADMIN' ? (
                    <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <ShieldAlert size={12} /> ADMIN
                    </span>
                  ) : (
                    <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <ShieldCheck size={12} /> USER
                    </span>
                  )}
                </td>
                <td>{u._count.missions}</td>
                <td>{u._count.apiKeys}</td>
                <td style={{ color: 'var(--text-secondary)' }}>
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
