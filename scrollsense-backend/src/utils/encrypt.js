const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
// Use the first 32 bytes of JWT_ACCESS_SECRET as the encryption key
const getKey = () => {
  if (!process.env.JWT_ACCESS_SECRET) throw new Error('JWT_ACCESS_SECRET is required');
  const hash = crypto.createHash('sha256').update(process.env.JWT_ACCESS_SECRET).digest();
  return hash;
};

const encrypt = (text) => {
  if (!text) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  
  let encryptedData = cipher.update(text, 'utf8', 'hex');
  encryptedData += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return JSON.stringify({
    iv: iv.toString('hex'),
    encryptedData,
    authTag
  });
};

const decrypt = (encryptedString) => {
  if (!encryptedString) return null;
  try {
    const { iv, encryptedData, authTag } = JSON.parse(encryptedString);
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Decryption failed', err);
    return null;
  }
};

module.exports = { encrypt, decrypt };