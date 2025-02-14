// Store original console methods
const originalConsoleError = console.error;
const originalConsoleLog = console.log;

// Mock Prisma
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    note: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    // Add other models as needed
  })),
  UserRole: {
    PATIENT: 'PATIENT',
    DOCTOR: 'DOCTOR'
  }
}));

// Global test setup
beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret';
  process.env.ENCRYPTION_KEY = 'f3bdfaf6bdcd810396812312a4d09d8f2feea24e3fe27111aea0d8dd54a8ff6c';
  process.env.GEMINI_API_KEY = 'test-api-key';
  
  // Mock console methods to prevent error output from being treated as test failures
  console.error = jest.fn();
  console.log = jest.fn();
});

afterAll(() => {
  // Restore original console methods
  console.error = originalConsoleError;
  console.log = originalConsoleLog;
}); 