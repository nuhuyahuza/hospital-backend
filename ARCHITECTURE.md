# Hospital Management System - Architecture Documentation

## Overview
This document outlines the key architectural decisions made in the Hospital Management System, explaining the rationale behind each choice and its implications for security, scalability, and maintainability.

## Table of Contents
1. [Authentication & Authorization](#authentication--authorization)
2. [Data Security & Encryption](#data-security--encryption)
3. [Database Design](#database-design)
4. [API Design](#api-design)
5. [Task Management & Scheduling](#task-management--scheduling)
6. [AI Integration](#ai-integration)
7. [Testing Strategy](#testing-strategy)

## Authentication & Authorization

### JWT-Based Authentication
- **Implementation**: Uses JSON Web Tokens (JWT) for stateless authentication
- **Benefits**:
  - Scalable across multiple servers without shared session storage
  - Reduced database load (no session queries)
  - Self-contained tokens with built-in expiration
- **Security Measures**:
  - Tokens are signed with a secure secret key
  - Short expiration times to minimize token theft risk
  - Refresh token rotation for extended sessions

### Role-Based Access Control (RBAC)
- **Roles**: 
  - `DOCTOR`: Can create and manage patient notes
  - `PATIENT`: Can view their own notes and manage their care plan
- **Implementation**: 
  - Middleware-based role checks (`restrictTo` middleware)
  - Database-level relationships enforce data access boundaries
- **Benefits**:
  - Clear separation of concerns
  - Easy to extend with new roles
  - Consistent access control across all endpoints

## Data Security & Encryption

### Medical Data Encryption
- **Strategy**: End-to-end encryption for all medical notes
- **Implementation**:
  - AES-256-CBC encryption for all medical notes
  - Unique IV (Initialization Vector) for each encryption
  - Encryption key stored securely in environment variables
- **Benefits**:
  - Compliant with healthcare data protection regulations
  - Protection against data breaches
  - Secure data at rest

### Key Management
- **Implementation**:
  - 256-bit encryption keys in hex format
  - Keys stored in environment variables
  - Key rotation capability built into the design
- **Validation**:
  - Automatic key format validation on startup
  - Built-in test methods to verify encryption functionality

## Database Design

### Schema Design
- **Core Entities**:
  - Users (Doctors & Patients)
  - Medical Notes
  - Checklist Items
  - Plan Items
- **Relationships**:
  - Many-to-one between patients and doctors
  - One-to-many between notes and actionable items
  - Soft deletion for all entities

### Soft Deletion Strategy
- **Implementation**:
  - `deleted` boolean field on all major entities
  - Indexes on `deleted` fields for query performance
  - Cascade soft deletes for related entities
- **Benefits**:
  - Data audit capability
  - Recoverable deletions
  - Maintains referential integrity

## API Design

### RESTful Architecture
- **Design Principles**:
  - Resource-oriented endpoints
  - Consistent error handling
  - Proper HTTP method usage
- **Documentation**:
  - OpenAPI/Swagger specification
  - Detailed endpoint descriptions
  - Example requests and responses

### Error Handling
- **Implementation**:
  - Centralized error handling middleware
  - Custom `AppError` class for application errors
  - Detailed error messages in development
  - Sanitized errors in production
- **Categories**:
  - Authentication errors (401)
  - Authorization errors (403)
  - Resource not found (404)
  - Validation errors (400)
  - Server errors (500)

## Task Management & Scheduling

### Reminder System
- **Implementation**:
  - Node-cron based scheduler
  - Hourly checks for pending tasks
  - Automatic task completion tracking
- **Features**:
  - Frequency-based reminders
  - Check-in tracking
  - Duration management
- **Scalability**:
  - Designed for distributed execution
  - Non-blocking operations
  - Error resilient

### Action Items Processing
- **Implementation**:
  - AI-powered extraction of actionable items
  - Structured format for tasks and plans
  - Automatic due date calculation
- **Benefits**:
  - Consistent task formatting
  - Easy to track and manage
  - Automated workflow

## AI Integration

### LLM Service
- **Implementation**:
  - Google's Gemini Pro model
  - Structured prompt engineering
  - Error-resilient processing
- **Features**:
  - Medical note analysis
  - Action item extraction
  - Standardized output format
- **Benefits**:
  - Consistent task extraction
  - Reduced manual work
  - Improved accuracy

### Error Handling
- **Implementation**:
  - Robust error handling for API failures
  - Fallback mechanisms
  - Detailed logging for debugging
- **Benefits**:
  - System reliability
  - Maintainable code
  - Easy troubleshooting

## Testing Strategy

### Unit Testing
- **Coverage**:
  - Services
  - Middleware
  - Utilities
- **Tools**:
  - Jest for test runner
  - Supertest for API testing
  - Mock implementations for external services

### Integration Testing
- **Coverage**:
  - API endpoints
  - Database operations
  - Authentication flows
- **Implementation**:
  - Isolated test database
  - Automated test data seeding
  - Cleanup after tests

### Environment Management
- **Implementation**:
  - Separate test environment
  - Environment-specific configurations
  - CI/CD integration
- **Benefits**:
  - Reliable test execution
  - Consistent test environment
  - Easy local development

## Future Considerations

### Scalability
- Implement caching layer for frequently accessed data
- Add rate limiting for API endpoints
- Consider message queue for background tasks

### Security
- Implement regular key rotation
- Add API request signing
- Enhance audit logging

### Features
- Real-time notifications
- Analytics dashboard

## Conclusion
This architecture is designed to provide a secure, scalable, and maintainable system for managing hospital operations. The choices made prioritize data security, system reliability, and ease of maintenance while providing a solid foundation for future enhancements. 