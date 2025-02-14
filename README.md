# Hospital Management System API

A secure hospital backend system with LLM-powered actionable steps.

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
- PostgreSQL with Prisma
- Google Gemini Pro for LLM processing
- JWT for authentication
- AES-256-CBC for end-to-end encryption

## Prerequisites

- Node.js (v18 or higher)
- Docker and Docker Compose
- PostgreSQL (if running without Docker)

## Getting Started

1. Clone the repository
2. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
3. Update the `.env` file with your configuration:
   - Set `API_URL` for your environment
   - Set `JWT_SECRET` for authentication
   - Set `ENCRYPTION_KEY` for data encryption
   - Set `GEMINI_API_KEY` for LLM integration
   - Update database credentials if needed

## Running the Application

### Using Docker (Recommended)

1. Build and start the containers:
   ```bash
   npm run backend:build
   npm run backend
   npm run backend:detach
   npm run backend:logs
   npm run backend:stop
   ```
2. The API will be available at the URL specified in your `API_URL` environment variable
3. API documentation will be at `${API_URL}/api-docs`

### Without Docker

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start PostgreSQL database

3. Run database migrations:
   ```bash
   npm run migrate
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Testing the API

### Using Swagger UI

1. Open `${API_URL}/api-docs` in your browser
2. The Swagger UI provides a complete API documentation and testing interface
3. Testing steps:
   - First, use the `/api/auth/signup` endpoint to create a new user
   - Then, use `/api/auth/login` to get a JWT token
   - Click the "Authorize" button at the top and enter your JWT token
   - Now you can test all other endpoints with authentication

### Using cURL or Postman

1. Create a new user:
   ```bash
   curl -X POST ${API_URL}/api/auth/signup \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Test User",
       "email": "test@example.com",
       "password": "password123",
       "role": "PATIENT"
     }'
   ```

2. Login to get JWT token:
   ```bash
   curl -X POST ${API_URL}/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "password123"
     }'
   ```

3. Use the JWT token for authenticated requests:
   ```bash
   curl -X GET ${API_URL}/api/patients/appointments \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

## API Endpoints

### Authentication
- POST `/api/auth/signup` - Register a new user
- POST `/api/auth/login` - Login user

### Doctors
- GET `/api/doctors/appointments` - Get doctor's appointments
- POST `/api/doctors/notes` - Submit medical notes
- GET `/api/doctors/patients` - Get doctor's patients

### Patients
- GET `/api/patients/appointments` - Get patient's appointments
- POST `/api/patients/appointments` - Schedule new appointment
- GET `/api/patients/doctors` - Get assigned doctors

## Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Development

- Use `npm run lint` to check for code style issues
- Use `npm run format` to format code
- Git hooks will automatically lint and format code before commits

## License

ISC 