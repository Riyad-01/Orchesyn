'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/store/app';

export default function Root() {
  const { profile, loading } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(profile?.onboardingCompleted ? '/home' : '/onboarding');
  }, [loading, profile, router]);

  return null;
}
