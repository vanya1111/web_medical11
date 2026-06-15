import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { recordsApi, usersApi } from '../api';
import { useAuth } from '../context/AuthContext';

const RECORD_TYPES = ['Consultation','Lab','Prescription','Surgery','Follow-up'];

export default function AddRecordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const preselectedPatientId = searchParams.get('patientId');

  const [form, setForm] = useState({
    patientId:  preselectedPatientId || '',
    recordType: 'Consultation',
    recordDate: new Date().toISOString().split('T')[0],
    diagnosis:  '',
    treatment:  '',
    medications:'',
    notes:      ''
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => usersApi.getPatients().then(r => r.data)
  });

  const mutation = useMutation({
    mutationFn: data => recordsApi.create(data),
    onSuccess: (res) => {
      navigate(`/records/${res.data.id}`);
    },
    onError: err => setSubmitError(err.response?.data?.error || 'Помилка збереження')
  });

  const validate = () => {
    const e = {};
    if (!form.patientId)    e.patientId  = 'Оберіть пацієнта';
    if (!form.diagnosis.trim()) e.diagnosis = 'Діагноз обов\'язковий';
    if (!form.recordDate)   e.recordDate = 'Оберіть дату';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = e => {
    e.preventDefault();
    setSubmitError('');
    if (!validate()) return;
    mutation.mutate(form);
  };

  const set = (field, val) => {
    setForm(f => ({ ...f, [field]: val }));
    setErrors(er => ({ ...er, [field]: '' }));
  };

  return (
    <div style={{maxWidth:'700px'}}>
      <div className="page-header">
        <div>
          <h1 className="page-title">➕ Новий медичний запис</h1>
          <p className="page-subtitle">Лікар: {user?.fullName}</p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>← Назад</button>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} noValidate>
          {submitError && <div className="alert alert-error">{submitError}</div>}

          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px'}}>
            <div className="form-group">
              <label className="form-label">Пацієнт *</label>
              <select
                className={`form-control${errors.patientId ? ' error' : ''}`}
                value={form.patientId}
                onChange={e => set('patientId', e.target.value)}
              >
                <option value="">— Оберіть пацієнта —</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.fullName}</option>
                ))}
              </select>
              {errors.patientId && <div className="form-error">{errors.patientId}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Тип запису</label>
              <select
                className="form-control"
                value={form.recordType}
                onChange={e => set('recordType', e.target.value)}
              >
                {RECORD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Дата прийому *</label>
              <input
                type="date"
                className={`form-control${errors.recordDate ? ' error' : ''}`}
                value={form.recordDate}
                onChange={e => set('recordDate', e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
              {errors.recordDate && <div className="form-error">{errors.recordDate}</div>}
            </div>
          </div>

          {[
            { field:'diagnosis',   label:'Діагноз *',   required:true  },
            { field:'treatment',   label:'Лікування',   required:false },
            { field:'medications', label:'Препарати',   required:false },
            { field:'notes',       label:'Нотатки',     required:false },
          ].map(({ field, label, required }) => (
            <div className="form-group" key={field}>
              <label className="form-label">{label}</label>
              <textarea
                className={`form-control${errors[field] ? ' error' : ''}`}
                rows={3}
                value={form[field]}
                onChange={e => set(field, e.target.value)}
                placeholder={required ? 'Обов\'язкове поле' : 'Необов\'язково'}
              />
              {errors[field] && <div className="form-error">{errors[field]}</div>}
            </div>
          ))}

          <div className="alert alert-info" style={{marginBottom:'16px'}}>
            🔒 Дані будуть зашифровані алгоритмом <strong>AES-256-CBC</strong> та підписані <strong>HMAC-SHA256</strong>
          </div>

          <div style={{display:'flex', gap:'10px'}}>
            <button
              type="submit"
              className="btn btn-success"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? '⏳ Збереження...' : '💾 Зберегти запис'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate(-1)}
            >
              Скасувати
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
