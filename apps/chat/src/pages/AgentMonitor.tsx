import { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, Play, Square, Loader } from 'lucide-react';

const API_URL = '/api/user/missions';

interface Mission {
  id: string;
  title: string;
  status: string;
  summary: string | null;
  updatedAt: string;
}

export default function AgentMonitor() {
  const [activeMissions, setActiveMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchMissions();
    // Poll every 3 seconds for live agent status
    const interval = setInterval(fetchMissions, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchMissions = async () => {
    try {
      const res = await axios.get(API_URL, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Filter to only show active or recently completed missions
      const missions = res.data.missions.filter((m: Mission) => m.status !== 'Failed' && m.status !== 'Idle');
      setActiveMissions(missions);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && activeMissions.length === 0) return <div>Loading...</div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <Activity size={32} color="var(--accent-color)" />
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>AI Agent Monitor</h1>
      </div>
      
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
        Watch your autonomous agent's live execution status and active tasks in real-time.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {activeMissions.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '48px' }}>
            <Square size={48} color="var(--text-secondary)" style={{ marginBottom: '16px', opacity: 0.5 }} />
            <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>No Active Agents</h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              Your Vedix agent is currently idle. Start a new mission from your VSCode extension to see it run here.
            </p>
          </div>
        ) : (
          activeMissions.map(m => (
            <div key={m.id} className="glass-panel" style={{ borderLeft: '4px solid var(--accent-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '1.25rem' }}>{m.title}</h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    ID: {m.id}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {m.status === 'Completed' ? (
                    <span className="badge badge-success">Completed</span>
                  ) : (
                    <>
                      <Loader className="spin" size={16} color="var(--accent-color)" />
                      <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.2)', color: 'var(--accent-color)' }}>
                        {m.status}
                      </span>
                    </>
                  )}
                </div>
              </div>
              
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Play size={14} /> Current Context Summary
                </div>
                <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.5', fontFamily: 'monospace' }}>
                  {m.summary || 'Initializing agent workspace and memory...'}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
