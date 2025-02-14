module.exports = {
  openapi: '3.0.0',
  info: {
    title: 'Hospital Backend API',
    version: '1.0.0',
    description: 'A secure hospital backend system with LLM-powered actionable steps',
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server',
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
}; 