import request from 'supertest';
import { UserRole } from '@prisma/client';
import { LLMService } from '../services/llm.service';
import { EncryptionService } from '../services/encryption.service';
import app from '../index';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

// Mock dependencies
jest.mock('../services/llm.service');
jest.mock('../services/encryption.service');
jest.mock('@prisma/client');
jest.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn()
    },
    note: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn()
    },
    planItem: {
      updateMany: jest.fn()
    },
    checklistItem: {
      updateMany: jest.fn()
    },
    $connect: jest.fn(),
    $disconnect: jest.fn()
  }
}));

// Mock environment variables
process.env.JWT_SECRET = 'test-secret';
process.env.ENCRYPTION_KEY = 'f3bdfaf6bdcd810396812312a4d09d8f2feea24e3fe27111aea0d8dd54a8ff6c';

describe('Doctor Routes', () => {
  let token: string;
  const mockDoctorId = "mock-doctor-id";
  const mockPatientId = "mock-patient-id";
  
  // Add console mocking
  const originalConsoleError = console.error;
  
  beforeAll(() => {
    // Create a valid JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET must be defined for tests');
    }
    token = jwt.sign({ id: mockDoctorId, role: UserRole.DOCTOR }, jwtSecret);
    
    // Mock console.error
    console.error = jest.fn();
  });
  
  afterAll(() => {
    // Restore console.error
    console.error = originalConsoleError;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock the user lookup in auth middleware
    (prisma.user.findUnique as jest.Mock).mockImplementation((args) => {
      if (args.where.id === mockDoctorId) {
        return Promise.resolve({
          id: mockDoctorId,
          role: UserRole.DOCTOR,
          name: 'Test Doctor',
          email: 'doctor@test.com'
        });
      }
      if (args.where.id === mockPatientId) {
        return Promise.resolve({
          id: mockPatientId,
          role: UserRole.PATIENT,
          assignedDoctorId: mockDoctorId,
          name: 'Test Patient',
          email: 'patient@test.com'
        });
      }
      return Promise.resolve(null);
    });
  });

  describe('POST /api/doctors/patients/:patientId/notes', () => {
    it('should create a new note with checklist and plan', async () => {
      const mockNote = {
        note: "Patient reports mild headaches"
      };

      const mockLLMResponse = {
        checklist: [{ task: "Take medicine", dueDate: new Date() }],
        plan: [{
          action: "Rest",
          frequency: "daily",
          duration: 7,
          startDate: new Date()
        }]
      };

      // Mock LLM service
      (LLMService.prototype.processNote as jest.Mock).mockResolvedValueOnce(mockLLMResponse);
      
      // Mock encryption service
      (EncryptionService.encryptData as jest.Mock).mockReturnValueOnce('encrypted-data');

      // Mock finding previous notes
      (prisma.note.findMany as jest.Mock).mockResolvedValueOnce([]);

      // Mock note creation
      (prisma.note.create as jest.Mock).mockResolvedValueOnce({
        id: 'mock-note-id',
        ...mockNote,
        encryptedNote: 'encrypted-data',
        checklist: mockLLMResponse.checklist,
        plan: mockLLMResponse.plan
      });

      const response = await request(app)
        .post(`/api/doctors/patients/${mockPatientId}/notes`)
        .set('Authorization', `Bearer ${token}`)
        .send(mockNote);

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('note');
      expect(response.body.data.note).toHaveProperty('checklist');
      expect(response.body.data.note).toHaveProperty('plan');
    });

    it('should handle LLM processing errors', async () => {
      // Mock LLM service error
      (LLMService.prototype.processNote as jest.Mock).mockRejectedValueOnce(new Error('LLM Error'));

      // Mock note operations
      (prisma.note.findMany as jest.Mock).mockResolvedValueOnce([]);
      (prisma.note.create as jest.Mock).mockResolvedValueOnce(null);

      try {
        const response = await request(app)
          .post(`/api/doctors/patients/${mockPatientId}/notes`)
          .set('Authorization', `Bearer ${token}`)
          .send({ note: "Test note" });

        expect(response.status).toBe(500);
        expect(response.body).toEqual({
          status: 'error',
          message: 'Something went wrong. Please try again later.'
        });

        // Verify that LLM service was called
        expect(LLMService.prototype.processNote).toHaveBeenCalledWith("Test note");
      } catch (error) {
        // The error should be caught by the error middleware
        fail('Request should not throw');
      }
    });

    it('should return 404 for non-existent patient', async () => {
      // Override the default mock for this test
      (prisma.user.findUnique as jest.Mock)
        .mockImplementation((args) => {
          // First call is for auth middleware - return the doctor
          if (args.where.id === mockDoctorId) {
            return Promise.resolve({
              id: mockDoctorId,
              role: UserRole.DOCTOR,
              name: 'Test Doctor',
              email: 'doctor@test.com'
            });
          }
          // Second call is for patient lookup - return null
          return Promise.resolve(null);
        });

      // Mock LLM service to prevent TypeError
      (LLMService.prototype.processNote as jest.Mock).mockResolvedValueOnce({
        checklist: [],
        plan: []
      });

      // Mock encryption service
      (EncryptionService.encryptData as jest.Mock).mockReturnValueOnce('encrypted-data');

      // Mock note operations
      (prisma.note.findMany as jest.Mock).mockResolvedValueOnce([]);
      (prisma.note.create as jest.Mock).mockResolvedValueOnce(null);

      const response = await request(app)
        .post(`/api/doctors/patients/${mockPatientId}/notes`)
        .set('Authorization', `Bearer ${token}`)
        .send({ note: "Test note" });

      expect(response.status).toBe(404);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Patient not found or not assigned to you');
    });
  });

  describe('GET /api/doctors/patients', () => {
    it('should return list of patients', async () => {
      const mockPatients = [
        { id: 'patient-1', name: 'Patient 1', email: 'patient1@test.com' },
        { id: 'patient-2', name: 'Patient 2', email: 'patient2@test.com' }
      ];

      (prisma.user.findMany as jest.Mock).mockResolvedValueOnce(mockPatients);

      const response = await request(app)
        .get('/api/doctors/patients')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('patients');
      expect(response.body.data.patients).toHaveLength(2);
    });

    it('should handle unauthorized access', async () => {
      // Override the auth middleware mock to simulate invalid token
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/api/doctors/patients')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Not authenticated');
    });
  });
}); 