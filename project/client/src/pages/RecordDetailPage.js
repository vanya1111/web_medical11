import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recordsApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge, IntegrityBadge } from './DashboardPage';

const RECORD_TYPES = ['Consultation','Lab','Prescription','Surgery','Follow-up'];

export default function RecordDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, isDoctor } = useAuth();
  const qc = useQueryClient();

  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(null);
  const [saveError, setSaveError] = useState('');

  const { data: record, isLoading, error } = useQuery({
    queryKey: ['record', id],
    queryFn: () => recordsApi.getById(id).then(r => r.data),
    onSuccess: r => { if (!form) setForm(extractFields(r)); }
  });

  function extractFields(r) {
    return {
      diagnosis:   r.diagnosis   || '',
      treatment:   r.treatment   || '',
      medications: r.medications || '',
      notes:       r.notes       || ''
    };
  }

  const updateMutation = useMutation({
    mutationFn: data => recordsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['record', id] });
      setEditMode(false);
      setSaveError('');
    },
    onError: err => setSaveError(err.response?.data?.error || 'Помилка збереження')
  });

  const statusMutation = useMutation({
    mutationFn: status => recordsApi.changeStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['record', id] })
  });

  const handleSave = () => {
    if (!form.diagnosis.trim()) { setSaveError('Діагноз обов\'язковий'); return; }
    updateMutation.mutate(form);
  };

  const handleCancel = () => {
    setForm(extractFields(record));
    setEditMode(false);
    setSaveError('');
  };

  if (isLoading) return <div style={{textAlign:'center',padding:'60px',color:'#888'}}>⏳ Завантаження...</div>;
  if (error)     return <div className="alert alert-error">⚠️ {error.response?.data?.error || 'Помилка завантаження'}</div>;
  if (!record)   return <div className="alert alert-error">Запис не знайдено</div>;

  const canEdit = isAdmin || isDoctor;

  return (
    <div style={{maxWidth:'800px'}}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Медичний запис #{record.id}</h1>
          <p className="page-subtitle">{record.recordType} · {new Date(record.recordDate).toLocaleDateString('uk-UA')}</p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>← Назад</button>
      </div>

      {/* Integrity warning */}
      {!record.integrityValid && (
        <div className="integrity-warning">
          ⚠️ <strong>Увага!</strong> Цілісність запису порушена — дані могли бути змінені поза системою.
        </div>
      )}

      {/* Meta card */}
      <div className="card">
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px'}}>
          <div>
            <div className="form-label">Пацієнт</div>
            <div style={{fontWeight:600}}>{record.patientName}</div>
          </div>
          <div>
            <div className="form-label">Лікар</div>
            <div style={{fontWeight:600}}>{record.doctorName}</div>
          </div>
          <div>
            <div className="form-label">Тип запису</div>
            <div>{record.recordType}</div>
          </div>
          <div>
            <div className="form-label">Дата прийому</div>
            <div>{new Date(record.recordDate).toLocaleDateString('uk-UA')}</div>
          </div>
          <div>
            <div className="form-label">Статус</div>
            <StatusBadge status={record.status} />
          </div>
          <div>
            <div className="form-label">Цілісність</div>
            <IntegrityBadge valid={record.integrityValid} />
          </div>
          {record.updatedAt && (
            <div>
              <div className="form-label">Останнє оновлення</div>
              <div style={{fontSize:'13px',color:'#888'}}>{new Date(record.updatedAt).toLocaleString('uk-UA')}</div>
            </div>
          )}
        </div>
      </div>

      {/* Medical data card */}
      <div className="card">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px'}}>
          <h2 className="card-title" style={{margin:0}}>🔓 Медичні дані (розшифровані)</h2>
          {canEdit && !editMode && (
            <button className="btn btn-primary btn-sm" onClick={() => { setForm(extractFields(record)); setEditMode(true); }}>
              ✏️ Редагувати
            </button>
          )}
          {canEdit && editMode && (
            <div style={{display:'flex', gap:'8px'}}>
              <button
                className="btn btn-success btn-sm"
                onClick={handleSave}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? '⏳' : '💾'} Зберегти
              </button>
              <button className="btn btn-secondary btn-sm" onClick={handleCancel}>Скасувати</button>
            </div>
          )}
        </div>

        {saveError && <div className="alert alert-error">{saveError}</div>}

        {['diagnosis','treatment','medications','notes'].map(field => {
          const labels = { diagnosis:'Діагноз', treatment:'Лікування', medications:'Препарати', notes:'Нотатки' };
          return (
            <div className="form-group" key={field}>
              <label className="form-label">{labels[field]}</label>
              {editMode ? (
                <textarea
                  className="form-control"
                  rows={3}
                  value={form[field]}
                  onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                  style={{background:'#fffdf0'}}
                />
              ) : (
                <div style={{
                  padding:'10px 12px', background:'#f8faff', borderRadius:'8px',
                  border:'1.5px solid #e0e8f0', minHeight:'48px', whiteSpace:'pre-wrap',
                  fontSize:'14px', lineHeight:'1.5'
                }}>
                  {record[field] || <span style={{color:'#bbb'}}>—</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Status actions */}
      {canEdit && (
        <div className="card">
          <h3 className="card-title">Змінити статус</h3>
          <div style={{display:'flex', gap:'10px', flexWrap:'wrap'}}>
            {record.status !== 'Active' && (
              <button className="btn btn-success btn-sm"
                onClick={() => statusMutation.mutate('Active')}>
                🟢 Активний
              </button>
            )}
            {record.status !== 'Completed' && (
              <button className="btn btn-sm" style={{background:'#1e5799',color:'white'}}
                onClick={() => statusMutation.mutate('Completed')}>
                ✅ Завершений
              </button>
            )}
            {record.status !== 'Archived' && (
              <button className="btn btn-sm" style={{background:'#6f42c1',color:'white'}}
                onClick={() => statusMutation.mutate('Archived')}>
                📦 Архівний
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
