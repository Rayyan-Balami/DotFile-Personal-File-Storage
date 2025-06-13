// Import necessary types and helpers
import { ApiError } from "@utils/apiError.utils.js";
import { asyncHandler } from "@utils/asyncHandler.utils.js";
import { NextFunction, Request, Response } from "express";
import { AnyZodObject, ZodEffects, ZodError } from "zod";

// Type alias that includes regular and transformed Zod schemas
type AnyZodSchema = AnyZodObject | ZodEffects<any, any, any>;

/**
 * Middleware to validate request data using a Zod schema.
 *
 * @param schema - The Zod schema used for validation
 * @param source - The part of the request to validate: 'body', 'query', or 'params' (default: 'body')
 */
export const validateData = (
  schema: AnyZodSchema,
  source: "body" | "query" | "params" = "body"
) => {
  return asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Validate the request data using the provided schema
        const data = await schema.parseAsync(req[source]);

        // For body and params, we can overwrite with validated data
        // For query, we just validate without overwriting since it's read-only
        if (source !== "query") {
          req[source] = data;
        }

        // Move to the next middleware or route
        next();
      } catch (error) {
        // Handle validation errors thrown by Zod
        if (error instanceof ZodError) {
          // Convert error list to a readable format
          const formattedErrors = error.errors.map((err) => {
            const path = err.path.join(".");
            return `${path ? path + ": " : ""}${err.message}`;
          });

          // Create a structured array of field-specific error messages
          const validationErrors = formattedErrors.reduce(
            (acc, error) => {
              const [field, message] = error.includes(": ")
                ? error.split(": ", 2)
                : ["validation", error];
              return [...acc, { [field]: message }];
            },
            [] as Record<string, string>[]
          );

          // Construct and pass a custom API error
          const apiError = new ApiError(400, validationErrors);
          next(apiError);
        } else {
          // For non-Zod errors, forward to the global error handler
          next(error);
        }
      }
    }
  );
};
