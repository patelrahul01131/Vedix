import { useEffect, useState } from 'react';
import { useAgentStore } from './store';
import './App.css'; // Or a separate SkillLibrary.css

export const SkillLibrary = () => {
  const skills = useAgentStore(state => state.skills);
  const getSkills = useAgentStore(state => state.getSkills);
  const addSkill = useAgentStore(state => state.addSkill);
  const deleteSkill = useAgentStore(state => state.deleteSkill);
  const ws = useAgentStore(state => state.ws);

  const [newSkillText, setNewSkillText] = useState('');

  useEffect(() => {
    if (ws?.readyState === WebSocket.OPEN) {
      getSkills();
    }
  }, [ws, getSkills]);

  const handleAddSkill = () => {
    if (newSkillText.trim()) {
      addSkill(newSkillText.trim());
      setNewSkillText('');
    }
  };

  return (
    <div className="skill-library-container">
      <h3>Personal Skill Library</h3>
      <p style={{fontSize: '12px', color: '#888'}}>These are the rules and technical context the agent has learned about your workflow.</p>
      
      <div className="add-skill-form" style={{marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px'}}>
        <textarea 
          placeholder="Explicitly teach the agent a new rule (e.g., 'Never use Tailwind')" 
          value={newSkillText}
          onChange={e => setNewSkillText(e.target.value)}
          rows={3}
          style={{padding: '8px', borderRadius: '4px', background: 'var(--vscode-input-background)', color: 'var(--vscode-input-foreground)', border: '1px solid var(--vscode-input-border)'}}
        />
        <button onClick={handleAddSkill} style={{padding: '6px', cursor: 'pointer', background: 'var(--vscode-button-background)', color: 'var(--vscode-button-foreground)', border: 'none', borderRadius: '4px'}}>
          Teach Agent
        </button>
      </div>

      <div className="skills-list" style={{display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto'}}>
        {skills.map((skill) => (
          <div key={skill.id} className="skill-card" style={{padding: '10px', background: 'var(--vscode-editor-inactiveSelectionBackground)', borderRadius: '6px', fontSize: '13px'}}>
            <div className="skill-content" style={{marginBottom: '8px'}}>{skill.content}</div>
            <div className="skill-footer" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <span className="skill-confidence" title="Confidence Score (drops if unused)" style={{color: '#ff9800', fontWeight: 'bold'}}>
                🔥 {skill.confidence}/100
              </span>
              <button 
                className="delete-skill-btn" 
                onClick={() => deleteSkill(skill.id)}
                title="Make the agent forget this skill"
                style={{padding: '4px 8px', fontSize: '11px', cursor: 'pointer', background: 'transparent', border: '1px solid var(--vscode-errorForeground)', color: 'var(--vscode-errorForeground)', borderRadius: '4px'}}
              >
                Forget
              </button>
            </div>
          </div>
        ))}
        {skills.length === 0 && <p className="no-skills-msg" style={{textAlign: 'center', opacity: 0.5}}>The agent hasn't learned any approved skills yet.</p>}
      </div>
    </div>
  );
};
