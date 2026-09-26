import { IELTS_MOCKS } from '@/lib/data/ielts';
import MockClient from './view';

/** Every mock is known at build time, so all of them prerender in the static build. */
export function generateStaticParams() {
  return IELTS_MOCKS.map((m) => ({ id: m.id }));
}

export default function MockPage() {
  return <MockClient />;
}
