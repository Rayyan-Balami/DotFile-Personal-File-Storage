import { NextFunction, Request, Response } from 'express';
import { AnyZodObject, ZodEffects, ZodError } from 'zod';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Type that covers both plain Zod objects and refined schemas
type AnyZodSchema = AnyZodObject | ZodEffects<any, any, any>;

/**
 * Middleware that validates request data against a Zod schema
 * 
 * @param schema Zod schema to validate against
 * @param source Where to find the data to validate (body, query, params)
 */
export const validateData = (schema: AnyZodSchema, source: 'body' | 'query' | 'params' = 'body') => {
  return asyncHandler(async (req: Request, _: Response, next: NextFunction) => {
    try {
      // Validate the request data against the schema
      const data = await schema.parseAsync(req[source]);
      
      // Update request with validated and transformed data
      req[source] = data;
      
      next();
    } catch (error) {
      // Handle Zod validation errors
      if (error instanceof ZodError) {
        // Format Zod errors into a more user-friendly structure
        const errors = error.errors.map(err => {
          const path = err.path.join('.');
          return path ? `${path}: ${err.message}` : err.message;
        });
        
        // Throw ApiError for asyncHandler to catch
        throw new ApiError(400, 'Validation failed', errors);
      }
      
      // Re-throw other errors for asyncHandler to catch
      throw error;
    }
  });
};