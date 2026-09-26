'use client';

import { Suspense } from 'react';
import ReportClient from './view';

/** Suspense is required around useSearchParams for static prerendering. */
export default function Page() {
  return (
    <Suspense fallback={null}>
      <ReportClient />
    </Suspense>
  );
}
