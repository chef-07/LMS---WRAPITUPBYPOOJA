import type { Metadata } from 'next';
import { PageHeader } from '@/components/shell/PageHeader';
import { NewSkillForm, SkillList, SkillMatrix } from '@/features/university/SkillMatrix';
import { requireFacultyPage } from '@/lib/admin';
import { getSkillMatrix } from '@/lib/university';

export const metadata: Metadata = { title: 'Skill matrix' };

export default async function SkillsPage() {
  const viewer = await requireFacultyPage();
  const { skills, people, cells, courses } = await getSkillMatrix();
  const isAdmin = viewer.role === 'admin';
  return (
    <div className="page">
      <PageHeader title="Skill matrix" crumbs={[{ label: 'Home', href: '/' }, { label: 'Skill matrix' }]} />
      <div className="content">
        <div className="col">
          <SkillMatrix skills={skills} people={people} cells={cells} canEdit={isAdmin} />
        </div>
        <aside className="col rail">
          {isAdmin && <NewSkillForm courses={courses} />}
          {isAdmin && <SkillList skills={skills} courses={courses} />}
          <p className="muted small" style={{ margin: 0 }}>
            Use this in peak season to see who can take which orders on their own. Sign someone off after you have watched them do it well.
          </p>
        </aside>
      </div>
    </div>
  );
}
