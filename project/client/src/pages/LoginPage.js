import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ username: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    if (!form.username || !form.password) {
      setError('Введіть логін та пароль');
      return;
    }
    setLoading(true);
    try {
      await login(form.username, form.password);
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.error || 'Помилка входу';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-header">
          <span className="login-logo">🏥</span>
          <h1 className="login-title">Медичний реєстр</h1>
          <p className="login-subtitle">Система захисту медичних даних</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form" noValidate>
          {error && (
            <div className="alert alert-error">
              <span>⚠️</span> {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Логін</label>
            <input
              name="username"
              className="form-control"
              placeholder="Введіть логін"
              value={form.username}
              onChange={handleChange}
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Пароль</label>
            <div className="pwd-wrapper">
              <input
                name="password"
                type={showPwd ? 'text' : 'password'}
                className="form-control"
                placeholder="Введіть пароль"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="pwd-toggle"
                onClick={() => setShowPwd(s => !s)}
                tabIndex={-1}
              >
                {showPwd ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary login-btn"
            disabled={loading}
          >
            {loading ? '⏳ Перевірка...' : '🔐 Увійти'}
          </button>
        </form>

        <div className="login-hints">
          <p>Тестові облікові записи:</p>
          <div className="hint-grid">
            {[
              { login: 'admin',   pwd: 'Admin@123',   role: 'Адмін'  },
              { login: 'doctor1', pwd: 'Doctor@123',  role: 'Лікар'  },
              { login: 'patient1',pwd: 'Patient@123', role: 'Пацієнт'},
            ].map(h => (
              <button
                key={h.login}
                className="hint-btn"
                onClick={() => setForm({ username: h.login, password: h.pwd })}
                type="button"
              >
                <span>{h.role}</span>
                <code>{h.login}</code>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
