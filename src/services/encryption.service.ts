import crypto from 'crypto';

export class EncryptionService {
  private static readonly algorithm = 'aes-256-cbc';
  private static readonly keyLength = 32; // 32 bytes = 256 bits

  private static getKey(): Buffer {
    const rawKey = process.env.ENCRYPTION_KEY;
    console.log('Debug - Raw key:', {
      exists: !!rawKey,
      length: rawKey?.length,
      value: rawKey?.substring(0, 10) + '...' // Show first 10 chars for debugging
    });

    if (!rawKey) {
      console.error('ENCRYPTION_KEY is not set in environment variables');
      throw new Error('ENCRYPTION_KEY environment variable is not set');
    }

    // Check if the key is in valid hex format and correct length
    const isValidHex = /^[0-9a-f]{64}$/i.test(rawKey);
    console.log('Debug - Key validation:', {
      isValidHex,
      length: rawKey.length,
      expectedLength: 64
    });

    if (isValidHex) {
      const buffer = Buffer.from(rawKey, 'hex');
      console.log('Debug - Buffer:', {
        length: buffer.length,
        expectedLength: this.keyLength
      });

      if (buffer.length === this.keyLength) {
        return buffer;
      }
    }

    // If we get here, the key is invalid
    console.error('Debug - Key error:', {
      rawKeyLength: rawKey.length,
      isValidHex,
      bufferLength: Buffer.from(rawKey, 'hex').length
    });

    throw new Error('Invalid encryption key format');
  }

  static encryptData(data: string): string {
    if (!data) {
      throw new Error('Data to encrypt cannot be empty');
    }

    try {
      console.log('Debug - Starting encryption');
      const key = this.getKey();
      console.log('Debug - Got key:', {
        keyLength: key.length,
        isBuffer: Buffer.isBuffer(key)
      });

      const iv = crypto.randomBytes(16);
      console.log('Debug - Generated IV:', {
        ivLength: iv.length,
        isBuffer: Buffer.isBuffer(iv)
      });

      try {
        console.log('Debug - Creating cipher with:', {
          algorithm: this.algorithm,
          keyLength: key.length,
          ivLength: iv.length
        });

        const cipher = crypto.createCipheriv(this.algorithm, key, iv);
        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        return `${iv.toString('hex')}:${encrypted}`;
      } catch (error) {
        const cipherError = error as Error;
        console.error('Debug - Cipher creation error:', {
          error: cipherError.message,
          errorName: cipherError.name,
          errorMessage: cipherError.message,
          errorCode: (cipherError as any).code,
          keyLength: key.length,
          ivLength: iv.length,
          algorithm: this.algorithm
        });
        throw cipherError;
      }
    } catch (error) {
      const encryptError = error as Error;
      console.error('Debug - Encryption error:', {
        error: encryptError.message,
        errorType: encryptError.constructor.name,
        keyExists: !!process.env.ENCRYPTION_KEY,
        keyLength: process.env.ENCRYPTION_KEY?.length,
        stack: encryptError.stack
      });
      throw encryptError;
    }
  }

  static decryptData(encryptedData: string): string {
    if (!encryptedData || !encryptedData.includes(':')) {
      throw new Error('Invalid encrypted data format');
    }

    try {
      const key = this.getKey();
      const [ivHex, encryptedText] = encryptedData.split(':');
      
      if (!ivHex || !encryptedText) {
        throw new Error('Invalid encrypted data format');
      }

      const iv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      const decryptError = error as Error;
      console.error('Debug - Decryption error:', {
        error: decryptError.message,
        errorType: decryptError.constructor.name,
        stack: decryptError.stack
      });
      throw decryptError;
    }
  }

  // Add a test method to verify the service is working
  static testEncryption(): boolean {
    try {
      const testData = 'Test encryption service';
      console.log('Debug - Testing encryption service');
      console.log('Debug - Test data:', testData);
      
      const encrypted = this.encryptData(testData);
      console.log('Debug - Encrypted:', encrypted);
      
      const decrypted = this.decryptData(encrypted);
      console.log('Debug - Decrypted:', decrypted);
      
      const success = decrypted === testData;
      console.log('Debug - Test result:', {
        success,
        matches: success ? 'Yes' : 'No',
        original: testData,
        decrypted
      });
      
      return success;
    } catch (error) {
      const testError = error as Error;
      console.error('Debug - Test error:', {
        error: testError.message,
        stack: testError.stack
      });
      return false;
    }
  }
} 