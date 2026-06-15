import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '../api';

export default function PatientsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: () => usersApi.getPatients().then(r => r.data)
  });

  const filtered = patients.filter(p =>
    p.fullName.toLowerCase().includes(search.toLowerCase()) ||
    p.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">👥 Пацієнти</h1>
          <p className="page-subtitle">Список зареєстрованих пацієнтів</p>
        </div>
      </div>

      <div className="search-bar">
        <input
          className="form-control"
          placeholder="🔍 Пошук за ПІБ або логіном..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <span style={{color:'#888', fontSize:'14px', alignSelf:'center'}}>
          Знайдено: {filtered.length}
        </span>
      </div>

      <div className="card">
        {isLoading ? (
          <p style={{textAlign:'center', padding:'30px', color:'#888'}}>⏳ Завантаження...</p>
        ) : filtered.length === 0 ? (
          <p style={{textAlign:'center', padding:'30px', color:'#888'}}>Пацієнтів не знайдено</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>ПІБ пацієнта</th>
                  <th>Логін</th>
                  <th>Email</th>
                  <th>Останній вхід</th>
                  <th>Дії</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id}>
                    <td style={{color:'#888'}}>{p.id}</td>
                    <td><strong>{p.fullName}</strong></td>
                    <td><code>{p.username}</code></td>
                    <td>{p.email || '—'}</td>
                    <td>
                      {p.lastLoginAt
                        ? new Date(p.lastLoginAt).toLocaleString('uk-UA')
                        : '—'}
                    </td>
                    <td>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => navigate(`/patients/${p.id}/records`)}
                      >
                        📋 Записи
                      </button>
                      {' '}
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => navigate(`/records/new?patientId=${p.id}`)}
                      >
                        ➕ Додати
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
