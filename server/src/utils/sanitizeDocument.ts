// utils/sanitize.ts

type SanitizeOptions = {
  excludeFields?: string[];
  idField?: string; // default: "id"
};

/**
 * Sanitizes a Mongoose document by:
 * - converting _id to id
 * - removing sensitive/internal fields like password, __v
 *
 * @param doc Mongoose document or plain object
 * @param options Optional fields to exclude or customize
 * @returns Plain sanitized object
 */
export function sanitizeDocument<T>(doc: any, options: SanitizeOptions = {}): T {
  const {
    excludeFields = ['__v'],
    idField = 'id'
  } = options;

  const obj = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };

  const sanitized: Record<string, any> = {};

  for (const key in obj) {
    if (excludeFields.includes(key)) continue;

    if (key === '_id') {
      sanitized[idField] = obj[key].toString();
    } else {
      sanitized[key] = obj[key];
    }
  }

  return sanitized as T;
}
