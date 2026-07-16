import { useEffect, useState } from 'react';

export const QueueDashboard = () => {
  const [stats, setStats] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch('/api/admin/queue-stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.stats) {
        setStats(data.stats);
        setJobs(data.jobs || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h1 style={{ marginBottom: '8px', fontSize: '2rem', fontWeight: 'bold' }}>Queue Dashboard</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Real-time memory extraction queue statistics (BullMQ)</p>

      {stats && (
        <div className="stats-grid" style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
          <div className="stat-card" style={{ padding: '20px', background: 'var(--card-bg)', borderRadius: '8px', flex: 1 }}>
            <h3>Waiting</h3>
            <div className="stat-value">{stats.waiting}</div>
          </div>
          <div className="stat-card" style={{ padding: '20px', background: 'var(--card-bg)', borderRadius: '8px', flex: 1 }}>
            <h3>Active</h3>
            <div className="stat-value">{stats.active}</div>
          </div>
          <div className="stat-card" style={{ padding: '20px', background: 'var(--card-bg)', borderRadius: '8px', flex: 1 }}>
            <h3>Completed</h3>
            <div className="stat-value">{stats.completed}</div>
          </div>
          <div className="stat-card" style={{ padding: '20px', background: 'var(--card-bg)', borderRadius: '8px', flex: 1 }}>
            <h3>Failed</h3>
            <div className="stat-value" style={{ color: 'red' }}>{stats.failed}</div>
          </div>
        </div>
      )}

      <h3 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '16px' }}>Recent Jobs</h3>
      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Status</th>
              <th>Data</th>
            </tr>
          </thead>
        <tbody>
          {jobs.map(job => (
            <tr key={job.id}>
              <td>{job.id}</td>
              <td>{job.name}</td>
              <td>{job.status}</td>
              <td>
                <pre style={{ margin: 0, fontSize: '12px' }}>
                  {JSON.stringify(job.data, null, 2)}
                </pre>
              </td>
            </tr>
          ))}
          {jobs.length === 0 && (
            <tr>
              <td colSpan={4} style={{ textAlign: 'center' }}>No recent jobs</td>
            </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
