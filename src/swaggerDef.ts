export default {
  openapi: '3.0.0',
  info: {
    title: 'Hospital Backend API',
    version: '1.0.0',
    description: 'A secure hospital backend system with LLM-powered actionable steps',
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
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  tags: [
    {
      name: 'Auth',
      description: 'Authentication endpoints',
    },
    {
      name: 'Doctors',
      description: 'Doctor-related endpoints',
    },
    {
      name: 'Patients',
      description: 'Patient-related endpoints',
    },
  ],
} as const; 