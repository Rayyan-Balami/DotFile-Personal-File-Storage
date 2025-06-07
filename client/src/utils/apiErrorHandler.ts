
/**
 * Extracts field errors from API error response
 * @param error The error object from API response
 * @returns Object containing fieldName and errorMessage, or null if no field error
 */
export function extractFieldError(
  error: any
): { field: string; message: string } | null {
  try {
    const responseData = error.response?.data;

    // Check if the response has the expected error structure
    if (
      responseData?.errors &&
      Array.isArray(responseData.errors) &&
      responseData.errors.length > 0
    ) {
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
    return (
      responseData?.message ||
      "An unexpected error occurred. Please try again later."
    );
  } catch (e) {
    return "An unexpected error occurred. Please try again later.";
  }
}

/**
 * Gets all error messages from API response (for batch operations)
 * @param error The error object from API response
 * @returns Array of error messages
 */
export function getAllErrorMessages(error: any): string[] {
  try {
    const responseData = error.response?.data;
    const messages: string[] = [];

    // Add main message
    if (responseData?.message) {
      messages.push(responseData.message);
    }

    // Add field-specific errors
    if (responseData?.errors && Array.isArray(responseData.errors)) {
      responseData.errors.forEach((errorObj: Record<string, string>) => {
        Object.values(errorObj).forEach((msg) => {
          if (msg && !messages.includes(msg)) {
            messages.push(msg);
          }
        });
      });
    }

    return messages.length > 0
      ? messages
      : ["An unexpected error occurred. Please try again later."];
  } catch (e) {
    return ["An unexpected error occurred. Please try again later."];
  }
}

/**
 * Gets detailed error info for UI display
 * @param error The error object from API response
 * @returns Object with message, details, and field errors
 */
export function getDetailedErrorInfo(error: any): {
  message: string;
  details: string[];
  fieldErrors: { field: string; message: string }[];
} {
  try {
    const responseData = error.response?.data;
    const fieldErrors: { field: string; message: string }[] = [];
    const details: string[] = [];

    // Extract field errors
    if (responseData?.errors && Array.isArray(responseData.errors)) {
      responseData.errors.forEach((errorObj: Record<string, string>) => {
        Object.entries(errorObj).forEach(([field, message]) => {
          fieldErrors.push({ field, message });
          details.push(message);
        });
      });
    }

    const mainMessage =
      responseData?.message ||
      "An unexpected error occurred. Please try again later.";

    return {
      message: mainMessage,
      details: details.length > 0 ? details : [mainMessage],
      fieldErrors,
    };
  } catch (e) {
    const fallbackMessage =
      "An unexpected error occurred. Please try again later.";
    return {
      message: fallbackMessage,
      details: [fallbackMessage],
      fieldErrors: [],
    };
  }
}
