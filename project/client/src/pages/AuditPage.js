import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditApi } from '../api';

const ACTIONS = [
  'LOGIN','LOGOUT','LOGIN_FAILED','TOKEN_REFRESH',
  'VIEW_RECORD','VIEW_RECORDS_LIST','CREATE_RECORD','UPDATE_RECORD',
  'CHANGE_STATUS','DELETE_RECORD','CREATE_USER','UPDATE_USER',
  'CHANGE_PASSWORD','VIEW_AUDIT_LOG','INTEGRITY_VIOLATION','ACCESS_DENIED'
];

export default function AuditPage() {
  const [filters, setFilters] = useState({ username:'', action:'', success:'', from:'', to:'' });
  const [page, setPage] = useState(1);
  const LIMIT = 50;

  const { data, isLoading } = useQuery({
    queryKey: ['audit', filters, page],
    queryFn: () => auditApi.getAll({
      ...filters,
      success: filters.success === '' ? undefined : filters.success,
      page,
      limit: LIMIT
    }).then(r => r.data)
  });

  const { data: stats } = useQuery({
    queryKey: ['audit-stats'],
    queryFn: () => auditApi.getStats().then(r => r.data)
  });

  const setF = (k, v) => { setFilters(f => ({ ...f, [k]: v })); setPage(1); };

  const logs = data?.logs || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / LIMIT);

  const rowClass = log => {
    if (!log.success) return 'tr-integrity-bad';
    if (log.action === 'LOGIN_FAILED' || log.action === 'ACCESS_DENIED') return 'tr-archived';
    return '';
  };

  const actionLabel = a => ({
    LOGIN:'Вхід', LOGOUT:'Вихід', LOGIN_FAILED:'Помилка входу',
    TOKEN_REFRESH:'Оновлення токена', VIEW_RECORD:'Перегляд запису',
    VIEW_RECORDS_LIST:'Список записів', CREATE_RECORD:'Створення запису',
    UPDATE_RECORD:'Оновлення запису', CHANGE_STATUS:'Зміна статусу',
    DELETE_RECORD:'Видалення запису', CREATE_USER:'Новий користувач',
    UPDATE_USER:'Ред. користувача', CHANGE_PASSWORD:'Зміна пароля',
    VIEW_AUDIT_LOG:'Перегляд логів', INTEGRITY_VIOLATION:'⚠ Порушення цілісності',
    ACCESS_DENIED:'🚫 Відмова доступу'
  }[a] || a);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">📜 Журнал аудиту</h1>
          <p className="page-subtitle">Всього подій: {total}</p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="stats-grid" style={{marginBottom:'20px'}}>
          <div className="stat-card">
            <span className="stat-icon">📊</span>
            <div><div className="stat-value">{stats.total}</div><div className="stat-label">Всього подій</div></div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">🔴</span>
            <div><div className="stat-value" style={{color:'#d73a49'}}>{stats.failed}</div><div className="stat-label">Невдалих</div></div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">📅</span>
            <div><div className="stat-value">{stats.today}</div><div className="stat-label">Сьогодні</div></div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">✅</span>
            <div><div className="stat-value" style={{color:'#22863a'}}>{stats.successRate}%</div><div className="stat-label">Успішних</div></div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card" style={{padding:'16px',marginBottom:'16px'}}>
        <div style={{display:'flex',gap:'12px',flexWrap:'wrap',alignItems:'flex-end'}}>
          <div>
            <label className="form-label">Користувач</label>
            <input className="form-control" style={{width:'180px'}}
              placeholder="Пошук за логіном..."
              value={filters.username}
              onChange={e => setF('username', e.target.value)} />
          </div>
          <div>
            <label className="form-label">Тип дії</label>
            <select className="form-control" style={{width:'200px'}}
              value={filters.action} onChange={e => setF('action', e.target.value)}>
              <option value="">Всі дії</option>
              {ACTIONS.map(a => <option key={a} value={a}>{actionLabel(a)}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Результат</label>
            <select className="form-control" style={{width:'140px'}}
              value={filters.success} onChange={e => setF('success', e.target.value)}>
              <option value="">Всі</option>
              <option value="true">✓ Успішно</option>
              <option value="false">✗ Невдало</option>
            </select>
          </div>
          <div>
            <label className="form-label">З дати</label>
            <input type="date" className="form-control" style={{width:'150px'}}
              value={filters.from} onChange={e => setF('from', e.target.value)} />
          </div>
          <div>
            <label className="form-label">До дати</label>
            <input type="date" className="form-control" style={{width:'150px'}}
              value={filters.to} onChange={e => setF('to', e.target.value)} />
          </div>
          <button className="btn btn-secondary btn-sm"
            onClick={() => { setFilters({username:'',action:'',success:'',from:'',to:''}); setPage(1); }}>
            ✕ Скинути
          </button>
        </div>
      </div>

      <div className="card" style={{padding:0}}>
        {isLoading ? (
          <p style={{textAlign:'center',padding:'40px',color:'#888'}}>⏳ Завантаження...</p>
        ) : logs.length === 0 ? (
          <p style={{textAlign:'center',padding:'40px',color:'#888'}}>Подій не знайдено</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Час</th>
                  <th>Користувач</th>
                  <th>Роль</th>
                  <th>Дія</th>
                  <th>Об'єкт</th>
                  <th>Результат</th>
                  <th>IP</th>
                  <th>Деталі</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} className={rowClass(log)}>
                    <td style={{fontSize:'12px',whiteSpace:'nowrap',color:'#555'}}>
                      {new Date(log.timestamp).toLocaleString('uk-UA')}
                    </td>
                    <td><code style={{fontSize:'12px'}}>{log.username}</code></td>
                    <td>
                      <span className={`badge ${
                        log.userRole==='Admin' ? 'badge-admin' :
                        log.userRole==='Doctor' ? 'badge-doctor' :
                        log.userRole==='Patient' ? 'badge-patient' : ''
                      }`} style={{fontSize:'11px'}}>
                        {log.userRole}
                      </span>
                    </td>
                    <td style={{fontSize:'13px'}}>{actionLabel(log.action)}</td>
                    <td style={{fontSize:'12px',color:'#666'}}>{log.targetEntity || '—'}</td>
                    <td>
                      <span className={`badge ${log.success ? 'badge-ok' : 'badge-violated'}`} style={{fontSize:'11px'}}>
                        {log.success ? '✓' : '✗'}
                      </span>
                    </td>
                    <td style={{fontSize:'12px',color:'#888'}}>{log.ipAddress || '—'}</td>
                    <td style={{fontSize:'12px',color:'#555',maxWidth:'200px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                      {log.details || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="pagination" style={{padding:'16px'}}>
            <button onClick={() => setPage(p=>p-1)} disabled={page===1}>‹</button>
            {Array.from({length:Math.min(totalPages,7)},(_,i)=>i+1).map(p=>(
              <button key={p} className={p===page?'active':''} onClick={()=>setPage(p)}>{p}</button>
            ))}
            <button onClick={() => setPage(p=>p+1)} disabled={page===totalPages}>›</button>
            <span className="pagination-info">Сторінка {page} з {totalPages} · Всього {total} подій</span>
          </div>
        )}
      </div>
    </div>
  );
}
