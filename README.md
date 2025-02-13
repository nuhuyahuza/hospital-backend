# Hospital Backend System

A secure Node.js backend system for hospitals that handles user management, patient-doctor assignments, and note management with LLM-powered actionable steps extraction.

## Features

- User authentication (patients and doctors)
- End-to-end encrypted patient notes
- Patient-doctor assignments
- LLM-powered actionable steps extraction from doctor notes
- Dynamic scheduling and reminders
- Secure API endpoints

## Tech Stack

- Node.js with TypeScript
- Express.js
- MongoDB with Mongoose
- Google Gemini Pro for LLM processing
- JWT for authentication
- AES-256-CBC for end-to-end encryption

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- Google Cloud account with Gemini API access

## Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd hospital-backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory:
   ```
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/hospital-backend
   JWT_SECRET=your-super-secret-jwt-key
   GEMINI_API_KEY=your-gemini-api-key
   ENCRYPTION_KEY=your-32-byte-encryption-key
   ```

4. Build the project:
   ```bash
   npm run build
   ```

5. Start the server:
   ```bash
   npm start
   ```

For development:
```bash
npm run dev
```

## API Documentation

### Authentication

#### POST /api/auth/signup
Register a new user (patient or doctor)
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "patient"
}
```

#### POST /api/auth/login
Login with email and password
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

### Patient Endpoints

#### GET /api/patients/doctors
Get list of available doctors

#### POST /api/patients/select-doctor/:doctorId
Select a doctor

#### GET /api/patients/my-doctor
Get current assigned doctor

#### GET /api/patients/my-notes
Get patient's notes and actionable steps

#### POST /api/patients/check-in/:noteId/:planItemId
Record a check-in for a plan item

#### POST /api/patients/complete-task/:noteId/:taskId
Mark a checklist item as completed

### Doctor Endpoints

#### GET /api/doctors/patients
Get list of assigned patients

#### POST /api/doctors/patients/:patientId/notes
Submit a note for a patient
```json
{
  "note": "Patient shows symptoms of..."
}
```

#### GET /api/doctors/patients/:patientId/notes
Get all notes for a specific patient

## Security

- Passwords are hashed using bcrypt
- Patient notes are encrypted using AES-256-CBC
- JWT tokens for authentication
- Role-based access control
- Input validation and sanitization

## Testing

Run the test suite:
```bash
npm test
```

## License

ISC 