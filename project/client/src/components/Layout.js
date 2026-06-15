import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

export default function Layout() {
  const { user, logout, isAdmin, isDoctor, isPatient } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItem = (to, icon, label, roles) => {
    if (roles && !roles.includes(user?.role)) return null;
    return (
      <NavLink
        to={to}
        className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        title={collapsed ? label : ''}
      >
        <span className="nav-icon">{icon}</span>
        {!collapsed && <span className="nav-label">{label}</span>}
      </NavLink>
    );
  };

  const roleLabel = { Admin: 'Адміністратор', Doctor: 'Лікар', Patient: 'Пацієнт' };

  return (
    <div className={`app-layout${collapsed ? ' sidebar-collapsed' : ''}`}>
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="sidebar-logo">🏥</span>
          {!collapsed && <span className="sidebar-title">Медичний реєстр</span>}
          <button className="collapse-btn" onClick={() => setCollapsed(c => !c)}>
            {collapsed ? '›' : '‹'}
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItem('/dashboard', '📊', 'Дашборд')}
          {navItem('/patients', '👥', 'Пацієнти', ['Admin','Doctor'])}
          {navItem('/my-records', '📋', 'Мої записи', ['Patient'])}
          {navItem('/users', '👤', 'Користувачі', ['Admin'])}
          {navItem('/audit', '📜', 'Журнал аудиту', ['Admin'])}
          {navItem('/profile', '⚙️', 'Профіль')}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{user?.fullName?.[0] || '?'}</div>
            {!collapsed && (
              <div className="user-details">
                <div className="user-name">{user?.fullName}</div>
                <div className="user-role">{roleLabel[user?.role]}</div>
              </div>
            )}
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Вийти">
            🚪{!collapsed && ' Вийти'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
