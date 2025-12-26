import { Request, Response, NextFunction } from 'express';
import Logger from '../common/logger';

export const loggingMiddleware = (module: string, action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    
    // Override the send method to capture the response status
    res.send = function (body: any) {
      // Call the original send method
      const result = originalSend.call(this, body);
      
      // Log the API request with status code
      Logger.logAPIRequest(req, res.statusCode, module, action).catch(err => {
        console.error('Logging middleware error:', err);
      });
      
      return result;
    };
    
    next();
  };
};

export const errorLoggingMiddleware = (module: string, action: string) => {
  return async (error: any, req: Request, res: Response, next: NextFunction) => {
    // Log the error
    await Logger.logError(error, req, module, action);
    
    // Continue with the error handling
    next(error);
  };
};

// Global error handler that logs all unhandled errors
export const globalErrorHandler = (error: any, req: Request, res: Response, next: NextFunction) => {
  // Log the error with details
  Logger.logError(error, req, 'GLOBAL', 'UNHANDLED_ERROR', 'Unhandled error occurred in application').catch(err => {
    console.error('Global error handler logging failed:', err);
  });
  
  // Send error response
  const statusCode = error.statusCode || error.status || 500;
  const message = error.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};