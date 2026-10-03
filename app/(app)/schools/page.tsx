import type { Metadata } from 'next';
import { PageHeader } from '@/components/shell/PageHeader';
import { CourseGrid } from '@/features/courses/CourseGrid';
import { getCourseCards } from '@/lib/data';

export const metadata: Metadata = { title: 'Schools' };

export default async function SchoolsPage({ searchParams }: { searchParams: Promise<{ school?: string }> }) {
  const { school } = await searchParams;
  const { schools, cards } = await getCourseCards();
  return (
    <div className="page">
      <PageHeader title="Schools" crumbs={[{ label: 'Home', href: '/' }, { label: 'Schools' }]} />
      <CourseGrid schools={schools} cards={cards} initialSchool={schools.some((s) => s.slug === school) ? school! : null} />
    </div>
  );
}
