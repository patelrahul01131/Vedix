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
            {stats.missionActivity.map((val: any, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', position: 'relative' }} className="chart-bar-container">
                {/* Tooltip on hover */}
                <div className="chart-tooltip" style={{
                  display: 'none', position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
                  background: 'var(--card-bg)', padding: '8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)',
                  fontSize: '0.75rem', zIndex: 10, whiteSpace: 'nowrap', marginBottom: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{val.date}</div>
                  <div>Web Agent: {val.web}</div>
                  <div>Extension: {val.extension}</div>
                  <div style={{ color: 'var(--accent-color)', fontWeight: 'bold', marginTop: '4px' }}>Total: {val.total}</div>
                </div>

                <div 
                  className="chart-bar"
                  style={{ 
                    width: '100%', 
                    height: `${((val.total || 0) / maxMissions) * 180}px`, 
                    background: i === 6 ? 'var(--accent-color)' : 'rgba(56, 189, 248, 0.2)',
                    borderRadius: '4px 4px 0 0',
                    transition: 'height 1s ease-out',
                    cursor: 'pointer'
                  }} 
                  onMouseEnter={(e) => {
                    const tooltip = e.currentTarget.previousElementSibling as HTMLElement;
                    if (tooltip) tooltip.style.display = 'block';
                  }}
                  onMouseLeave={(e) => {
                    const tooltip = e.currentTarget.previousElementSibling as HTMLElement;
                    if (tooltip) tooltip.style.display = 'none';
                  }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {new Date(val.date).toLocaleDateString(undefined, { weekday: 'short' })}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel">
          <h3 style={{ margin: '0 0 24px 0', fontSize: '1.25rem' }}>Cumulative Knowledge Growth</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '200px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
            {stats.memoryGrowth.map((val: any, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', position: 'relative' }}>
                <div className="chart-tooltip" style={{
                  display: 'none', position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
                  background: 'var(--card-bg)', padding: '8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)',
                  fontSize: '0.75rem', zIndex: 10, whiteSpace: 'nowrap', marginBottom: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{val.date}</div>
                  <div style={{ color: 'var(--success-color)', fontWeight: 'bold' }}>Total Memories: {val.count}</div>
                </div>

                <div 
                  style={{ 
                    width: '100%', 
                    height: `${((val.count || 0) / maxMemory) * 180}px`, 
                    background: 'linear-gradient(to top, rgba(34, 197, 94, 0.2), rgba(34, 197, 94, 0.8))',
                    borderRadius: '4px 4px 0 0',
                    transition: 'height 1s ease-out',
                    cursor: 'pointer'
                  }} 
                  onMouseEnter={(e) => {
                    const tooltip = e.currentTarget.previousElementSibling as HTMLElement;
                    if (tooltip) tooltip.style.display = 'block';
                  }}
                  onMouseLeave={(e) => {
                    const tooltip = e.currentTarget.previousElementSibling as HTMLElement;
                    if (tooltip) tooltip.style.display = 'none';
                  }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {new Date(val.date).toLocaleDateString(undefined, { weekday: 'short' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
