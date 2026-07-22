import { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const API_URL = '/api/admin/users';

export default function UserDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);
  
  const token = localStorage.getItem('adminToken');

  useEffect(() => {
    fetchUser();
    fetchAnalytics();
  }, [id]);

  const fetchUser = async () => {
    try {
      const res = await axios.get(`${API_URL}/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(res.data.user);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await axios.get(`${API_URL}/${id}/analytics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnalytics(res.data.analytics);
    } catch (err) {
      console.error(err);
    }
  };


  if (loading) return <div>Loading...</div>;
  if (!user) return <div>User not found.</div>;

  return (
    <div>
      <div 
        onClick={() => navigate('/admin/users')} 
        style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: '24px' }}
      >
        <ArrowLeft size={16} /> Back to Users
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
        <div style={{ 
          width: '64px', height: '64px', borderRadius: '50%', 
          backgroundColor: 'var(--accent-color)', display: 'flex', 
          alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold' 
        }}>
          {user.email.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0 0 8px 0' }}>{user.email}</h1>
          <div style={{ display: 'flex', gap: '12px' }}>
            <span className={user.role === 'ADMIN' ? 'badge badge-danger' : 'badge badge-success'}>{user.role}</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>ID: {user.id}</span>
          </div>
        </div>
      </div>

      {analytics && (
        <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.25rem' }}>Analytics Overview</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Total Missions</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{analytics.missions.length}</div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Total Messages</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                {analytics.missions.reduce((acc: number, m: any) => acc + (m._count?.messages || 0), 0)}
              </div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Total Tokens Used</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                {(analytics.tokenStats?._sum?.totalTokens || 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Missions Section */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.25rem' }}>Web Missions ({user.webMissions?.length || 0})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
            {user.webMissions?.map((m: any) => (
              <div 
                key={m.id} 
                onClick={() => navigate(`/admin/missions/${m.id}`)}
                style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', cursor: 'pointer', border: '1px solid transparent' }}
                onMouseEnter={(e) => e.currentTarget.style.border = '1px solid rgba(255,255,255,0.2)'}
                onMouseLeave={(e) => e.currentTarget.style.border = '1px solid transparent'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 500, flex: 1, wordBreak: 'break-word', lineHeight: '1.4' }}>{m.title}</span>
                  <span style={{ flexShrink: 0 }} className={m.status === 'Completed' ? 'badge badge-success' : 'badge badge-warning'}>{m.status}</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {new Date(m.updatedAt).toLocaleString()}
                </div>
              </div>
            ))}
            {(!user.webMissions || user.webMissions.length === 0) && <span style={{ color: 'var(--text-secondary)' }}>No web missions found.</span>}
          </div>
        </div>

        {/* Memories Section */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.25rem' }}>Learned Memories ({user.agentMemories.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
            {user.agentMemories.map((m: any) => (
              <div key={m.id} style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span className="badge badge-success">{m.type}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Confidence: {m.confidence}</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.4' }}>{m.content}</p>
              </div>
            ))}
            {user.agentMemories.length === 0 && <span style={{ color: 'var(--text-secondary)' }}>No memories found.</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
