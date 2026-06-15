import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../api';
import { useAuth } from '../context/AuthContext';

export default function UsersPage() {
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm]   = useState(false);
  const [editUser, setEditUser]   = useState(null);
  const [pwdUserId, setPwdUserId] = useState(null);
  const [newPwd, setNewPwd]       = useState('');
  const [pwdError, setPwdError]   = useState('');
  const [msg, setMsg]             = useState('');

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll().then(r => r.data)
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }) => usersApi.changeStatus(id, isActive),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] })
  });

  const changePwd = useMutation({
    mutationFn: ({ id, newPassword }) => usersApi.changePassword(id, newPassword),
    onSuccess: () => { setPwdUserId(null); setNewPwd(''); setMsg('Пароль змінено!'); setTimeout(() => setMsg(''), 3000); },
    onError: err => setPwdError(err.response?.data?.error || 'Помилка')
  });

  const roleBadge = role => {
    const map = { Admin:'badge-admin', Doctor:'badge-doctor', Patient:'badge-patient' };
    const labels = { Admin:'Адмін', Doctor:'Лікар', Patient:'Пацієнт' };
    return <span className={`badge ${map[role]}`}>{labels[role]}</span>;
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">👤 Користувачі</h1>
          <p className="page-subtitle">Управління обліковими записами</p>
        </div>
        <button className="btn btn-success" onClick={() => { setEditUser(null); setShowForm(true); }}>
          ➕ Новий користувач
        </button>
      </div>

      {msg && <div className="alert alert-success">✅ {msg}</div>}

      <div className="card" style={{padding:0}}>
        {isLoading ? (
          <p style={{textAlign:'center',padding:'40px',color:'#888'}}>⏳ Завантаження...</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th><th>Логін</th><th>ПІБ</th><th>Роль</th>
                  <th>Email</th><th>Статус</th><th>Останній вхід</th><th>Дії</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{opacity: u.isActive ? 1 : 0.5}}>
                    <td style={{color:'#888'}}>{u.id}</td>
                    <td><code>{u.username}</code></td>
                    <td><strong>{u.fullName}</strong></td>
                    <td>{roleBadge(u.role)}</td>
                    <td>{u.email || '—'}</td>
                    <td>
                      <span className={`badge ${u.isActive ? 'badge-ok' : 'badge-violated'}`}>
                        {u.isActive ? '✓ Активний' : '✗ Заблокований'}
                      </span>
                    </td>
                    <td style={{fontSize:'13px',color:'#888'}}>
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('uk-UA') : '—'}
                    </td>
                    <td>
                      <div style={{display:'flex',gap:'4px'}}>
                        <button className="btn btn-secondary btn-sm"
                          onClick={() => { setEditUser(u); setShowForm(true); }}>
                          ✏️
                        </button>
                        <button className="btn btn-warning btn-sm"
                          onClick={() => { setPwdUserId(u.id); setNewPwd(''); setPwdError(''); }}>
                          🔑
                        </button>
                        {u.id !== me?.id && (
                          <button
                            className={`btn btn-sm ${u.isActive ? 'btn-danger' : 'btn-success'}`}
                            onClick={() => toggleActive.mutate({ id: u.id, isActive: !u.isActive })}
                          >
                            {u.isActive ? '🚫' : '✓'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Password modal */}
      {pwdUserId && (
        <Modal title="🔑 Зміна пароля" onClose={() => setPwdUserId(null)}>
          {pwdError && <div className="alert alert-error">{pwdError}</div>}
          <div className="form-group">
            <label className="form-label">Новий пароль (мін. 8 символів)</label>
            <input
              type="password"
              className="form-control"
              value={newPwd}
              onChange={e => setNewPwd(e.target.value)}
              autoFocus
            />
          </div>
          <div style={{display:'flex',gap:'8px'}}>
            <button
              className="btn btn-success"
              onClick={() => changePwd.mutate({ id: pwdUserId, newPassword: newPwd })}
              disabled={newPwd.length < 8 || changePwd.isPending}
            >
              {changePwd.isPending ? '⏳' : '💾'} Зберегти
            </button>
            <button className="btn btn-secondary" onClick={() => setPwdUserId(null)}>Скасувати</button>
          </div>
        </Modal>
      )}

      {/* Create/Edit modal */}
      {showForm && (
        <UserFormModal
          user={editUser}
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false);
            qc.invalidateQueries({ queryKey: ['users'] });
            setMsg(editUser ? 'Дані оновлено!' : 'Користувача створено!');
            setTimeout(() => setMsg(''), 3000);
          }}
        />
      )}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
      <div className="card" style={{width:'100%',maxWidth:'460px',margin:'16px',maxHeight:'90vh',overflow:'auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
          <h2 style={{fontSize:'18px',fontWeight:700,color:'#1e3a6e'}}>{title}</h2>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:'22px',cursor:'pointer',color:'#888'}}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function UserFormModal({ user, onClose, onSuccess }) {
  const isEdit = !!user;
  const [form, setForm] = useState({
    username: user?.username || '',
    password: '',
    fullName: user?.fullName || '',
    email:    user?.email    || '',
    role:     user?.role     || 'Patient'
  });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');

  const mutation = useMutation({
    mutationFn: data => isEdit
      ? usersApi.update(user.id, { fullName: data.fullName, email: data.email })
      : usersApi.create(data),
    onSuccess,
    onError: err => setApiError(err.response?.data?.error || 'Помилка')
  });

  const validate = () => {
    const e = {};
    if (!form.fullName.trim()) e.fullName = 'ПІБ обов\'язковий';
    if (!isEdit) {
      if (!form.username.trim()) e.username = 'Логін обов\'язковий';
      if (form.password.length < 8) e.password = 'Мінімум 8 символів';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = e => {
    e.preventDefault();
    if (!validate()) return;
    mutation.mutate(form);
  };

  return (
    <Modal title={isEdit ? '✏️ Редагування користувача' : '➕ Новий користувач'} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        {apiError && <div className="alert alert-error">{apiError}</div>}

        {!isEdit && (
          <>
            <div className="form-group">
              <label className="form-label">Логін *</label>
              <input className={`form-control${errors.username?' error':''}`}
                value={form.username} onChange={e => setForm(f=>({...f,username:e.target.value}))} />
              {errors.username && <div className="form-error">{errors.username}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Пароль * (мін. 8 символів)</label>
              <input type="password" className={`form-control${errors.password?' error':''}`}
                value={form.password} onChange={e => setForm(f=>({...f,password:e.target.value}))} />
              {errors.password && <div className="form-error">{errors.password}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Роль</label>
              <select className="form-control" value={form.role}
                onChange={e => setForm(f=>({...f,role:e.target.value}))}>
                <option value="Doctor">Лікар</option>
                <option value="Patient">Пацієнт</option>
                <option value="Admin">Адміністратор</option>
              </select>
            </div>
          </>
        )}

        <div className="form-group">
          <label className="form-label">ПІБ *</label>
          <input className={`form-control${errors.fullName?' error':''}`}
            value={form.fullName} onChange={e => setForm(f=>({...f,fullName:e.target.value}))} />
          {errors.fullName && <div className="form-error">{errors.fullName}</div>}
        </div>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input type="email" className="form-control"
            value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} />
        </div>

        <div style={{display:'flex',gap:'8px',marginTop:'8px'}}>
          <button type="submit" className="btn btn-success" disabled={mutation.isPending}>
            {mutation.isPending ? '⏳' : '💾'} {isEdit ? 'Зберегти' : 'Створити'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Скасувати</button>
        </div>
      </form>
    </Modal>
  );
}
