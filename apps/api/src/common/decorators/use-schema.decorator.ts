import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { ZodType } from 'zod';

export const SCHEMA_KEY = 'custom:schema';

export function UseSchema(schema: ZodType) {
  return function (target: any, propertyKey: string | symbol, parameterIndex: number) {
    const existingSchemas = Reflect.getMetadata(SCHEMA_KEY, target, propertyKey) || [];
    existingSchemas[parameterIndex] = schema;
    Reflect.defineMetadata(SCHEMA_KEY, existingSchemas, target, propertyKey);
  };
}

export const getSchemaForParameter = (
  target: any,
  propertyKey: string | symbol,
  parameterIndex: number,
): ZodType | undefined => {
  const schemas = Reflect.getMetadata(SCHEMA_KEY, target, propertyKey);
  return schemas?.[parameterIndex];
};
