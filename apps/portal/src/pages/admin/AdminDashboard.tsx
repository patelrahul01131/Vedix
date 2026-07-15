import { useState, useEffect } from 'react';
import axios from 'axios';
import { TrendingUp, Users, Activity, Brain } from 'lucide-react';

const API_URL = '/api/admin';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ 
    totalUsers: 0, 
    totalMissions: 0, 
    totalMessages: 0, 
    totalMemories: 0,
    missionActivity: [0,0,0,0,0,0,0],
    memoryGrowth: [0,0,0,0,0,0,0]
  });
  const [loading, setLoading] = useState(true);
  
  const token = localStorage.getItem('adminToken');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API_URL}/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(res.data.stats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  const maxMissions = Math.max(...stats.missionActivity, 1);
  const maxMemory = Math.max(...stats.memoryGrowth, 1);

  return (
    <div>
      <h1 style={{ marginBottom: '24px', fontSize: '2rem', fontWeight: 'bold' }}>Global Overview</h1>
      
      <div className="stats-grid" style={{ marginBottom: '32px' }}>
        <div className="stat-card">
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Users size={16}/> Total Users</div>
          <div className="stat-value">{stats.totalUsers}</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Activity size={16}/> Total Missions</div>
          <div className="stat-value">{stats.totalMissions}</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><TrendingUp size={16}/> Total Messages</div>
          <div className="stat-value">{stats.totalMessages}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Brain size={16}/> Agent Memories</div>
          <div className="stat-value">{stats.totalMemories}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div className="glass-panel">
          <h3 style={{ margin: '0 0 24px 0', fontSize: '1.25rem' }}>Platform Activity (Weekly)</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '200px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
            {stats.missionActivity.map((val, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div style={{ 
                  width: '100%', 
                  height: `${(val / maxMissions) * 180}px`, 
                  background: i === 6 ? 'var(--accent-color)' : 'rgba(56, 189, 248, 0.2)',
                  borderRadius: '4px 4px 0 0',
                  transition: 'height 1s ease-out'
                }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Day {i + 1}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel">
          <h3 style={{ margin: '0 0 24px 0', fontSize: '1.25rem' }}>Cumulative Knowledge Growth</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '200px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
            {stats.memoryGrowth.map((val, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div style={{ 
                  width: '100%', 
                  height: `${(val / maxMemory) * 180}px`, 
                  background: 'linear-gradient(to top, rgba(34, 197, 94, 0.2), rgba(34, 197, 94, 0.8))',
                  borderRadius: '4px 4px 0 0',
                  transition: 'height 1s ease-out'
                }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Day {i + 1}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
