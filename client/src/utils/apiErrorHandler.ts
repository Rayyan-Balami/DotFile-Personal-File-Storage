type ApiError = {
  success: boolean;
  statusCode: number;
  message: string;
  errors?: Array<Record<string, string>>;
  timestamp: string;
};

/**
 * Extracts field errors from API error response
 * @param error The error object from API response
 * @returns Object containing fieldName and errorMessage, or null if no field error
 */
export function extractFieldError(error: any): { field: string; message: string } | null {
  try {
    const responseData = error.response?.data;
    
    // Check if the response has the expected error structure
    if (responseData?.errors && Array.isArray(responseData.errors) && responseData.errors.length > 0) {
      const errorObject = responseData.errors[0];
      const errorField = Object.keys(errorObject)[0];
      const errorMessage = errorObject[errorField];
      
      if (errorField && errorMessage) {
        return { field: errorField, message: errorMessage };
      }
    }
    
    // Return general error message if no field error
    return null;
  } catch (e) {
    console.error("Error parsing API error response", e);
    return null;
  }
}

/**
 * Gets general error message from API response
 * @param error The error object from API response
 * @returns A general error message
 */
export function getErrorMessage(error: any): string {
  try {
    const responseData = error.response?.data;
    return responseData?.message || "An unexpected error occurred. Please try again later.";
  } catch (e) {
    return "An unexpected error occurred. Please try again later.";
  }
}
