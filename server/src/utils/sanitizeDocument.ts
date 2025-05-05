// utils/sanitize.ts

type SanitizeOptions = {
  excludeFields?: string[];
  includeFields?: string[]; // Only include these fields if specified
  idField?: string; // default: "id"
  recursive?: boolean; // default: true - whether to sanitize nested objects
};

/**
 * Sanitizes a Mongoose document by:
 * - converting _id to id
 * - removing sensitive/internal fields like password, __v
 * - handling nested documents and populated fields
 *
 * @param doc Mongoose document or plain object
 * @param options Optional fields to exclude or customize
 * @returns Plain sanitized object
 */
export function sanitizeDocument<T>(
  doc: any,
  options: SanitizeOptions = {}
): T {
  const {
    excludeFields = ["__v"],
    includeFields = [], // Empty means include all non-excluded fields
    idField = "id",
    recursive = true,
  } = options;

  if (!doc) return null as any;

  // Handle arrays by mapping each item
  if (Array.isArray(doc)) {
    return doc.map((item) =>
      sanitizeDocument(item, {
        ...options,
        // Pass down the same options to nested items
        excludeFields,
        includeFields,
        idField,
        recursive,
      })
    ) as any;
  }

  const obj = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
  const sanitized: Record<string, any> = {};

  // Process fields
  for (const key in obj) {
    // Skip excluded fields
    if (excludeFields.includes(key)) continue;

    // If includeFields has items, only include specified fields
    if (
      includeFields.length > 0 &&
      !includeFields.includes(key) &&
      key !== "_id"
    )
      continue;

    if (key === "_id") {
      // Convert _id to id string
      sanitized[idField] = obj[key].toString();
    } else if (obj[key] instanceof Date) {
      // Properly format dates as ISO strings instead of empty objects
      sanitized[key] = obj[key].toISOString();
    } else if (recursive && obj[key] && typeof obj[key] === "object") {
      // Recursively sanitize nested objects and arrays
      if (Array.isArray(obj[key])) {
        sanitized[key] = obj[key].map((item: any) =>
          item && typeof item === "object"
            ? sanitizeDocument(item, {
                excludeFields,
                includeFields,
                idField,
                recursive,
              })
            : item
        );
      } else {
        sanitized[key] = sanitizeDocument(obj[key], {
          excludeFields,
          includeFields,
          idField,
          recursive,
        });
      }
    } else {
      // Copy primitive values as-is
      sanitized[key] = obj[key];
    }
  }

  return sanitized as T;
}
