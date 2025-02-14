import request from 'supertest';
import { UserRole } from '@prisma/client';
import app from '../index';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';

jest.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn()
    },
    $connect: jest.fn(),
    $disconnect: jest.fn()
  }
}));

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockUser = {
        id: 'test-id',
        email: 'test@example.com',
        password: await bcrypt.hash('password123', 10),
        role: UserRole.DOCTOR,
        name: 'Test User'
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(mockUser);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role
      });
    });
  });
}); 