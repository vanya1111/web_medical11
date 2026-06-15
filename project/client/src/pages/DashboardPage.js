import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { recordsApi, auditApi } from '../api';

export default function DashboardPage() {
  const { user, isAdmin, isDoctor, isPatient } = useAuth();
  const navigate = useNavigate();

  const { data: recordsData } = useQuery({
    queryKey: ['records-dashboard'],
    queryFn: () => recordsApi.getAll({ limit: 5 }).then(r => r.data)
  });

  const { data: auditStats } = useQuery({
    queryKey: ['audit-stats'],
    queryFn: () => auditApi.getStats().then(r => r.data),
    enabled: isAdmin
  });

  const roleGreeting = {
    Admin: '👑 Панель адміністратора',
    Doctor: '🩺 Панель лікаря',
    Patient: '👤 Особистий кабінет'
  };

  const recentRecords = recordsData?.records || [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{roleGreeting[user?.role]}</h1>
          <p className="page-subtitle">Вітаємо, {user?.fullName}!</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-icon">📋</span>
          <div>
            <div className="stat-value">{recordsData?.total ?? '—'}</div>
            <div className="stat-label">Медичних записів</div>
          </div>
        </div>

        {(isAdmin || isDoctor) && (
          <div className="stat-card" style={{cursor:'pointer'}} onClick={() => navigate('/patients')}>
            <span className="stat-icon">👥</span>
            <div>
              <div className="stat-value">→</div>
              <div className="stat-label">Список пацієнтів</div>
            </div>
          </div>
        )}

        {isAdmin && auditStats && (
          <>
            <div className="stat-card">
              <span className="stat-icon">📜</span>
              <div>
                <div className="stat-value">{auditStats.today}</div>
                <div className="stat-label">Подій сьогодні</div>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">🛡️</span>
              <div>
                <div className="stat-value">{auditStats.successRate}%</div>
                <div className="stat-label">Успішних операцій</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Recent records */}
      <div className="card">
        <div className="card-title">
          📋 {isPatient ? 'Мої останні записи' : 'Останні медичні записи'}
        </div>

        {recentRecords.length === 0 ? (
          <p style={{color:'#888', textAlign:'center', padding:'20px'}}>Записів поки немає</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Тип</th>
                  {!isPatient && <th>Пацієнт</th>}
                  <th>Лікар</th>
                  <th>Статус</th>
                  <th>Цілісність</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recentRecords.map(r => (
                  <tr
                    key={r.id}
                    className={
                      !r.integrityValid ? 'tr-integrity-bad' :
                      r.status === 'Completed' ? 'tr-completed' :
                      r.status === 'Archived'  ? 'tr-archived'  : ''
                    }
                  >
                    <td>{new Date(r.recordDate).toLocaleDateString('uk-UA')}</td>
                    <td>{r.recordType}</td>
                    {!isPatient && <td>{r.patientName}</td>}
                    <td>{r.doctorName}</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td><IntegrityBadge valid={r.integrityValid} /></td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => navigate(`/records/${r.id}`)}
                      >
                        Деталі
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{marginTop:'16px', display:'flex', gap:'10px'}}>
          {isPatient && (
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/my-records')}>
              Всі мої записи →
            </button>
          )}
          {(isAdmin || isDoctor) && (
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/patients')}>
              Всі пацієнти →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function StatusBadge({ status }) {
  const map = {
    Active:    ['badge-active',    '🟢 Активний'],
    Completed: ['badge-completed', '✅ Завершений'],
    Archived:  ['badge-archived',  '📦 Архівний']
  };
  const [cls, label] = map[status] || ['', status];
  return <span className={`badge ${cls}`}>{label}</span>;
}

export function IntegrityBadge({ valid }) {
  return valid
    ? <span className="badge badge-ok">✓ OK</span>
    : <span className="badge badge-violated">⚠ ПОРУШЕНО</span>;
}
