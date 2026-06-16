import { BadRequestException } from '@nestjs/common';

export class ValidationException extends BadRequestException {
  constructor(public readonly errors: Record<string, string[]>) {
    super({
      statusCode: 400,
      message: 'Validation failed',
      errors,
    });
  }
}
