import { EncryptionService } from '../services/encryption.service';

describe('EncryptionService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      ENCRYPTION_KEY: 'f3bdfaf6bdcd810396812312a4d09d8f2feea24e3fe27111aea0d8dd54a8ff6c'
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('encryptData', () => {
    it('should encrypt data successfully', () => {
      const testData = 'Test data to encrypt';
      const encrypted = EncryptionService.encryptData(testData);
      
      expect(encrypted).toBeTruthy();
      expect(encrypted).toContain(':'); // Should contain IV and encrypted data
    });

    it('should throw error for empty data', () => {
      expect(() => EncryptionService.encryptData('')).toThrow();
    });
  });

  describe('decryptData', () => {
    it('should decrypt data correctly', () => {
      const testData = 'Test data to encrypt';
      const encrypted = EncryptionService.encryptData(testData);
      const decrypted = EncryptionService.decryptData(encrypted);
      
      expect(decrypted).toBe(testData);
    });

    it('should throw error for invalid encrypted data format', () => {
      expect(() => EncryptionService.decryptData('invalid-format')).toThrow();
    });
  });

  describe('testEncryption', () => {
    it('should successfully test encryption and decryption', () => {
      const result = EncryptionService.testEncryption();
      expect(result).toBe(true);
    });

    it('should handle encryption errors gracefully', () => {
      // Store the original key
      const originalKey = process.env.ENCRYPTION_KEY;
      
      // Set invalid key
      process.env.ENCRYPTION_KEY = 'invalid-key';
      
      // Run test
      const result = EncryptionService.testEncryption();
      
      // Restore original key
      process.env.ENCRYPTION_KEY = originalKey;
      
      expect(result).toBe(false);
    });
  });
}); 