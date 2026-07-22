import { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, MessageSquare, Terminal, Brain } from 'lucide-react';

const API_URL = '/api/admin/missions';

export default function MissionDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [mission, setMission] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const token = localStorage.getItem('adminToken');

  useEffect(() => {
    fetchChat();
  }, [id]);

  const fetchChat = async () => {
    try {
      const res = await axios.get(`${API_URL}/${id}/chat`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMission(res.data.mission);
      setMessages(res.data.messages || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!mission) return <div>Mission not found.</div>;

  return (
    <div>
      <div 
        onClick={() => navigate(-1)} 
        style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: '24px' }}
      >
        <ArrowLeft size={16} /> Back
      </div>

      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0 0 8px 0' }}>{mission.title}</h1>
        <div style={{ display: 'flex', gap: '12px', color: 'var(--text-secondary)' }}>
          <span className="badge badge-primary">{mission.status}</span>
          <span><Clock size={14} style={{ display: 'inline', marginRight: '4px' }}/> {new Date(mission.createdAt).toLocaleString()}</span>
          <span>User: {mission.user?.email || 'Unknown'}</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px', margin: '0 auto' }}>
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div key={msg.id} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: isUser ? 'flex-end' : 'flex-start',
            }}>
              <div style={{
                background: isUser ? 'var(--accent-color)' : 'var(--card-bg)',
                color: isUser ? '#fff' : 'var(--text-primary)',
                padding: '16px',
                borderRadius: '12px',
                borderBottomRightRadius: isUser ? '0' : '12px',
                borderBottomLeftRadius: !isUser ? '0' : '12px',
                maxWidth: '85%',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                border: isUser ? 'none' : '1px solid rgba(255,255,255,0.1)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: isUser ? 'rgba(255,255,255,0.8)' : 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  {isUser ? <MessageSquare size={14} /> : <Brain size={14} />}
                  <span style={{ fontWeight: 600 }}>{msg.role.toUpperCase()}</span>
                </div>
                
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5', fontFamily: msg.role === 'tool' ? 'monospace' : 'inherit', overflowX: 'auto' }}>
                  {msg.content}
                </div>

                {msg.toolCalls && (
                  <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      <Terminal size={12} /> Tool Calls
                    </div>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', overflowX: 'auto' }}>{msg.toolCalls}</pre>
                  </div>
                )}
              </div>

              {!isUser && msg.tokens && (
                <div style={{ 
                  marginTop: '8px', 
                  fontSize: '0.75rem', 
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  gap: '12px',
                  background: 'rgba(0,0,0,0.2)',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.05)'
                }}>
                  <span title="Prompt Tokens">P: {msg.tokens.prompt}</span>
                  <span title="Completion Tokens">C: {msg.tokens.completion}</span>
                  <span title="Total Tokens" style={{ fontWeight: 600, color: 'var(--accent-color)' }}>T: {msg.tokens.total}</span>
                </div>
              )}
            </div>
          );
        })}
        
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px' }}>
            No chat messages found for this mission.
          </div>
        )}
      </div>
    </div>
  );
}
