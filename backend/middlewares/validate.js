import { AppError } from "../utils/errors.js";

/**
 * Express middleware that validates req.body against a Zod schema.
 * On failure, throws an AppError(400) with the first validation message.
 */
export function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.issues[0]?.message || "Datos inválidos";
      return next(new AppError(400, message));
    }
    req.body = result.data;
    next();
  };
}
