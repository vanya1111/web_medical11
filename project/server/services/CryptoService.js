const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// ─── Key derivation (PBKDF2-SHA256) ─────────────────────────────────────────
const ITERATIONS = 100_000;
const KEY_LEN = 32; // 256 bits for AES
const HMAC_KEY_LEN = 64; // 512 bits for HMAC

let _encKey = null;
let _hmacKey = null;

function getEncryptionKey() {
  if (!_encKey) {
    _encKey = crypto.pbkdf2Sync(
      process.env.ENCRYPTION_KEY_PASSWORD,
      process.env.ENCRYPTION_KEY_SALT,
      ITERATIONS,
      KEY_LEN,
      'sha256'
    );
  }
  return _encKey;
}

function getHmacKey() {
  if (!_hmacKey) {
    _hmacKey = crypto.pbkdf2Sync(
      process.env.HMAC_KEY_PASSWORD,
      process.env.HMAC_KEY_SALT,
      ITERATIONS,
      HMAC_KEY_LEN,
      'sha256'
    );
  }
  return _hmacKey;
}

// ─── AES-256-CBC Encryption ──────────────────────────────────────────────────

/**
 * Encrypts plaintext using AES-256-CBC.
 * Returns Base64(IV[16] + Ciphertext).
 */
function encrypt(plaintext) {
  if (!plaintext) return '';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final()
  ]);
  const result = Buffer.concat([iv, encrypted]);
  return result.toString('base64');
}

/**
 * Decrypts Base64(IV + Ciphertext) using AES-256-CBC.
 */
function decrypt(cipherBase64) {
  if (!cipherBase64) return '';
  const full = Buffer.from(cipherBase64, 'base64');
  const iv = full.subarray(0, 16);
  const ciphertext = full.subarray(16);
  const decipher = crypto.createDecipheriv('aes-256-cbc', getEncryptionKey(), iv);
  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final()
  ]);
  return decrypted.toString('utf8');
}

// ─── HMAC-SHA256 ─────────────────────────────────────────────────────────────

/**
 * Computes HMAC-SHA256 over the given data.
 */
function computeHmac(data) {
  return crypto
    .createHmac('sha256', getHmacKey())
    .update(data, 'utf8')
    .digest('base64');
}

/**
 * Verifies HMAC using constant-time comparison (timing-attack safe).
 */
function verifyHmac(data, expectedHmac) {
  const actual = computeHmac(data);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(actual, 'base64'),
      Buffer.from(expectedHmac, 'base64')
    );
  } catch {
    return false;
  }
}

/**
 * Computes HMAC for a medical record.
 * Payload = concat of all encrypted fields.
 */
function computeRecordHmac(encFields) {
  const payload = [
    encFields.encryptedDiagnosis,
    encFields.encryptedTreatment,
    encFields.encryptedMedications,
    encFields.encryptedNotes
  ].join('|');
  return computeHmac(payload);
}

/**
 * Verifies HMAC for a medical record.
 */
function verifyRecordHmac(record) {
  const payload = [
    record.encryptedDiagnosis,
    record.encryptedTreatment,
    record.encryptedMedications,
    record.encryptedNotes
  ].join('|');
  return verifyHmac(payload, record.hmacSignature);
}

// ─── Password Hashing (bcrypt) ───────────────────────────────────────────────

async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

// ─── Encrypt / Decrypt record fields ────────────────────────────────────────

function encryptRecordFields({ diagnosis, treatment, medications, notes }) {
  const encryptedDiagnosis   = encrypt(diagnosis   || '');
  const encryptedTreatment   = encrypt(treatment   || '');
  const encryptedMedications = encrypt(medications || '');
  const encryptedNotes       = encrypt(notes       || '');

  const hmacSignature = computeRecordHmac({
    encryptedDiagnosis,
    encryptedTreatment,
    encryptedMedications,
    encryptedNotes
  });

  return {
    encryptedDiagnosis,
    encryptedTreatment,
    encryptedMedications,
    encryptedNotes,
    hmacSignature
  };
}

function decryptRecordFields(record) {
  const integrityValid = verifyRecordHmac(record);
  return {
    diagnosis:   decrypt(record.encryptedDiagnosis),
    treatment:   decrypt(record.encryptedTreatment),
    medications: decrypt(record.encryptedMedications),
    notes:       decrypt(record.encryptedNotes),
    integrityValid
  };
}

module.exports = {
  encrypt,
  decrypt,
  computeHmac,
  verifyHmac,
  computeRecordHmac,
  verifyRecordHmac,
  hashPassword,
  verifyPassword,
  encryptRecordFields,
  decryptRecordFields
};
