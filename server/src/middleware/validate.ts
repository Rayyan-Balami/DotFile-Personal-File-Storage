import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError, ZodEffects, z } from 'zod';
import { ApiError } from '../utils/apiError.js';

// Type that covers both plain Zod objects and refined schemas
type AnyZodSchema = AnyZodObject | ZodEffects<any, any, any>;

/**
 * Middleware that validates request data against a Zod schema
 * 
 * @param schema Zod schema to validate against
 * @param source Where to find the data to validate (body, query, params)
 */
export const validate = (schema: AnyZodSchema, source: 'body' | 'query' | 'params' = 'body') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate the request data against the schema
      const data = await schema.parseAsync(req[source]);
      
      // Update request with validated and transformed data
      req[source] = data;
      
      return next();
    } catch (error) {
      // Handle Zod validation errors
      if (error instanceof ZodError) {
        // Format Zod errors into a more user-friendly structure
        const errors = error.errors.map(err => {
          const path = err.path.join('.');
          return path ? `${path}: ${err.message}` : err.message;
        });
        
        // Pass to error handler as ApiError
        return next(new ApiError(400, 'Validation failed', errors));
      }
      
      // Pass other errors to error handler
      return next(error);
    }
  };
};

export default validate;