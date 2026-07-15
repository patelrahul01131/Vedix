import { useState, useEffect } from 'react';
import axios from 'axios';
import { Brain, CheckCircle, Clock, Search } from 'lucide-react';

const API_URL = '/api/admin/memories';

interface Memory {
  id: string;
  type: string;
  content: string;
  confidence: number;
  status: string;
  createdAt: string;
  user: {
    email: string;
  };
}

export default function AgentKnowledge() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  
  const token = localStorage.getItem('adminToken');

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchMemories();
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);

  const fetchMemories = async () => {
    try {
      const res = await axios.get(`${API_URL}?search=${encodeURIComponent(searchTerm)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMemories(res.data.memories);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await axios.patch(`${API_URL}/${id}/status`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchMemories(); // Refresh list after update
    } catch (err) {
      console.error(err);
    }
  };

  const filteredMemories = memories.filter(m => filterType === 'ALL' || m.type === filterType);

  if (loading && memories.length === 0) return <div>Loading...</div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <Brain size={32} color="var(--accent-color)" />
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>Global Agent Brain</h1>
      </div>
      
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
        This is a global view of everything the Vedix agents have learned across all users.
      </p>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={20} color="var(--text-secondary)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder="Search all knowledge..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
              width: '100%', padding: '12px 16px 12px 48px', 
              background: 'rgba(30, 41, 59, 0.5)', border: '1px solid var(--border-color)', 
              borderRadius: '8px', color: 'var(--text-primary)', outline: 'none' 
            }}
          />
        </div>
        
        <select 
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={{
            padding: '12px 16px', background: 'rgba(30, 41, 59, 0.5)', 
            border: '1px solid var(--border-color)', borderRadius: '8px', 
            color: 'var(--text-primary)', outline: 'none', cursor: 'pointer'
          }}
        >
          <option value="ALL">All Knowledge</option>
          <option value="SKILL">Skills</option>
          <option value="PREFERENCE">Preferences</option>
          <option value="ERROR">Errors</option>
        </select>
      </div>

      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>User Email</th>
              <th>Type</th>
              <th>Extracted Lesson</th>
              <th>Confidence</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredMemories.map(m => (
              <tr key={m.id}>
                <td style={{ fontWeight: 500 }}>{m.user.email}</td>
                <td>
                  <span className={m.type === 'SKILL' ? 'badge badge-success' : m.type === 'ERROR' ? 'badge badge-danger' : 'badge badge-warning'}>
                    {m.type}
                  </span>
                </td>
                <td style={{ maxWidth: '300px', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                  {m.content}
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ flex: 1, height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden', minWidth: '50px' }}>
                      <div style={{ width: `${m.confidence}%`, height: '100%', background: m.confidence > 70 ? 'var(--success-color)' : 'var(--accent-color)' }} />
                    </div>
                    <span style={{ fontSize: '0.875rem' }}>{m.confidence}</span>
                  </div>
                </td>
                <td>
                  {m.status === 'APPROVED' ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--success-color)' }}>
                      <CheckCircle size={16} /> Verified
                    </span>
                  ) : (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
                      <Clock size={16} /> Pending
                    </span>
                  )}
                </td>
                <td style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  {new Date(m.createdAt).toLocaleDateString()}
                </td>
                <td>
                  {m.status === 'PENDING' && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => updateStatus(m.id, 'APPROVED')}
                        style={{ padding: '4px 8px', background: 'var(--success-color)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                      >
                        Approve
                      </button>
                      <button 
                        onClick={() => updateStatus(m.id, 'REJECTED')}
                        style={{ padding: '4px 8px', background: 'var(--danger-color)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                      >
                        Decline
                      </button>
                    </div>
                  )}
                  {m.status === 'APPROVED' && m.confidence < 100 && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => updateStatus(m.id, 'APPROVED')}
                        style={{ padding: '4px 8px', background: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                        title="Manually verify to increase confidence to 100%"
                      >
                        Trust Fully
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {filteredMemories.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                  No knowledge found matching criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
