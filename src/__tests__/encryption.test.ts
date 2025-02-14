import { EncryptionService } from '../services/encryption.service';

describe('EncryptionService', () => {
  beforeAll(() => {
    process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef';
  });

  it('should encrypt and decrypt data correctly', () => {
    const originalText = 'Hello, this is a test note!';
    const encrypted = EncryptionService.encryptData(originalText);
    expect(encrypted).toContain(':');
    const decrypted = EncryptionService.decryptData(encrypted);
    expect(decrypted).toBe(originalText);
  });

  it('should generate different ciphertexts for the same input', () => {
    const text = 'Same text';
    const encrypted1 = EncryptionService.encryptData(text);
    const encrypted2 = EncryptionService.encryptData(text);
    expect(encrypted1).not.toBe(encrypted2);
    expect(EncryptionService.decryptData(encrypted1)).toBe(text);
    expect(EncryptionService.decryptData(encrypted2)).toBe(text);
  });
}); 