import { PrismaClient } from '@prisma/client';

// Mock Prisma
jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      // Add mock implementations for Prisma methods used in your tests
      note: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      // Add other models as needed
    })),
  };
});

// Global test setup
beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret';
  process.env.ENCRYPTION_KEY = 'f3bdfaf6bdcd810396812312a4d09d8f2feea24e3fe27111aea0d8dd54a8ff6c';
  process.env.GEMINI_API_KEY = 'test-api-key';
});

afterAll(() => {
  // Cleanup after all tests
}); 