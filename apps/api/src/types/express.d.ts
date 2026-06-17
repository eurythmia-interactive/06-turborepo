import type { AuthenticatedUser } from '../auth/interfaces/token-payload.interface.js';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
