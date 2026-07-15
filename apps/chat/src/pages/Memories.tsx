import { useState, useEffect } from 'react';
import axios from 'axios';
import { Brain, Search, CheckCircle, Clock } from 'lucide-react';

const API_URL = '/api/user/memories';

interface Memory {
  id: string;
  type: string;
  content: string;
  confidence: number;
  status: string;
  createdAt: string;
}

export default function Memories() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // ALL, SKILL, PREFERENCE, ERROR
  
  const token = localStorage.getItem('token');

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

  const filteredMemories = memories.filter(m => filterType === 'ALL' || m.type === filterType);

  if (loading && memories.length === 0) return <div>Loading...</div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <Brain size={32} color="var(--accent-color)" />
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>Memory Center</h1>
      </div>
      
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
        Review the technical skills, user preferences, and errors the agent has learned from your conversations.
      </p>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={20} color="var(--text-secondary)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder="Search memories..." 
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
          <option value="ALL">All Categories</option>
          <option value="SKILL">Skills & Knowledge</option>
          <option value="PREFERENCE">User Preferences</option>
          <option value="ERROR">Error Post-Mortems</option>
        </select>
      </div>

      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Extracted Lesson</th>
              <th>Confidence</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {filteredMemories.map(m => (
              <tr key={m.id}>
                <td>
                  <span className={m.type === 'SKILL' ? 'badge badge-success' : m.type === 'ERROR' ? 'badge badge-danger' : 'badge badge-warning'}>
                    {m.type}
                  </span>
                </td>
                <td style={{ maxWidth: '400px', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
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
              </tr>
            ))}
            {filteredMemories.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
                  No memories found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
