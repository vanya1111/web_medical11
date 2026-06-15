import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { usersApi } from '../api';

export default function ProfilePage() {
  const { user } = useAuth();
  const [pwdForm, setPwdForm] = useState({ current: '', new: '', confirm: '' });
  const [pwdErrors, setPwdErrors] = useState({});
  const [msg, setMsg] = useState('');
  const [apiError, setApiError] = useState('');

  const changePwd = useMutation({
    mutationFn: () => usersApi.changePassword(user.id, pwdForm.new),
    onSuccess: () => {
      setPwdForm({ current: '', new: '', confirm: '' });
      setMsg('Пароль успішно змінено!');
      setTimeout(() => setMsg(''), 4000);
      setApiError('');
    },
    onError: err => setApiError(err.response?.data?.error || 'Помилка зміни пароля')
  });

  const validatePwd = () => {
    const e = {};
    if (!pwdForm.current) e.current = 'Введіть поточний пароль';
    if (pwdForm.new.length < 8) e.new = 'Мінімум 8 символів';
    if (pwdForm.new !== pwdForm.confirm) e.confirm = 'Паролі не збігаються';
    setPwdErrors(e);
    return Object.keys(e).length === 0;
  };

  const handlePwdSubmit = e => {
    e.preventDefault();
    setApiError('');
    if (!validatePwd()) return;
    changePwd.mutate();
  };

  const roleLabel = { Admin: '👑 Адміністратор', Doctor: '🩺 Лікар', Patient: '👤 Пацієнт' };

  return (
    <div style={{ maxWidth: '600px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">⚙️ Профіль</h1>
          <p className="page-subtitle">Особисті дані та налаштування</p>
        </div>
      </div>

      {/* User info */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #1e3a6e, #2d5a9e)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '28px', color: 'white', fontWeight: '700', flexShrink: 0
          }}>
            {user?.fullName?.[0] || '?'}
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#1e3a6e' }}>{user?.fullName}</div>
            <div style={{ fontSize: '14px', color: '#888', marginTop: '2px' }}>@{user?.username}</div>
            <div style={{ marginTop: '6px' }}>
              <span className={`badge ${
                user?.role === 'Admin' ? 'badge-admin' :
                user?.role === 'Doctor' ? 'badge-doctor' : 'badge-patient'
              }`}>
                {roleLabel[user?.role]}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {[
            ['Логін', user?.username],
            ['Email', user?.email || '—'],
            ['Роль', roleLabel[user?.role]],
            ['ID', `#${user?.id}`],
          ].map(([label, val]) => (
            <div key={label}>
              <div className="form-label">{label}</div>
              <div style={{ fontSize: '14px', padding: '8px 12px', background: '#f8faff', borderRadius: '8px', border: '1.5px solid #e0e8f0' }}>
                {val}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Change password */}
      <div className="card">
        <h2 className="card-title">🔑 Зміна пароля</h2>

        {msg && <div className="alert alert-success">✅ {msg}</div>}
        {apiError && <div className="alert alert-error">⚠️ {apiError}</div>}

        <form onSubmit={handlePwdSubmit} noValidate>
          {[
            { key: 'current', label: 'Поточний пароль' },
            { key: 'new',     label: 'Новий пароль (мін. 8 символів)' },
            { key: 'confirm', label: 'Підтвердження нового пароля' },
          ].map(({ key, label }) => (
            <div className="form-group" key={key}>
              <label className="form-label">{label}</label>
              <input
                type="password"
                className={`form-control${pwdErrors[key] ? ' error' : ''}`}
                value={pwdForm[key]}
                onChange={e => {
                  setPwdForm(f => ({ ...f, [key]: e.target.value }));
                  setPwdErrors(er => ({ ...er, [key]: '' }));
                }}
              />
              {pwdErrors[key] && <div className="form-error">{pwdErrors[key]}</div>}
            </div>
          ))}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={changePwd.isPending}
          >
            {changePwd.isPending ? '⏳ Збереження...' : '💾 Змінити пароль'}
          </button>
        </form>
      </div>

      {/* Security info */}
      <div className="card">
        <h2 className="card-title">🛡️ Безпека</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            ['Хешування паролів', 'bcrypt (cost=12)', 'badge-ok'],
            ['Шифрування даних',  'AES-256-CBC',      'badge-ok'],
            ['Цілісність записів','HMAC-SHA256',       'badge-ok'],
            ['Автентифікація',    'JWT (HS256)',        'badge-ok'],
            ['Захист від брутфорсу', 'Блокування після 5 спроб', 'badge-ok'],
          ].map(([label, val, cls]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
              <span style={{ fontSize: '14px', color: '#444' }}>{label}</span>
              <span className={`badge ${cls}`}>{val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
