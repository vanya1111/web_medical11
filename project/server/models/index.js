const sequelize = require('../config/database');
const User = require('./User');
const MedicalRecord = require('./MedicalRecord');
const AuditLog = require('./AuditLog');
const { hashPassword, encryptRecordFields } = require('../services/CryptoService');

// Associations
User.hasMany(MedicalRecord, { foreignKey: 'patientId', as: 'recordsAsPatient' });
User.hasMany(MedicalRecord, { foreignKey: 'doctorId',  as: 'recordsAsDoctor'  });
MedicalRecord.belongsTo(User, { foreignKey: 'patientId', as: 'patient' });
MedicalRecord.belongsTo(User, { foreignKey: 'doctorId',  as: 'doctor'  });
User.hasMany(AuditLog, { foreignKey: 'userId' });
AuditLog.belongsTo(User, { foreignKey: 'userId' });

// Seed function
async function seedDatabase() {
  const count = await User.count();
  if (count > 0) return;

  console.log('Seeding database...');

  const users = await User.bulkCreate([
    { username: 'admin',   passwordHash: await hashPassword('Admin@123'),   role: 'Admin',   fullName: 'Системний Адміністратор',      email: 'admin@medregistry.local'   },
    { username: 'doctor1', passwordHash: await hashPassword('Doctor@123'),  role: 'Doctor',  fullName: 'Іваненко Петро Миколайович',  email: 'doctor1@medregistry.local'  },
    { username: 'doctor2', passwordHash: await hashPassword('Doctor@123'),  role: 'Doctor',  fullName: 'Савченко Марія Іванівна',     email: 'doctor2@medregistry.local'  },
    { username: 'patient1',passwordHash: await hashPassword('Patient@123'), role: 'Patient', fullName: 'Мельник Андрій Степанович',   email: 'patient1@medregistry.local' },
    { username: 'patient2',passwordHash: await hashPassword('Patient@123'), role: 'Patient', fullName: 'Бойко Наталія Олексіївна',    email: 'patient2@medregistry.local' },
  ]);

  const doctor  = users.find(u => u.username === 'doctor1');
  const patient = users.find(u => u.username === 'patient1');
  const patient2= users.find(u => u.username === 'patient2');

  // Sample records
  const records = [
    {
      patientId: patient.id, doctorId: doctor.id, recordType: 'Consultation',
      recordDate: new Date(Date.now() - 30*24*60*60*1000),
      ...encryptRecordFields({
        diagnosis:   'Гостре респіраторне захворювання (ГРЗ). Код МКХ: J06.9',
        treatment:   'Постільний режим 5 днів. Рясне пиття. Симптоматична терапія.',
        medications: 'Парацетамол 500мг 3 рази/день; Амброксол 30мг 2 рази/день',
        notes:       'Скарги на кашель, нежить, температура 38.2°C'
      })
    },
    {
      patientId: patient.id, doctorId: doctor.id, recordType: 'Lab', status: 'Completed',
      recordDate: new Date(Date.now() - 15*24*60*60*1000),
      ...encryptRecordFields({
        diagnosis:   'Нормальний загальний аналіз крові. Ознаки одужання.',
        treatment:   'Повторна консультація через 2 тижні за потреби.',
        medications: 'Вітамін C 1000мг 1 раз/день',
        notes:       'Лейкоцити 6.2, еритроцити 4.8, гемоглобін 138'
      })
    },
    {
      patientId: patient2.id, doctorId: doctor.id, recordType: 'Prescription',
      recordDate: new Date(Date.now() - 7*24*60*60*1000),
      ...encryptRecordFields({
        diagnosis:   'Артеріальна гіпертензія 1 ступеня. Код МКХ: I10',
        treatment:   'Обмеження солі до 5г/добу. Фізичні вправи 30 хв/день.',
        medications: 'Лізиноприл 5мг 1 раз/день; Аторвастатин 10мг 1 раз/день',
        notes:       'АТ 155/95 мм рт.ст. Рекомендовано щоденний моніторинг'
      })
    }
  ];

  await MedicalRecord.bulkCreate(records);
  console.log('Database seeded successfully.');
}

module.exports = { sequelize, User, MedicalRecord, AuditLog, seedDatabase };
