import {
  Injectable,
  type NestInterceptor,
  type ExecutionContext,
  type CallHandler,
} from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { ZodType } from 'zod';

export const RESPONSE_SCHEMA_METADATA = 'RESPONSE_SCHEMA_METADATA';

export const UseResponseSchema = (schema: ZodType) =>
  Reflect.defineMetadata(RESPONSE_SCHEMA_METADATA, schema, schema.constructor);

@Injectable()
export class SerializeInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const handler = context.getHandler();
    const schema = this.reflector.get<ZodType | undefined>(RESPONSE_SCHEMA_METADATA, handler);

    if (!schema) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        const result = schema.safeParse(data);
        if (!result.success) {
          console.warn('Response serialization failed:', result.error.issues);
          return data;
        }
        return result.data;
      }),
    );
  }
}
