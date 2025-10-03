import crypto from 'crypto';

export class CryptoService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;
  private readonly ivLength = 16;
  private readonly tagLength = 16;
  private secret = process.env.ENCRYPTION_SECRET;

  private deriveKey(secret: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(secret, salt, 100000, this.keyLength, 'sha256');
  }

  encrypt(data: string): string {
    if (!this.secret) {
      throw new Error('ENCRYPTION_SECRET environment variable is required');
    }

    try {
      const salt = crypto.randomBytes(16);
      const iv = crypto.randomBytes(this.ivLength);
      const key = this.deriveKey(this.secret, salt);
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);
      cipher.setAAD(salt);
      
      let encrypted = cipher.update(data, 'utf8');
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      const tag = cipher.getAuthTag();
      const result = Buffer.concat([salt, iv, tag, encrypted]);
      
      return result.toString('base64');
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  decrypt(encryptedData: string): string {
    if (!this.secret) {
      throw new Error('Decryption secret is required');
    }

    try {
      const buffer = Buffer.from(encryptedData, 'base64');
      const salt = buffer.subarray(0, 16);
      const iv = buffer.subarray(16, 16 + this.ivLength);
      const tag = buffer.subarray(16 + this.ivLength, 16 + this.ivLength + this.tagLength);
      const encrypted = buffer.subarray(16 + this.ivLength + this.tagLength);
      const key = this.deriveKey(this.secret, salt);
      
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      decipher.setAAD(salt);
      decipher.setAuthTag(tag);
      
      let decrypted = decipher.update(encrypted, undefined, 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  generateSecret(): string {
    return crypto.randomBytes(32).toString('base64');
  }
}

const cryptoService = new CryptoService();

export { cryptoService };
