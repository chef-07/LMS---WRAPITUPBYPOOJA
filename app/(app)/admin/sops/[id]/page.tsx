import { Trash2 } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/shell/PageHeader';
import { DeleteFolder } from '@/features/sops/DeleteFolder';
import { FolderForm } from '@/features/sops/FolderForm';
import { ItemList } from '@/features/sops/ItemEditor';
import { requireAdminPage } from '@/lib/admin';
import { getLessonOptions, getSopLibrary } from '@/lib/team-life';

export const metadata: Metadata = { title: 'Edit folder' };

export default async function AdminSopFolderPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const id = (await params).id;
  const [folders, lessons] = await Promise.all([getSopLibrary(), getLessonOptions()]);
  const folder = folders.find((f) => f.id === id);
  if (!folder) notFound();
  return (
    <div className="page">
      <PageHeader title={`${folder.emoji} ${folder.title}`} crumbs={[{ label: 'Home', href: '/' }, { label: 'SOP library', href: '/admin/sops' }, { label: folder.title }]} />
      <div className="content">
        <ItemList folderId={folder.id} items={folder.items} lessons={lessons} />
        <aside className="col rail">
          <section className="card">
            <h2 style={{ marginTop: 0, fontSize: 16 }}>Folder settings</h2>
            <FolderForm initial={{ id: folder.id, title: folder.title, emoji: folder.emoji, description: folder.description, departments: folder.departments }} />
            <hr style={{ border: 0, borderTop: '1px solid var(--hair)', margin: '18px 0 12px' }} />
            <DeleteFolder id={folder.id} title={folder.title} count={folder.items.length}>
              <Trash2 size={14} aria-hidden="true" /> Delete folder
            </DeleteFolder>
          </section>
        </aside>
      </div>
    </div>
  );
}
