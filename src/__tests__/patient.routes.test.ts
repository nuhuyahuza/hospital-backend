import request from 'supertest';
import { UserRole } from '@prisma/client';
import { EncryptionService } from '../services/encryption.service';
import app from '../index';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

// Mock dependencies
jest.mock('../services/encryption.service');
jest.mock('@prisma/client');
jest.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn()
    },
    note: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn()
    },
    planItem: {
      findFirst: jest.fn(),
      update: jest.fn()
    },
    checklistItem: {
      findFirst: jest.fn(),
      update: jest.fn()
    },
    $connect: jest.fn(),
    $disconnect: jest.fn()
  }
}));

// Mock environment variables
process.env.JWT_SECRET = 'test-secret';
process.env.ENCRYPTION_KEY = 'f3bdfaf6bdcd810396812312a4d09d8f2feea24e3fe27111aea0d8dd54a8ff6c';

describe('Patient Routes', () => {
  let token: string;
  const mockPatientId = "mock-patient-id";
  const mockDoctorId = "mock-doctor-id";
  
  beforeAll(() => {
    // Create a valid JWT token for a patient
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET must be defined for tests');
    }
    token = jwt.sign({ id: mockPatientId, role: UserRole.PATIENT }, jwtSecret);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock the user lookup in auth middleware - this is crucial for all routes
    (prisma.user.findUnique as jest.Mock).mockImplementation((args) => {
      if (args.where.id === mockPatientId) {
        return Promise.resolve({
          id: mockPatientId,
          role: UserRole.PATIENT,
          name: 'Test Patient',
          email: 'patient@test.com'
        });
      }
      if (args.where.id === mockDoctorId) {
        return Promise.resolve({
          id: mockDoctorId,
          role: UserRole.DOCTOR,
          name: 'Test Doctor',
          email: 'doctor@test.com'
        });
      }
      return Promise.resolve(null);
    });
  });

  describe('GET /api/patients/doctors', () => {
    it('should return list of available doctors', async () => {
      const mockDoctors = [
        { id: 'doctor-1', name: 'Doctor 1', email: 'doctor1@test.com' },
        { id: 'doctor-2', name: 'Doctor 2', email: 'doctor2@test.com' }
      ];

      (prisma.user.findMany as jest.Mock).mockResolvedValueOnce(mockDoctors);

      const response = await request(app)
        .get('/api/patients/doctors')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('doctors');
      expect(response.body.data.doctors).toHaveLength(2);
    });

    it('should handle unauthorized access', async () => {
      const response = await request(app)
        .get('/api/patients/doctors')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Not authenticated');
    });

    it('should handle forbidden access for non-patient users', async () => {
      const doctorToken = jwt.sign(
        { id: mockDoctorId, role: UserRole.DOCTOR },
        process.env.JWT_SECRET!
      );

      const response = await request(app)
        .get('/api/patients/doctors')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(response.status).toBe(403);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Not authorized');
    });
  });

  describe('POST /api/patients/select-doctor/:doctorId', () => {
    it('should assign a doctor to the patient', async () => {
      const mockDoctor = {
        id: mockDoctorId,
        name: 'Test Doctor',
        email: 'doctor@test.com',
        role: UserRole.DOCTOR
      };

      // Mock finding the doctor
      (prisma.user.findUnique as jest.Mock)
        .mockImplementation((args) => {
          if (args.where.id === mockPatientId) {
            return Promise.resolve({
              id: mockPatientId,
              role: UserRole.PATIENT,
              name: 'Test Patient',
              email: 'patient@test.com'
            });
          }
          if (args.where.id === mockDoctorId) {
            return Promise.resolve(mockDoctor);
          }
          return Promise.resolve(null);
        });

      // Mock updating the patient
      (prisma.user.update as jest.Mock).mockResolvedValueOnce({
        id: mockPatientId,
        name: 'Test Patient',
        email: 'patient@test.com',
        role: UserRole.PATIENT,
        assignedDoctorId: mockDoctorId
      });

      const response = await request(app)
        .post(`/api/patients/select-doctor/${mockDoctorId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.patient).toHaveProperty('assignedDoctorId', mockDoctorId);
    });

    it('should return 404 for non-existent doctor', async () => {
      const response = await request(app)
        .post(`/api/patients/select-doctor/non-existent-id`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Doctor not found');
    });
  });

  describe('GET /api/patients/my-doctor', () => {
    it('should return the assigned doctor', async () => {
      const mockDoctor = {
        id: mockDoctorId,
        name: 'Test Doctor',
        email: 'doctor@test.com'
      };

      // Mock finding the patient with doctor for both auth middleware and route handler
      (prisma.user.findUnique as jest.Mock)
        .mockImplementationOnce((args) => {
          if (args.where.id === mockPatientId) {
            return Promise.resolve({
              id: mockPatientId,
              role: UserRole.PATIENT,
              name: 'Test Patient',
              email: 'patient@test.com',
              assignedDoctorId: mockDoctorId,
              doctor: mockDoctor
            });
          }
          return Promise.resolve(null);
        })
        .mockImplementationOnce((args) => {
          if (args.where.id === mockPatientId) {
            return Promise.resolve({
              id: mockPatientId,
              role: UserRole.PATIENT,
              name: 'Test Patient',
              email: 'patient@test.com',
              assignedDoctorId: mockDoctorId,
              doctor: mockDoctor
            });
          }
          return Promise.resolve(null);
        });

      const response = await request(app)
        .get('/api/patients/my-doctor')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.doctor).toEqual(mockDoctor);
    });

    it('should return 404 when no doctor is assigned', async () => {
      // Mock finding the patient without doctor
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        id: mockPatientId,
        role: UserRole.PATIENT,
        name: 'Test Patient',
        email: 'patient@test.com',
        assignedDoctorId: null,
        doctor: null
      });

      const response = await request(app)
        .get('/api/patients/my-doctor')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('No doctor assigned');
    });
  });

  describe('GET /api/patients/my-notes', () => {
    it('should return patient\'s notes', async () => {
      const mockNotes = [
        {
          id: 'note-1',
          encryptedNote: 'encrypted-note-1',
          doctorId: mockDoctorId,
          patientId: mockPatientId,
          doctor: {
            id: mockDoctorId,
            name: 'Test Doctor',
            email: 'doctor@test.com'
          },
          checklist: [],
          plan: []
        }
      ];

      // Mock finding notes
      (prisma.note.findMany as jest.Mock).mockResolvedValueOnce(mockNotes);
      
      // Mock decryption
      (EncryptionService.decryptData as jest.Mock).mockReturnValue('decrypted note');

      const response = await request(app)
        .get('/api/patients/my-notes')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('notes');
      expect(response.body.data.notes).toHaveLength(1);
      expect(response.body.data.notes[0]).toHaveProperty('doctor');
      expect(EncryptionService.decryptData).toHaveBeenCalledWith('encrypted-note-1');
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error
      (prisma.note.findMany as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/api/patients/my-notes')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(500);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Internal server error');
    });
  });

  describe('POST /api/patients/check-in/:noteId/:planItemId', () => {
    const mockNoteId = 'note-1';
    const mockPlanItemId = 'plan-1';

    it('should record a check-in successfully', async () => {
      // Mock finding the plan item
      (prisma.planItem.findFirst as jest.Mock).mockResolvedValueOnce({
        id: mockPlanItemId,
        noteId: mockNoteId,
        action: 'Test action',
        checkIns: []
      });

      // Mock updating the plan item
      (prisma.planItem.update as jest.Mock).mockResolvedValueOnce({
        id: mockPlanItemId,
        checkIns: [new Date()]
      });

      const response = await request(app)
        .post(`/api/patients/check-in/${mockNoteId}/${mockPlanItemId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('Check-in recorded successfully');
    });

    it('should return 404 for non-existent plan item', async () => {
      // Mock plan item not found
      (prisma.planItem.findFirst as jest.Mock).mockResolvedValueOnce(null);

      const response = await request(app)
        .post(`/api/patients/check-in/${mockNoteId}/${mockPlanItemId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Note or plan item not found');
    });
  });

  describe('POST /api/patients/complete-task/:noteId/:taskId', () => {
    const mockNoteId = 'note-1';
    const mockTaskId = 'task-1';

    it('should complete a task successfully', async () => {
      // Mock finding the checklist item
      (prisma.checklistItem.findFirst as jest.Mock).mockResolvedValueOnce({
        id: mockTaskId,
        noteId: mockNoteId,
        task: 'Test task',
        completed: false
      });

      // Mock updating the checklist item
      (prisma.checklistItem.update as jest.Mock).mockResolvedValueOnce({
        id: mockTaskId,
        completed: true
      });

      const response = await request(app)
        .post(`/api/patients/complete-task/${mockNoteId}/${mockTaskId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('Task marked as completed');
    });

    it('should return 404 for non-existent checklist item', async () => {
      // Mock checklist item not found
      (prisma.checklistItem.findFirst as jest.Mock).mockResolvedValueOnce(null);

      const response = await request(app)
        .post(`/api/patients/complete-task/${mockNoteId}/${mockTaskId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Note or checklist item not found');
    });
  });

  describe('DELETE /api/patients/notes/:noteId', () => {
    const mockNoteId = 'note-1';

    it('should soft delete a note successfully', async () => {
      // Mock finding the note
      (prisma.note.findFirst as jest.Mock).mockResolvedValueOnce({
        id: mockNoteId,
        patientId: mockPatientId,
        deleted: false
      });

      // Mock updating the note
      (prisma.note.update as jest.Mock).mockResolvedValueOnce({
        id: mockNoteId,
        deleted: true
      });

      const response = await request(app)
        .delete(`/api/patients/notes/${mockNoteId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('Note deleted successfully');
    });

    it('should return 404 for non-existent note', async () => {
      // Mock note not found
      (prisma.note.findFirst as jest.Mock).mockResolvedValueOnce(null);

      const response = await request(app)
        .delete(`/api/patients/notes/${mockNoteId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Note not found');
    });
  });

  describe('DELETE /api/patients/check-in/:noteId/:planItemId', () => {
    const mockNoteId = 'note-1';
    const mockPlanItemId = 'plan-1';

    it('should soft delete a plan item successfully', async () => {
      // Mock finding the plan item
      (prisma.planItem.findFirst as jest.Mock).mockResolvedValueOnce({
        id: mockPlanItemId,
        noteId: mockNoteId,
        patientId: mockPatientId,
        deleted: false
      });

      // Mock updating the plan item
      (prisma.planItem.update as jest.Mock).mockResolvedValueOnce({
        id: mockPlanItemId,
        deleted: true
      });

      const response = await request(app)
        .delete(`/api/patients/check-in/${mockNoteId}/${mockPlanItemId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('Plan item deleted successfully');
    });

    it('should return 404 for non-existent plan item', async () => {
      // Mock plan item not found
      (prisma.planItem.findFirst as jest.Mock).mockResolvedValueOnce(null);

      const response = await request(app)
        .delete(`/api/patients/check-in/${mockNoteId}/${mockPlanItemId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Plan item not found');
    });
  });

  describe('DELETE /api/patients/tasks/:noteId/:taskId', () => {
    const mockNoteId = 'note-1';
    const mockTaskId = 'task-1';

    it('should soft delete a checklist item successfully', async () => {
      // Mock finding the checklist item
      (prisma.checklistItem.findFirst as jest.Mock).mockResolvedValueOnce({
        id: mockTaskId,
        noteId: mockNoteId,
        patientId: mockPatientId,
        deleted: false
      });

      // Mock updating the checklist item
      (prisma.checklistItem.update as jest.Mock).mockResolvedValueOnce({
        id: mockTaskId,
        deleted: true
      });

      const response = await request(app)
        .delete(`/api/patients/tasks/${mockNoteId}/${mockTaskId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('Task deleted successfully');
    });

    it('should return 404 for non-existent checklist item', async () => {
      // Mock checklist item not found
      (prisma.checklistItem.findFirst as jest.Mock).mockResolvedValueOnce(null);

      const response = await request(app)
        .delete(`/api/patients/tasks/${mockNoteId}/${mockTaskId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Task not found');
    });
  });
}); 