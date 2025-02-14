import { EncryptionService } from '../services/encryption.service';

describe('EncryptionService', () => {
  beforeAll(() => {
    // Set a valid hex encryption key for testing
    process.env.ENCRYPTION_KEY = 'f3bdfaf6bdcd810396812312a4d09d8f2feea24e3fe27111aea0d8dd54a8ff6c';
  });

  afterAll(() => {
    delete process.env.ENCRYPTION_KEY;
  });

  it('should encrypt and decrypt data correctly', () => {
    const data = 'test data';
    const encrypted = EncryptionService.encryptData(data);
    expect(encrypted).toBeDefined();
    expect(typeof encrypted).toBe('string');
    expect(encrypted).not.toBe(data);

    const decrypted = EncryptionService.decryptData(encrypted);
    expect(decrypted).toBe(data);
  });

  it('should generate different ciphertexts for the same input', () => {
    const data = 'test data';
    const encrypted1 = EncryptionService.encryptData(data);
    const encrypted2 = EncryptionService.encryptData(data);
    
    expect(encrypted1).not.toBe(encrypted2);
    
    const decrypted1 = EncryptionService.decryptData(encrypted1);
    const decrypted2 = EncryptionService.decryptData(encrypted2);
    
    expect(decrypted1).toBe(data);
    expect(decrypted2).toBe(data);
  });
}); 