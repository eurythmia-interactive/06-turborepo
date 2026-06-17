import { cookies } from 'next/headers';

export interface Session {
  accessToken: string;
  refreshToken?: string;
  userId?: string;
  email?: string;
  role?: string;
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();

  const accessToken = cookieStore.get('access_token');
  if (!accessToken?.value) {
    return null;
  }

  const refreshToken = cookieStore.get('refresh_token');
  const userId = cookieStore.get('user_id');
  const email = cookieStore.get('user_email');
  const role = cookieStore.get('user_role');

  return {
    accessToken: accessToken.value,
    refreshToken: refreshToken?.value,
    userId: userId?.value,
    email: email?.value,
    role: role?.value,
  };
}

export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session !== null;
}
