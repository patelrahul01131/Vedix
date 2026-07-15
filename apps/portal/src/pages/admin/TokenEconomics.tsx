import { useEffect, useState } from 'react';

export const TokenEconomics = () => {
  const [modelStats, setModelStats] = useState<any[]>([]);
  const [serviceStats, setServiceStats] = useState<any[]>([]);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('vedix_token');
      const res = await fetch('http://localhost:3000/api/admin/token-stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.modelStats) {
        setModelStats(data.modelStats);
        setServiceStats(data.serviceStats);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const totalCostEstimate = modelStats.reduce((acc, curr) => acc + (curr.total / 1000000) * 0.15, 0); // rough $0.15 per M token avg

  return (
    <div className="admin-dashboard">
      <h2>Token Economics</h2>
      <p>Analyze LLM usage and estimated costs across your agent fleet.</p>

      <div className="stats-grid" style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
        <div className="stat-card" style={{ padding: '20px', background: 'var(--card-bg)', borderRadius: '8px', flex: 1 }}>
          <h3>Total Tokens Processed</h3>
          <div className="stat-value">{modelStats.reduce((acc, curr) => acc + curr.total, 0).toLocaleString()}</div>
        </div>
        <div className="stat-card" style={{ padding: '20px', background: 'var(--card-bg)', borderRadius: '8px', flex: 1 }}>
          <h3>Estimated Cost</h3>
          <div className="stat-value">${totalCostEstimate.toFixed(4)}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px' }}>
        <div style={{ flex: 1 }}>
          <h3>Usage by Model</h3>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Model</th>
                <th>Tokens</th>
              </tr>
            </thead>
            <tbody>
              {modelStats.map((stat, idx) => (
                <tr key={idx}>
                  <td>{stat.model}</td>
                  <td>{stat.total.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ flex: 1 }}>
          <h3>Usage by Service</h3>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Service (e.g., Planner, MemoryCritic)</th>
                <th>Tokens</th>
              </tr>
            </thead>
            <tbody>
              {serviceStats.map((stat, idx) => (
                <tr key={idx}>
                  <td>{stat.service}</td>
                  <td>{stat.total.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
