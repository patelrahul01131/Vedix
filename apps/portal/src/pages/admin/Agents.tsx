import { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, Search, Play, Square, Loader } from 'lucide-react';

const API_URL = '/api/admin/agents';

interface AgentMission {
  id: string;
  title: string;
  status: string;
  summary: string | null;
  updatedAt: string;
  user: {
    email: string;
  };
  _count: {
    messages: number;
  };
}

export default function Agents() {
  const [agents, setAgents] = useState<AgentMission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const token = localStorage.getItem('adminToken');

  useEffect(() => {
    fetchAgents();
    const interval = setInterval(fetchAgents, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchAgents = async () => {
    try {
      const res = await axios.get(API_URL, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAgents(res.data.agents);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredAgents = agents.filter(a => 
    a.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.id.includes(searchTerm)
  );

  const activeCount = agents.filter(a => a.status !== 'Completed' && a.status !== 'Failed' && a.status !== 'Idle').length;

  if (loading && agents.length === 0) return <div>Loading...</div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <Activity size={32} color="var(--accent-color)" />
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>Agent Management</h1>
      </div>
      
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
        Monitor all autonomous agent missions running globally across the platform. Currently <strong>{activeCount}</strong> active missions.
      </p>

      <div style={{ position: 'relative', marginBottom: '24px' }}>
        <Search size={20} color="var(--text-secondary)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
        <input 
          type="text" 
          placeholder="Search by mission title, user email, or ID..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ 
            width: '100%', padding: '12px 16px 12px 48px', 
            background: 'rgba(30, 41, 59, 0.5)', border: '1px solid var(--border-color)', 
            borderRadius: '8px', color: 'var(--text-primary)', outline: 'none' 
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {filteredAgents.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '48px' }}>
            <Square size={48} color="var(--text-secondary)" style={{ marginBottom: '16px', opacity: 0.5 }} />
            <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>No Agent Missions Found</h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              No missions match your search criteria.
            </p>
          </div>
        ) : (
          filteredAgents.map(a => (
            <div key={a.id} className="glass-panel" style={{ borderLeft: a.status !== 'Completed' && a.status !== 'Failed' && a.status !== 'Idle' ? '4px solid var(--accent-color)' : '4px solid transparent' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '1.25rem' }}>{a.title}</h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    User: <strong style={{ color: 'var(--text-primary)' }}>{a.user.email}</strong> • ID: {a.id} • Last Active: {new Date(a.updatedAt).toLocaleString()}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {a.status === 'Completed' ? (
                    <span className="badge badge-success">Completed</span>
                  ) : a.status === 'Failed' ? (
                    <span className="badge badge-danger">Failed</span>
                  ) : a.status === 'Idle' ? (
                    <span className="badge badge-warning">Idle</span>
                  ) : (
                    <>
                      <Loader className="spin" size={16} color="var(--accent-color)" />
                      <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.2)', color: 'var(--accent-color)' }}>
                        {a.status}
                      </span>
                    </>
                  )}
                </div>
              </div>
              
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Play size={14} /> Mission Summary
                </div>
                <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.5', fontFamily: 'monospace' }}>
                  {a.summary || 'Initializing agent workspace and memory...'}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
