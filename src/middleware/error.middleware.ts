import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Always log the full error for debugging
  console.error('Full error details:', {
    name: err.name,
    message: err.message,
    stack: err.stack,
    error: err
  });

  // Set Content-Type header
  res.setHeader('Content-Type', 'application/json');

  // Handle known errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack,
        error: err
      })
    });
    return;
  }

  // Handle Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Handle unique constraint violations
    if (err.code === 'P2002') {
      res.status(400).json({
        status: 'error',
        message: 'A record with this value already exists.',
        ...(process.env.NODE_ENV === 'development' && {
          error: err
        })
      });
      return;
    }

    // Handle foreign key constraint violations
    if (err.code === 'P2003') {
      res.status(400).json({
        status: 'error',
        message: 'Related record not found.',
        ...(process.env.NODE_ENV === 'development' && {
          error: err
        })
      });
      return;
    }

    // Handle record not found
    if (err.code === 'P2001') {
      res.status(404).json({
        status: 'error',
        message: 'Record not found.',
        ...(process.env.NODE_ENV === 'development' && {
          error: err
        })
      });
      return;
    }
  }

  // Handle validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      status: 'error',
      message: 'Validation error',
      errors: err.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })),
      ...(process.env.NODE_ENV === 'development' && {
        error: err
      })
    });
    return;
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      status: 'error',
      message: 'Invalid token. Please log in again.',
      ...(process.env.NODE_ENV === 'development' && {
        error: err
      })
    });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      status: 'error',
      message: 'Your token has expired. Please log in again.',
      ...(process.env.NODE_ENV === 'development' && {
        error: err
      })
    });
    return;
  }

  // Handle all other errors
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode).json({
    status: 'error',
    message: process.env.NODE_ENV === 'development' 
      ? err.message 
      : 'Something went wrong. Please try again later.',
    ...(process.env.NODE_ENV === 'development' && {
      name: err.name,
      stack: err.stack,
      error: err
    })
  });
}; 