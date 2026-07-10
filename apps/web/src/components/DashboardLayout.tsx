import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import axios from 'axios';

interface DashboardLayoutProps {
  title?: string;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ title = 'Vedix User Portal' }) => {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string>('U');
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (token) {
      axios.get('http://localhost:3001/api/user/profile', {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => {
        if (res.data.user && res.data.user.email) {
          setUserEmail(res.data.user.email);
        }
      }).catch(err => console.error(err));
    }
  }, [token]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <span style={{ color: 'var(--accent-color)', fontSize: '24px' }}>⚡</span>
          Vedix Portal
        </div>
        
        <nav className="sidebar-nav">
          <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Overview
          </NavLink>
          <NavLink to="/agent-monitor" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            AI Agent Monitor
          </NavLink>
          <NavLink to="/chats" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Chat History
          </NavLink>
          <NavLink to="/memories" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            My Agent's Brain
          </NavLink>
          <NavLink to="/profile" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            My Profile
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            API Keys
          </NavLink>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="dashboard-main">
        {/* Top Navbar */}
        <header className="dashboard-navbar">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{title}</h2>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{userEmail}</span>
              <div style={{ 
                width: '40px', height: '40px', borderRadius: '50%', 
                backgroundColor: 'var(--accent-color)', display: 'flex', 
                alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' 
              }}>
                {userEmail.charAt(0).toUpperCase()}
              </div>
            </div>
            <button 
              onClick={handleLogout}
              style={{
                background: 'transparent', border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)', padding: '8px 16px', borderRadius: '8px',
                cursor: 'pointer', transition: 'all 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
            >
              Logout
            </button>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <div className="dashboard-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
