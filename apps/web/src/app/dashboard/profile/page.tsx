import type { Metadata } from 'next';
import { getMockProfile } from '@/lib/mock-data';
import { ProfileForm } from '@/components/forms/profile-form';

export const metadata: Metadata = {
  title: 'Profile',
};

export default async function ProfilePage() {
  const profile = await getMockProfile();

  return <ProfileForm initialProfile={profile} />;
}
