import { Injectable, type PipeTransform, type ArgumentMetadata } from '@nestjs/common';
import type { ZodType, ZodIssue } from 'zod';
import { ValidationException } from '../exceptions/validation.exception.js';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema?: ZodType) {}

  transform(value: unknown, _metadata: ArgumentMetadata) {
    if (!this.schema) {
      return value;
    }

    const result = this.schema.safeParse(value);

    if (!result.success) {
      const errors = this.mapZodErrors(result.error.issues);
      throw new ValidationException(errors);
    }

    return result.data;
  }

  private mapZodErrors(issues: ZodIssue[]): Record<string, string[]> {
    const errors: Record<string, string[]> = {};

    for (const issue of issues) {
      const path = issue.path.join('.') || 'root';
      if (!errors[path]) {
        errors[path] = [];
      }
      errors[path].push(issue.message);
    }

    return errors;
  }
}
