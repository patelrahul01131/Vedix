import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = '/api/user';

export default function Dashboard() {
  const [stats, setStats] = useState({ totalMissions: 0, totalApiKeys: 0, totalMemories: 0 });
  const [loading, setLoading] = useState(true);
  
  const token = localStorage.getItem('token');

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

  return (
    <div>
      <h1 style={{ marginBottom: '24px', fontSize: '2rem', fontWeight: 'bold' }}>Overview</h1>
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Missions (Chats)</div>
          <div className="stat-value">{stats.totalMissions}</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Learned Memories</div>
          <div className="stat-value">{stats.totalMemories}</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Active API Keys</div>
          <div className="stat-value">{stats.totalApiKeys}</div>
        </div>
      </div>
      
      <div className="glass-panel">
        <h3 style={{ marginBottom: '16px', fontSize: '1.25rem' }}>Welcome to Vedix!</h3>
        <p style={{ color: 'var(--text-secondary)' }}>
          This is your personal portal. Use the sidebar to navigate through your chat history, manage your API keys, and view what your agent has learned about your workflow.
        </p>
      </div>
    </div>
  );
}
