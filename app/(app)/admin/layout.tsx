import { requireFacultyPage } from '@/lib/admin';

/** Admin area: faculty only. Individual pages narrow this to admins where needed. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireFacultyPage();
  return children;
}
