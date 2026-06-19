import { SetMetadata } from '@nestjs/common';

export const REQUIRE_ANY_PERMISSION_KEY = 'requireAnyPermission';

export const RequireAnyPermission = (...permissions: string[]) =>
  SetMetadata(REQUIRE_ANY_PERMISSION_KEY, permissions);
