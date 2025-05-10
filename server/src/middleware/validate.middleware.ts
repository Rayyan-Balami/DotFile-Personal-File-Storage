import { NextFunction, Request, Response } from 'express';
import { AnyZodObject, ZodEffects, ZodError } from 'zod';
import { ApiError } from '@utils/apiError.utils.js';
import { asyncHandler } from '@utils/asyncHandler.utils.js';

// Type that covers both plain Zod objects and refined schemas
type AnyZodSchema = AnyZodObject | ZodEffects<any, any, any>;

/**
 * Middleware that validates request data against a Zod schema
 * 
 * @param schema Zod schema to validate against
 * @param source Where to find the data to validate (body, query, params)
 */
export const validateData = (schema: AnyZodSchema, source: 'body' | 'query' | 'params' = 'body') => {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
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
        const formattedErrors = error.errors.map(err => {
          const path = err.path.join('.');
          return `${path ? path + ': ' : ''}${err.message}`;
        });
        
        // Create an ApiError instance for consistent error handling
        const validationErrors = formattedErrors.reduce((acc, error) => {
          const [field, message] = error.includes(': ') 
            ? error.split(': ', 2) 
            : ['validation', error];
          return [...acc, { [field]: message }];
        }, [] as Record<string, string>[]);
        
        const apiError = new ApiError(400, validationErrors);
        
        // Pass to error handler for consistent formatting
        next(apiError);
      } else {
        // Pass other errors to the error handler
        next(error);
      }
    }
  });
};