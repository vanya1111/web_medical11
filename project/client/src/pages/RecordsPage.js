import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recordsApi, usersApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge, IntegrityBadge } from './DashboardPage';

export default function RecordsPage({ myRecords = false }) {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin, isDoctor, isPatient } = useAuth();
  const qc = useQueryClient();

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter]     = useState('');
  const LIMIT = 15;

  // Resolve patient info
  const pid = myRecords ? user?.id : patientId;

  const { data: patientInfo } = useQuery({
    queryKey: ['patient', pid],
    queryFn: () => usersApi.getPatients().then(r => r.data.find(p => p.id === Number(pid))),
    enabled: !myRecords && !!pid
  });

  const { data, isLoading } = useQuery({
    queryKey: ['records', pid, page, statusFilter, typeFilter],
    queryFn: () => recordsApi.getAll({
      patientId: pid,
      status: statusFilter || undefined,
      type: typeFilter || undefined,
      page,
      limit: LIMIT
    }).then(r => r.data)
  });

  const deleteMutation = useMutation({
    mutationFn: id => recordsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['records'] })
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => recordsApi.changeStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['records'] })
  });

  const records = data?.records || [];
  const total   = data?.total   || 0;
  const totalPages = Math.ceil(total / LIMIT);

  const patientName = myRecords
    ? user?.fullName
    : patientInfo?.fullName || `Пацієнт #${pid}`;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            📋 {myRecords ? 'Мої медичні записи' : `Записи: ${patientName}`}
          </h1>
          <p className="page-subtitle">Всього записів: {total}</p>
        </div>
        <div style={{display:'flex', gap:'10px'}}>
          {!myRecords && !isPatient && (
            <button
              className="btn btn-success"
              onClick={() => navigate(`/records/new?patientId=${pid}`)}
            >
              ➕ Новий запис
            </button>
          )}
          {!myRecords && (
            <button
              className="btn btn-secondary"
              onClick={() => navigate('/patients')}
            >
              ← Назад
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="search-bar">
        <select
          className="form-control"
          style={{maxWidth:'180px'}}
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">Всі статуси</option>
          <option value="Active">🟢 Активний</option>
          <option value="Completed">✅ Завершений</option>
          <option value="Archived">📦 Архівний</option>
        </select>

        <select
          className="form-control"
          style={{maxWidth:'180px'}}
          value={typeFilter}
          onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
        >
          <option value="">Всі типи</option>
          {['Consultation','Lab','Prescription','Surgery','Follow-up'].map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div className="card" style={{padding:0}}>
        {isLoading ? (
          <p style={{textAlign:'center',padding:'40px',color:'#888'}}>⏳ Завантаження...</p>
        ) : records.length === 0 ? (
          <p style={{textAlign:'center',padding:'40px',color:'#888'}}>Записів не знайдено</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Дата</th>
                  <th>Тип</th>
                  {!myRecords && <th>Пацієнт</th>}
                  <th>Лікар</th>
                  <th>Діагноз</th>
                  <th>Статус</th>
                  <th>Цілісність</th>
                  <th>Дії</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr
                    key={r.id}
                    className={
                      !r.integrityValid ? 'tr-integrity-bad' :
                      r.status === 'Completed' ? 'tr-completed' :
                      r.status === 'Archived'  ? 'tr-archived'  : ''
                    }
                  >
                    <td style={{color:'#888'}}>{r.id}</td>
                    <td>{new Date(r.recordDate).toLocaleDateString('uk-UA')}</td>
                    <td>{r.recordType}</td>
                    {!myRecords && <td>{r.patientName}</td>}
                    <td>{r.doctorName}</td>
                    <td style={{maxWidth:'240px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                      {r.diagnosis}
                    </td>
                    <td><StatusBadge status={r.status} /></td>
                    <td><IntegrityBadge valid={r.integrityValid} /></td>
                    <td>
                      <div style={{display:'flex',gap:'4px',flexWrap:'nowrap'}}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => navigate(`/records/${r.id}`)}
                        >🔍</button>

                        {(isAdmin || isDoctor) && r.status !== 'Completed' && (
                          <button
                            className="btn btn-sm"
                            style={{background:'#22863a',color:'white'}}
                            onClick={() => statusMutation.mutate({ id: r.id, status: 'Completed' })}
                            title="Завершити"
                          >✅</button>
                        )}
                        {(isAdmin || isDoctor) && r.status !== 'Archived' && (
                          <button
                            className="btn btn-sm"
                            style={{background:'#6f42c1',color:'white'}}
                            onClick={() => statusMutation.mutate({ id: r.id, status: 'Archived' })}
                            title="Архівувати"
                          >📦</button>
                        )}
                        {isAdmin && (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => {
                              if (window.confirm(`Видалити запис #${r.id}?`))
                                deleteMutation.mutate(r.id);
                            }}
                            title="Видалити"
                          >🗑</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination" style={{padding:'16px'}}>
            <button onClick={() => setPage(p => p-1)} disabled={page === 1}>‹</button>
            {Array.from({length: Math.min(totalPages, 7)}, (_,i) => i+1).map(p => (
              <button
                key={p}
                className={p === page ? 'active' : ''}
                onClick={() => setPage(p)}
              >{p}</button>
            ))}
            <button onClick={() => setPage(p => p+1)} disabled={page === totalPages}>›</button>
            <span className="pagination-info">Сторінка {page} з {totalPages}</span>
          </div>
        )}
      </div>
    </div>
  );
}
