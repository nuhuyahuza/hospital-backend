import swaggerJsdoc from 'swagger-jsdoc';
import { version } from '../package.json';
import path from 'path';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Hospital Management System API',
      version,
      description: 'API documentation for the Hospital Management System',
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:3003',
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      responses: {
        Unauthorized: {
          description: 'Authentication failed - invalid or missing token',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
        Forbidden: {
          description: 'Authorization failed - insufficient permissions',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
        NotFound: {
          description: 'The requested resource was not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
      },
      schemas: {
        User: {
          type: 'object',
          required: ['id', 'name', 'email', 'role'],
          properties: {
            id: { 
              type: 'string', 
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000'
            },
            name: { 
              type: 'string',
              example: 'John Doe'
            },
            email: { 
              type: 'string', 
              format: 'email',
              example: 'john@example.com'
            },
            role: { 
              type: 'string', 
              enum: ['PATIENT', 'DOCTOR'],
              example: 'PATIENT'
            },
            assignedDoctorId: {
              type: 'string',
              format: 'uuid',
              nullable: true,
              example: '123e4567-e89b-12d3-a456-426614174000'
            },
          },
        },
        Error: {
          type: 'object',
          required: ['status', 'message'],
          properties: {
            status: { 
              type: 'string', 
              example: 'error' 
            },
            message: { 
              type: 'string',
              example: 'Error message description'
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' }
                }
              }
            }
          },
        },
        Note: {
          type: 'object',
          required: ['id', 'encryptedNote', 'doctorId', 'patientId'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            encryptedNote: {
              type: 'string',
            },
            note: {
              type: 'string',
              description: 'Decrypted note content',
            },
            doctorId: {
              type: 'string',
              format: 'uuid',
            },
            patientId: {
              type: 'string',
              format: 'uuid',
            },
            deleted: {
              type: 'boolean',
              default: false,
              description: 'Indicates if the note has been soft deleted',
            },
            checklist: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/ChecklistItem',
              },
            },
            plan: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/PlanItem',
              },
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        ChecklistItem: {
          type: 'object',
          required: ['id', 'task'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            task: {
              type: 'string',
              example: 'Take medication',
            },
            completed: {
              type: 'boolean',
              default: false,
            },
            deleted: {
              type: 'boolean',
              default: false,
              description: 'Indicates if the checklist item has been soft deleted',
            },
            dueDate: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
          },
        },
        PlanItem: {
          type: 'object',
          required: ['id', 'action', 'frequency', 'duration', 'startDate'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            action: {
              type: 'string',
              example: 'Take 500mg paracetamol',
            },
            frequency: {
              type: 'string',
              example: 'twice daily',
            },
            duration: {
              type: 'integer',
              example: 7,
              description: 'Duration in days',
            },
            startDate: {
              type: 'string',
              format: 'date-time',
            },
            completed: {
              type: 'boolean',
              default: false,
            },
            deleted: {
              type: 'boolean',
              default: false,
              description: 'Indicates if the plan item has been soft deleted',
            },
            checkIns: {
              type: 'array',
              items: {
                type: 'string',
                format: 'date-time',
              },
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      {
        name: 'Authentication',
        description: 'API endpoints for user authentication'
      },
      {
        name: 'Doctors',
        description: 'API endpoints for doctor operations'
      },
      {
        name: 'Patients',
        description: 'API endpoints for patient operations'
      }
    ]
  },
  apis: [path.join(__dirname, './routes/*.js')],
};

export const swaggerSpec = swaggerJsdoc(options); 