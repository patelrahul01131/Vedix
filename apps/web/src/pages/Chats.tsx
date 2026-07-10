import { useState, useEffect } from 'react';
import axios from 'axios';
import { MessageSquare, Search } from 'lucide-react';

const API_URL = 'http://localhost:3001/api/user/missions';

interface Mission {
  id: string;
  title: string;
  status: string;
  summary: string | null;
  updatedAt: string;
  _count: { messages: number };
}

export default function Chats() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchMissions();
  }, []);

  const fetchMissions = async () => {
    try {
      const res = await axios.get(API_URL, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMissions(res.data.missions);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredMissions = missions.filter(m => 
    m.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.id.includes(searchTerm)
  );

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <MessageSquare size={32} color="var(--accent-color)" />
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>Chat History</h1>
      </div>
      
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
        A record of all your autonomous missions and coding chats with Vedix.
      </p>

      <div style={{ position: 'relative', marginBottom: '24px' }}>
        <Search size={20} color="var(--text-secondary)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
        <input 
          type="text" 
          placeholder="Search by mission title or ID..." 
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
        {filteredMissions.map(m => (
          <div key={m.id} className="glass-panel" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{m.title}</h3>
              <span className={m.status === 'Completed' ? 'badge badge-success' : m.status === 'Failed' ? 'badge badge-danger' : 'badge badge-warning'}>
                {m.status}
              </span>
            </div>
            
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
              ID: {m.id} • Last Active: {new Date(m.updatedAt).toLocaleString()} • Messages: {m._count.messages}
            </p>
            
            {m.summary && (
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', borderLeft: '4px solid var(--accent-color)' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                  Rolling Summary
                </h4>
                <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.5' }}>
                  {m.summary}
                </p>
              </div>
            )}
          </div>
        ))}

        {filteredMissions.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)', background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px' }}>
            No chat history found.
          </div>
        )}
      </div>
    </div>
  );
}
