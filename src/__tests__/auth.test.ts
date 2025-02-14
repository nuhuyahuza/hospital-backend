// import request from 'supertest';
// import mongoose from 'mongoose';
// import { MongoMemoryServer } from 'mongodb-memory-server';
// import app from '../index';
// import { User } from '../models/user.model';

// let mongoServer: MongoMemoryServer;

// beforeAll(async () => {
//   mongoServer = await MongoMemoryServer.create();
//   await mongoose.connect(mongoServer.getUri());
// });

// afterAll(async () => {
//   await mongoose.disconnect();
//   await mongoServer.stop();
// });

// beforeEach(async () => {
//   await User.deleteMany({});
// });

// describe('Authentication', () => {
//   describe('POST /api/auth/signup', () => {
//     it('should create a new patient', async () => {
//       const response = await request(app)
//         .post('/api/auth/signup')
//         .send({
//           name: 'Test Patient',
//           email: 'patient@test.com',
//           password: 'password123',
//           role: 'patient',
//         });

//       expect(response.status).toBe(201);
//       expect(response.body.data.user).toHaveProperty('name', 'Test Patient');
//       expect(response.body.data.user).toHaveProperty('email', 'patient@test.com');
//       expect(response.body.data.user).toHaveProperty('role', 'patient');
//       expect(response.body.data).toHaveProperty('token');
//     });

//     it('should create a new doctor', async () => {
//       const response = await request(app)
//         .post('/api/auth/signup')
//         .send({
//           name: 'Test Doctor',
//           email: 'doctor@test.com',
//           password: 'password123',
//           role: 'doctor',
//         });

//       expect(response.status).toBe(201);
//       expect(response.body.data.user).toHaveProperty('name', 'Test Doctor');
//       expect(response.body.data.user).toHaveProperty('email', 'doctor@test.com');
//       expect(response.body.data.user).toHaveProperty('role', 'doctor');
//       expect(response.body.data).toHaveProperty('token');
//     });

//     it('should not allow duplicate emails', async () => {
//       await request(app)
//         .post('/api/auth/signup')
//         .send({
//           name: 'Test User',
//           email: 'test@test.com',
//           password: 'password123',
//           role: 'patient',
//         });

//       const response = await request(app)
//         .post('/api/auth/signup')
//         .send({
//           name: 'Test User 2',
//           email: 'test@test.com',
//           password: 'password123',
//           role: 'patient',
//         });

//       expect(response.status).toBe(400);
//       expect(response.body).toHaveProperty('message', 'Email already exists');
//     });
//   });

//   describe('POST /api/auth/login', () => {
//     beforeEach(async () => {
//       await request(app)
//         .post('/api/auth/signup')
//         .send({
//           name: 'Test User',
//           email: 'test@test.com',
//           password: 'password123',
//           role: 'patient',
//         });
//     });

//     it('should login with correct credentials', async () => {
//       const response = await request(app)
//         .post('/api/auth/login')
//         .send({
//           email: 'test@test.com',
//           password: 'password123',
//         });

//       expect(response.status).toBe(200);
//       expect(response.body.data.user).toHaveProperty('name', 'Test User');
//       expect(response.body.data.user).toHaveProperty('email', 'test@test.com');
//       expect(response.body.data).toHaveProperty('token');
//     });

//     it('should not login with incorrect password', async () => {
//       const response = await request(app)
//         .post('/api/auth/login')
//         .send({
//           email: 'test@test.com',
//           password: 'wrongpassword',
//         });

//       expect(response.status).toBe(401);
//       expect(response.body).toHaveProperty('message', 'Invalid email or password');
//     });

//     it('should not login with non-existent email', async () => {
//       const response = await request(app)
//         .post('/api/auth/login')
//         .send({
//           email: 'nonexistent@test.com',
//           password: 'password123',
//         });

//       expect(response.status).toBe(401);
//       expect(response.body).toHaveProperty('message', 'Invalid email or password');
//     });
//   });
// }); 