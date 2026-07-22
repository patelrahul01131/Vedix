import { useEffect, useState } from 'react';

export const TokenEconomics = () => {
  const [modelStats, setModelStats] = useState<any[]>([]);
  const [serviceStats, setServiceStats] = useState<any[]>([]);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch('/api/admin/token-stats', {
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

  const totalCostEstimate = modelStats.reduce((acc, curr) => acc + ((curr?._sum?.totalTokens || 0) / 1000000) * 0.15, 0); // rough $0.15 per M token avg

  return (
    <div>
      <h1 style={{ marginBottom: '8px', fontSize: '2rem', fontWeight: 'bold' }}>Token Economics</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Analyze LLM usage and estimated costs across your agent fleet.</p>

      <div className="stats-grid" style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
        <div className="stat-card" style={{ padding: '20px', background: 'var(--card-bg)', borderRadius: '8px', flex: 1 }}>
          <h3>Total Tokens Processed</h3>
          <div className="stat-value">{modelStats.reduce((acc, curr) => acc + (curr?._sum?.totalTokens || 0), 0).toLocaleString()}</div>
        </div>
        <div className="stat-card" style={{ padding: '20px', background: 'var(--card-bg)', borderRadius: '8px', flex: 1 }}>
          <h3>Estimated Cost</h3>
          <div className="stat-value">${totalCostEstimate.toFixed(4)}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '16px' }}>Usage by Model</h3>
          <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Tokens</th>
                </tr>
              </thead>
              <tbody>
                {modelStats.length === 0 ? (
                  <tr>
                    <td colSpan={2} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>
                      No token usage data available yet. Waiting for LLM calls...
                    </td>
                  </tr>
                ) : (
                  modelStats.map((stat, idx) => (
                    <tr key={idx}>
                      <td>{stat.model || 'Unknown'}</td>
                      <td>{(stat.total || 0).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '16px' }}>Usage by Service</h3>
          <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Service (e.g., Planner, MemoryCritic)</th>
                  <th>Tokens</th>
                </tr>
              </thead>
              <tbody>
                {serviceStats.length === 0 ? (
                  <tr>
                    <td colSpan={2} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>
                      No service usage data available yet. Waiting for LLM calls...
                    </td>
                  </tr>
                ) : (
                  serviceStats.map((stat, idx) => (
                    <tr key={idx}>
                      <td>{stat.service || 'Unknown'}</td>
                      <td>{(stat.total || 0).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
