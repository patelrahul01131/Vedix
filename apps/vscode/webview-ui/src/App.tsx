import { useState, useEffect, useRef, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/vs2015.css';
import { useAgentStore } from './store';
import { vscode } from './utilities/vscode';
import { SkillLibrary } from './SkillLibrary';
import './App.css';

const markdownRemarkPlugins = [remarkGfm];
const markdownRehypePlugins = [rehypeHighlight];
const markdownComponents = {
  a: ({node, ...props}: any) => <a {...props} target="_blank" rel="noreferrer" />,
  table: ({node, ...props}: any) => (
    <div className="table-wrapper">
      <table {...props} />
    </div>
  ),
  img: ({node, ...props}: any) => {
    if (props.src && props.src.match(/\.(mp4|webm|mov)$/i)) {
      return (
        <video controls autoPlay loop muted style={{ maxWidth: '100%', borderRadius: '8px', marginTop: '8px' }}>
          <source src={props.src} type="video/mp4" />
        </video>
      );
    }
    return <img {...props} style={{ maxWidth: '100%', borderRadius: '8px', marginTop: '8px' }} />;
  }
};

const ProviderIcon = ({ model }: { model: string }) => {
  const provider = model.split(':')[0];
  switch (provider) {
    case 'openrouter': return <span className="provider-icon">🚀</span>;
    case 'deepseek': return <span className="provider-icon">🐋</span>;
    case 'gemini': return <span className="provider-icon">✨</span>;
    case 'github': return <span className="provider-icon">🐱</span>;
    case 'ollama': return <span className="provider-icon">🦙</span>;
    case 'groq': return <span className="provider-icon">⚡</span>;
    case 'mistral': return <span className="provider-icon">🌪️</span>;
    default: return <span className="provider-icon">🤖</span>;
  }
};

const PermissionCard = ({ toolName, toolArgs, isResolved, isRejected, onApprove, onReject }: any) => {
  const isFileEdit = ['edit_file', 'update_file', 'write_file', 'create_file'].includes(toolName);
  const filePath = toolArgs?.path || toolArgs?.filePath || toolArgs?.file_path || toolArgs?.filename || 'file';
  const filename = filePath.split('/').pop() || filePath.split('\\').pop() || 'file';

  let linesAdded = 0;
  let linesRemoved = 0;

  if (toolName === 'edit_file' || toolName === 'update_file') {
    if (toolArgs.diffStats) {
      linesAdded = toolArgs.diffStats.added;
      linesRemoved = toolArgs.diffStats.removed;
    } else if (toolArgs.startLine !== undefined && toolArgs.endLine !== undefined) {
      linesRemoved = (toolArgs.endLine - toolArgs.startLine) + 1;
      linesAdded = (toolArgs.replacementContent || '').split(/\r?\n/).length;
    } else {
      const targetLines = (toolArgs.targetContent || '').split(/\r?\n/);
      const replaceLines = (toolArgs.replacementContent || '').split(/\r?\n/);
      
      let startIdx = 0;
      while (startIdx < targetLines.length && startIdx < replaceLines.length && targetLines[startIdx] === replaceLines[startIdx]) {
        startIdx++;
      }
      
      let targetEndIdx = targetLines.length - 1;
      let replaceEndIdx = replaceLines.length - 1;
      while (targetEndIdx >= startIdx && replaceEndIdx >= startIdx && targetLines[targetEndIdx] === replaceLines[replaceEndIdx]) {
        targetEndIdx--;
        replaceEndIdx--;
      }
      
      linesRemoved = targetEndIdx >= startIdx ? (targetEndIdx - startIdx + 1) : 0;
      linesAdded = replaceEndIdx >= startIdx ? (replaceEndIdx - startIdx + 1) : 0;
    }
  } else if (toolName === 'write_file' || toolName === 'create_file') {
    linesAdded = (toolArgs.content || '').split('\n').length;
  }

  // Auto-open diff once when the permission card is rendered for the first time
  useEffect(() => {
    if (isFileEdit && !isResolved) {
      vscode.postMessage({
        command: 'openDiff',
        toolName,
        toolArgs
      });
    }
  }, []);

  return (
    <div className="permission-card">
      <div className="permission-header">
        <span className="permission-title">
          {isFileEdit 
            ? (isResolved ? (isRejected ? `Rejected edit to ${filename}` : `Edited ${filename}`) : `Proposed edit to ${filename}`) 
            : (isResolved ? (isRejected ? `Tool execution rejected: ${toolName}` : `Tool executed: ${toolName}`) : `Tool execution requested: ${toolName}`)}
        </span>
        {isFileEdit && (
          <span className="permission-stats" style={{ marginLeft: '12px' }}>
            {linesAdded > 0 && <span className="stat-added">+{linesAdded}</span>}
            {linesRemoved > 0 && <span className="stat-removed">-{linesRemoved}</span>}
          </span>
        )}
      </div>
      
      {!isFileEdit && (
        <pre className="tool-args">{JSON.stringify(toolArgs, null, 2)}</pre>
      )}

      <div className="permission-actions">
        {!isResolved && (
          <>
            <button className="approve-btn" onClick={() => {
              onApprove();
              if (isFileEdit) {
                vscode.postMessage({
                  command: 'closeDiff',
                  filePath
                });
                setTimeout(() => {
                  vscode.postMessage({
                    command: 'openFile',
                    filePath
                  });
                }, 1500);
              }
            }}>Approve</button>
            <button className="reject-btn" onClick={() => {
              onReject();
              if (isFileEdit) {
                vscode.postMessage({
                  command: 'closeDiff',
                  filePath
                });
              }
            }}>Reject</button>
          </>
        )}
        {isFileEdit && !isResolved && (
          <button 
            className="secondary-btn"
            onClick={() => {
              vscode.postMessage({ command: 'openDiff', toolName, toolArgs });
            }}
          >
            👀 View Diff
          </button>
        )}
      </div>
    </div>
  );
};

const MessageItem = memo(({ msg, isLast, nextMsg, openActivityId, setOpenActivityId, sendMessage, openSourcesModal }: any) => {
  if (msg.isActivityGroup) {
    const acts = msg.activities;
    return (
      <div className="message agent status-card">
        <div className="activities-container">
          {acts.map((act: any) => (
            <div key={act.id} className="activity-item">
              <div 
                className="activity-header" 
                onClick={() => act.details && setOpenActivityId(openActivityId === act.id ? null : act.id)}
                style={{ cursor: act.details ? 'pointer' : 'default' }}
              >
                <span className="activity-icon">
                  {act.type === 'think' ? '🧠' : '🔧'}
                </span>
                <span className="activity-title">{act.title}</span>
                {act.status === 'running' && <div className="spinner-small" />}
                {act.details && <span className={`chevron ${openActivityId === act.id ? 'open' : ''}`}>›</span>}
              </div>
              {act.title.includes('generate_media') && act.status === 'running' && (
                <div className="media-skeleton-loader">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                  <p>Generating Media...</p>
                </div>
              )}
              {openActivityId === act.id && act.details && (
                <div className="activity-details">
                  <pre>{act.details}</pre>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (msg.isSummary) {
    return (
      <div className="message system status-card">
        <div className="activities-container">
          <div className="activity-item">
            <div 
              className="activity-header" 
              onClick={() => setOpenActivityId(openActivityId === msg.text ? null : msg.text)}
              style={{ cursor: 'pointer' }}
            >
              <span className="activity-icon">🗜️</span>
              <span className="activity-title">Summarized Context</span>
              <span className={`chevron ${openActivityId === msg.text ? 'open' : ''}`}>›</span>
            </div>
            {openActivityId === msg.text && (
              <div className="activity-details" style={{ whiteSpace: 'pre-wrap', color: 'var(--vscode-descriptionForeground)' }}>
                {msg.text.replace('**Summarized Context**\n\n', '')}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const isPermission = msg.role === 'agent' && msg.text.startsWith('PERMISSION_REQUIRED:');
  let toolName = '';
  let toolArgs: any = {};
  
  if (isPermission) {
    const match = msg.text.match(/Tool '([^']+)' wants to run with args ([\s\S]*)/);
    if (match) {
      toolName = match[1];
      try {
        toolArgs = JSON.parse(match[2]);
      } catch (e) { }
    }
  }
  const isError = msg.text.startsWith('Error');
  
  return (
    <div className={`message ${msg.role} ${isError ? 'error-message' : ''}`}>
      <div className="message-bubble">
        {isPermission ? (
          <PermissionCard 
            toolName={toolName} 
            toolArgs={toolArgs} 
            isResolved={!isLast}
            isRejected={!isLast && nextMsg?.text === 'Decline'}
            onApprove={() => sendMessage('Approve')}
            onReject={() => sendMessage('Decline')}
          />
        ) : msg.role === 'agent' ? (
          <ReactMarkdown 
            remarkPlugins={markdownRemarkPlugins} 
            rehypePlugins={markdownRehypePlugins}
            components={markdownComponents}
          >
            {msg.text}
          </ReactMarkdown>
        ) : (
          msg.text
        )}
        {msg.sources && msg.sources.length > 0 && (
          <div className="message-sources-pill" onClick={() => openSourcesModal(msg.sources)}>
            <div className="sources-icons">
              {msg.sources.slice(0, 3).map((s: any, idx: number) => (
                <div key={idx} className="source-icon">
                  <img src={`https://www.google.com/s2/favicons?domain=${s.domain}&sz=32`} alt={s.domain} />
                </div>
              ))}
            </div>
            <span>{msg.sources.length} sources</span>
          </div>
        )}
      </div>
    </div>
  );
});

function App() {
  const [input, setInput] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [showMentions, setShowMentions] = useState(false)
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [openActivityId, setOpenActivityId] = useState<string | null>(null)
  const [workspaceFiles, setWorkspaceFiles] = useState<string[]>([])
  const [openSourcesModal, setOpenSourcesModal] = useState<any[] | null>(null)
  const [showSkillLibrary, setShowSkillLibrary] = useState(false)
  
  const [isModelDropdownOpen, setModelDropdownOpen] = useState(false);
  const modelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // Auto-scroll refs and state
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatAreaRef = useRef<HTMLElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const { status, messages, streamingText, streamingSources, connect, sendMessage, sessions, availableModels, currentModel, setModel, activeSessionId, setActiveSessionId, createSession, updateSessionTitle, deleteSession } = useAgentStore()
  const isWorking = status !== 'Idle' && status !== 'Completed';

  useEffect(() => {
    if (!isWorking && inputRef.current) {
      inputRef.current.focus();
    }
  }, [status, isWorking]);

  const handleScroll = () => {
    if (!chatAreaRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatAreaRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setAutoScroll(isAtBottom);
  };

  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingText, autoScroll]);

  useEffect(() => {
    setAutoScroll(true);
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, [activeSessionId]);


  // Auto-open the latest running activity
  useEffect(() => {
    const allActivities = messages
      .filter(m => m.role === 'activity')
      .map(m => {
        try { return JSON.parse(m.text) } catch(e) { return null }
      })
      .filter(Boolean);
      
    const running = allActivities.find(a => a.status === 'running');
    if (running) {
      setOpenActivityId(running.id);
    }
  }, [messages]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modelRef.current && !modelRef.current.contains(event.target as Node)) {
        setModelDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [newApiKey, setNewApiKey] = useState('')
  const [localApiKey, setLocalApiKey] = useState((window as any).API_KEY || '');
  const maskedKey = localApiKey ? `${localApiKey.substring(0, 4)}...${localApiKey.substring(localApiKey.length - 4)}` : '';

  useEffect(() => {
    connect()

    // Listen for messages from VS Code
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.command === 'workspaceFiles') {
        setWorkspaceFiles(message.payload || []);
      } else if (message.command === 'apiKeyUpdated') {
        (window as any).API_KEY = message.payload;
        setLocalApiKey(message.payload);
        setIsSettingsOpen(false);
        if (!message.payload) {
          useAgentStore.getState().clearData();
        } else {
          // Force reconnect only if there is an API key
          useAgentStore.getState().connect();
        }
      }
    };
    window.addEventListener('message', handleMessage);

    // Request files on mount
    vscode.postMessage({ command: 'getWorkspaceFiles' });

    return () => window.removeEventListener('message', handleMessage);
  }, [connect])

  const handleSend = () => {
    if (!input.trim()) return
    sendMessage(input.trim())
    setInput('')
  }

  return (
    <div className="vedix-container">
      <header className="vedix-header">
        <div className="header-left">
          <strong>Vedix</strong>
          <span className="status-badge" title={status}>
            {status.startsWith('Error') ? 'Error' : status}
          </span>
        </div>
        <div className="header-right">
          <button 
            title="Skill Library" 
            className={`icon-button ${showSkillLibrary ? 'active' : ''}`} 
            onClick={() => { setShowSkillLibrary(!showSkillLibrary); setShowHistory(false); setIsSettingsOpen(false); }}
          >
            🧠
          </button>
          <button title="New Session" className="icon-button" onClick={() => createSession()}>➕</button>
          <button title="History" className={`icon-button ${showHistory ? 'active' : ''}`} onClick={() => { setShowHistory(!showHistory); setShowSkillLibrary(false); setIsSettingsOpen(false); }}>🕒</button>
          <button title="Settings" className="icon-button" onClick={() => { setIsSettingsOpen(!isSettingsOpen); setShowHistory(false); setShowSkillLibrary(false); }}>⚙️</button>
        </div>
      </header>

      {isSettingsOpen && (
        <div className="settings-overlay">
          <div className="settings-header">
            <h3>Settings</h3>
            <button className="icon-button" onClick={() => setIsSettingsOpen(false)}>❌</button>
          </div>
          <div className="settings-content">
            <div className="settings-section">
              <h4>API Key</h4>
              {localApiKey ? (
                <div className="api-key-display">
                  <span>{maskedKey}</span>
                  <button className="secondary-btn" onClick={() => vscode.postMessage({ command: 'logout' })}>Remove</button>
                </div>
              ) : (
                <div className="api-key-input-container">
                  <input 
                    type="password" 
                    placeholder="Enter your API Key..." 
                    value={newApiKey}
                    onChange={(e) => setNewApiKey(e.target.value)}
                    className="api-key-input"
                  />
                  <button 
                    className="primary-btn" 
                    onClick={() => vscode.postMessage({ command: 'saveApiKey', text: newApiKey })}
                    disabled={!newApiKey}
                  >
                    Save Key
                  </button>
                </div>
              )}
            </div>
            {localApiKey && (
              <div className="settings-section" style={{marginTop: '20px'}}>
                <button className="danger-btn" style={{width: '100%', padding: '10px'}} onClick={() => vscode.postMessage({ command: 'logout' })}>
                  Logout (Clear API Key)
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showSkillLibrary && (
        <div className="history-drawer">
          <SkillLibrary />
        </div>
      )}

      {showHistory && (
        <div className="history-drawer">
          <h3>Past Sessions</h3>
          {sessions.map(s => (
            <div 
              key={s.id} 
              className={`history-item ${activeSessionId === s.id ? 'active' : ''}`}
            >
              {editingSessionId === s.id ? (
                <div className="session-edit-mode">
                  <input 
                    type="text" 
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        updateSessionTitle(s.id, editTitle);
                        setEditingSessionId(null);
                      } else if (e.key === 'Escape') {
                        setEditingSessionId(null);
                      }
                    }}
                  />
                  <button onClick={() => {
                    updateSessionTitle(s.id, editTitle);
                    setEditingSessionId(null);
                  }}>💾</button>
                  <button onClick={() => setEditingSessionId(null)}>❌</button>
                </div>
              ) : (
                <div className="session-view-mode">
                  <span className="session-title" onClick={() => {
                    setActiveSessionId(s.id);
                    setShowHistory(false);
                  }}>
                    {s.title}
                  </span>
                  <div className="session-actions">
                    <button onClick={(e) => {
                      e.stopPropagation();
                      setEditingSessionId(s.id);
                      setEditTitle(s.title);
                    }}>✏️</button>
                    <button onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(s.id);
                    }}>🗑️</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <main className="vedix-chat-area" ref={chatAreaRef} onScroll={handleScroll}>
        {status.startsWith('Error') && (
          <div className="error-banner">
            <span className="error-icon">⚠️</span>
            <p>{status.replace('Error: ', '')}</p>
            {!localApiKey && (
              <button className="primary-btn" style={{marginTop: '10px'}} onClick={() => setIsSettingsOpen(true)}>Configure API Key</button>
            )}
          </div>
        )}
        
        {messages.length === 0 ? (
          <div className="empty-state">
            <p>How can I help you code today?</p>
          </div>
        ) : (
          (() => {
            const groupedMessages: any[] = [];
            let currentGroup: any[] = [];
            
            for (let i = 0; i < messages.length; i++) {
              const msg = messages[i];
              if (msg.role === 'activity') {
                try {
                  const act = JSON.parse(msg.text);
                  const existingIndex = currentGroup.findIndex(a => a.id === act.id);
                  if (existingIndex >= 0) {
                    currentGroup[existingIndex] = { ...currentGroup[existingIndex], ...act };
                  } else {
                    currentGroup.push(act);
                  }
                } catch(e) {}
              } else {
                if (currentGroup.length > 0) {
                  groupedMessages.push({ isActivityGroup: true, activities: currentGroup });
                  currentGroup = [];
                }
                groupedMessages.push(msg);
              }
            }
            if (currentGroup.length > 0) {
              groupedMessages.push({ isActivityGroup: true, activities: currentGroup });
            }

            return groupedMessages.map((msg: any, i) => (
              <MessageItem 
                key={msg.isActivityGroup ? `group-${i}` : i}
                msg={msg}
                isLast={i === groupedMessages.length - 1}
                nextMsg={groupedMessages[i + 1]}
                openActivityId={openActivityId}
                setOpenActivityId={setOpenActivityId}
                sendMessage={sendMessage}
                openSourcesModal={setOpenSourcesModal}
              />
            ));
          })()
        )}

        {/* Fallback Planning status while agent is thinking */}
        {(status === 'Planning' || status === 'Working') && !streamingText && (
          <div className="message agent status-card">
            <div className="activities-container">
              <div className="activity-item">
                <div className="activity-header">
                  <span className="activity-icon">🧠</span>
                  <span className="activity-title">Thinking...</span>
                  <div className="spinner-small" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Streaming Text */}
        {streamingText && (
          <div className="message agent">
            <div className="message-bubble">
              <ReactMarkdown 
                remarkPlugins={markdownRemarkPlugins} 
                rehypePlugins={markdownRehypePlugins}
                components={markdownComponents}
              >
                {streamingText}
              </ReactMarkdown>
              
              {streamingSources && streamingSources.length > 0 && (
                <div className="message-sources-pill" onClick={() => setOpenSourcesModal(streamingSources)}>
                  <div className="sources-icons">
                    {streamingSources.slice(0, 3).map((s: any, idx: number) => (
                      <div key={idx} className="source-icon">
                        <img src={`https://www.google.com/s2/favicons?domain=${s.domain}&sz=32`} alt={s.domain} />
                      </div>
                    ))}
                  </div>
                  <span>{streamingSources.length} sources</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      <footer className="vedix-input-area">
        <div className="input-box">
          <textarea 
            ref={inputRef}
            value={input}
            disabled={isWorking}
            onChange={(e) => {
              setInput(e.target.value)
              if (e.target.value.endsWith('@') || e.target.value.endsWith('/')) {
                setShowMentions(true)
              } else {
                setShowMentions(false)
              }
            }}
            placeholder="Ask Vedix..."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
          />
          {showMentions && (
            <div className="mentions-popover">
              {input.endsWith('/') && (
                <>
                  <div className="mention-item" onClick={() => { setInput(input.slice(0, -1) + '/goal '); setShowMentions(false); }}>/goal - Start a persistent goal</div>
                  <div className="mention-item" onClick={() => { setInput(input.slice(0, -1) + '/grill-me '); setShowMentions(false); }}>/grill-me - Alignment interview</div>
                </>
              )}
              {input.endsWith('@') && workspaceFiles.slice(0, 10).map((file, i) => (
                <div 
                  key={i} 
                  className="mention-item"
                  onClick={() => {
                    setInput(input.slice(0, -1) + `@${file} `);
                    setShowMentions(false);
                  }}
                >
                  📄 {file}
                </div>
              ))}
              {input.endsWith('@') && workspaceFiles.length === 0 && (
                <div className="mention-item">Loading files...</div>
              )}
            </div>
          )}
          <div className="input-controls">
            <div className="controls-left">
              <button title="Attach" className="attach-button" disabled={isWorking}>+</button>
            </div>
            <div className="controls-right">
              <div className="custom-model-dropdown" ref={modelRef}>
                <div 
                  className="dropdown-trigger" 
                  onClick={() => setModelDropdownOpen(!isModelDropdownOpen)}
                >
                  <ProviderIcon model={currentModel} />
                  <span className="model-name-text">{currentModel.split(':').slice(1).join(':')}</span>
                  <span className="chevron-down">▼</span>
                </div>
                {isModelDropdownOpen && (
                  <div className="dropdown-menu antigravity-menu">
                    {Object.entries(
                      availableModels.reduce((acc, m) => {
                        const provider = m.split(':')[0];
                        if (!acc[provider]) acc[provider] = [];
                        acc[provider].push(m);
                        return acc;
                      }, {} as Record<string, string[]>)
                    ).map(([provider, models]) => (
                      <div key={provider} className="provider-group">
                        <div className="provider-header">{provider.toUpperCase()}</div>
                        {models.map(m => {
                          const modelName = m.split(':').slice(1).join(':');
                          let badge = '';
                          if (modelName.toLowerCase().match(/(fast|flash|haiku|mini|small|8b|7b)/)) badge = 'Fast';
                          else if (modelName.toLowerCase().match(/(pro|opus|large|max|70b|405b)/)) badge = 'High';
                          else badge = 'Medium';
                          
                          return (
                            <div 
                              key={m} 
                              className={`dropdown-item ${currentModel === m ? 'active' : ''}`}
                              onClick={() => {
                                setModel(m);
                                setModelDropdownOpen(false);
                              }}
                            >
                              <span className="model-name-text">{modelName}</span>
                              {badge && <span className={`model-badge badge-${badge.toLowerCase()}`}>{badge}</span>}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button 
                className={`send-icon-button ${input.trim() && !isWorking ? 'active' : ''}`} 
                onClick={handleSend}
                disabled={isWorking || !input.trim()}
                title="Send Message"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </footer>
      
      {openSourcesModal && (
        <div className="sources-modal-overlay" onClick={() => setOpenSourcesModal(null)}>
          <div className="sources-modal" onClick={e => e.stopPropagation()}>
            <div className="sources-modal-header">
              <h3>{openSourcesModal.length} sources</h3>
              <button className="close-btn" onClick={() => setOpenSourcesModal(null)}>✕</button>
            </div>
            <div className="sources-modal-content">
              <p className="sources-modal-subtitle">Sources for your search</p>
              <div className="sources-list">
                {openSourcesModal.map((s: any, idx: number) => (
                  <a key={idx} href={s.url} target="_blank" rel="noopener noreferrer" className="source-item">
                    <div className="source-item-header">
                      <img src={`https://www.google.com/s2/favicons?domain=${s.domain}&sz=32`} alt={s.domain} className="source-item-icon" />
                      <span className="source-item-domain">{s.domain}</span>
                    </div>
                    <div className="source-item-title">{s.title}</div>
                    <div className="source-item-snippet">{s.content || s.snippet}</div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
