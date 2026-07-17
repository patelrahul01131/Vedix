import { useState, useEffect } from 'react';
import axios from 'axios';
import { Brain, Search, Globe, CheckCircle } from 'lucide-react';

const API_URL = '/api/user/learning';

interface LearningRule {
  id: string;
  category: string;
  rule: string;
  source: string;
  confidence: number;
  isActive: boolean;
  createdAt: string;
}

export default function AgentLearning() {
  const [learning, setLearning] = useState<LearningRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const token = localStorage.getItem('token'); // User token

  useEffect(() => {
    fetchLearning();
  }, []);

  const fetchLearning = async () => {
    try {
      const res = await axios.get(API_URL, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLearning(res.data.learning || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLearning = learning.filter(l => 
    l.rule.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && learning.length === 0) return <div style={{ padding: '2rem' }}>Loading what the agent knows about you...</div>;

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <Brain size={32} color="var(--accent-color)" />
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>Agent Learning</h1>
      </div>
      
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', maxWidth: '800px', lineHeight: '1.5' }}>
        This page shows exactly what the AI agent has learned about you. The agent uses these rules and facts to personalize its responses across the web and the extension. It automatically learns as you interact, and decays memories that are no longer relevant.
      </p>

      <div style={{ position: 'relative', maxWidth: '400px', marginBottom: '24px' }}>
        <Search size={20} color="var(--text-secondary)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
        <input 
          type="text" 
          placeholder="Search what the agent knows..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ 
            width: '100%', padding: '12px 16px 12px 48px', 
            background: 'rgba(30, 41, 59, 0.5)', border: '1px solid var(--border-color)', 
            borderRadius: '8px', color: 'var(--text-primary)', outline: 'none' 
          }}
        />
      </div>

      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Learned Rule</th>
              <th>Source</th>
              <th>Confidence</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {filteredLearning.map(item => (
              <tr key={item.id}>
                <td>
                  <span className="badge badge-primary">{item.category}</span>
                </td>
                <td style={{ maxWidth: '400px', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                  {item.rule}
                </td>
                <td>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    {item.source === 'WEB' ? <Globe size={14} /> : <CheckCircle size={14} />}
                    {item.source}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ flex: 1, height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden', minWidth: '50px' }}>
                      <div style={{ width: `${item.confidence}%`, height: '100%', background: item.confidence > 70 ? 'var(--success-color)' : 'var(--accent-color)' }} />
                    </div>
                    <span style={{ fontSize: '0.875rem' }}>{item.confidence}</span>
                  </div>
                </td>
                <td style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  {new Date(item.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {filteredLearning.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
                  The agent hasn't learned any explicit rules about you yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
