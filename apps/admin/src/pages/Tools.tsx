import { useState, useEffect } from 'react';
import axios from 'axios';
import { Wrench } from 'lucide-react';

const API_URL = 'http://localhost:3001/api/admin/tools';

interface Tool {
  name: string;
  description: string;
}

export default function Tools() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  
  const token = localStorage.getItem('adminToken');

  useEffect(() => {
    fetchTools();
  }, []);

  const fetchTools = async () => {
    try {
      const res = await axios.get(API_URL, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTools(res.data.tools);
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
        <Wrench size={32} color="var(--accent-color)" />
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>Available Tools Directory</h1>
      </div>
      
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
        These are the capabilities currently granted to the Vedix agent.
      </p>

      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Tool Name</th>
              <th>Description</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {tools.map(t => (
              <tr key={t.name}>
                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  <code style={{ background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '4px' }}>
                    {t.name}
                  </code>
                </td>
                <td style={{ color: 'var(--text-secondary)' }}>{t.description}</td>
                <td>
                  <span className="badge badge-success">Active</span>
                </td>
              </tr>
            ))}
            {tools.length === 0 && (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                  No tools found in registry.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
