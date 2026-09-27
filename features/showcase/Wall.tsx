'use client';
import { EyeOff, Sparkles, Trash2, Trophy } from 'lucide-react';
import { useState } from 'react';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { EmptyState } from '@/components/ui/primitives';
import { useAction } from '@/components/ui/useAction';
import { deletePost, hidePost, toggleReaction } from '@/features/team-life/actions';
import type { Challenge, ShowcasePost } from '@/lib/team-life';
import { PostForm } from './PostForm';

const EMOJIS = ['❤️', '🎀', '👏', '🔥'] as const;

export function Showcase({ current, posts, viewerId, isFaculty, demo }: { current: Challenge | null; posts: ShowcasePost[]; viewerId: string; isFaculty: boolean; demo: boolean }) {
  const [form, setForm] = useState<'challenge' | 'free' | null>(null);
  const [filter, setFilter] = useState<'all' | 'challenge'>('all');
  const shown = filter === 'challenge' && current ? posts.filter((p) => p.challengeId === current.id) : posts;
  const entries = current ? posts.filter((p) => p.challengeId === current.id).length : 0;
  const daysLeft = current?.daysLeft ?? 0;

  return (
    <>
      {current ? (
        <section className="card challenge-hero">
          <div className="small" style={{ fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase' }}>
            🎀 Wrap of the Week · {daysLeft === 0 ? 'last day' : `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`} · {entries} {entries === 1 ? 'entry' : 'entries'}
          </div>
          <h2>{current.title}</h2>
          {current.brief && <p style={{ margin: '0 0 14px', maxWidth: 620 }}>{current.brief}</p>}
          <div className="form-actions">
            <button type="button" className="btn btn-white" onClick={() => setForm('challenge')}>
              Enter the challenge · +40 XP
            </button>
            <button type="button" className="btn btn-glass" style={{ color: 'var(--ink)', borderColor: 'rgba(31,26,46,.3)' }} onClick={() => setForm('free')}>
              Share other work
            </button>
          </div>
        </section>
      ) : (
        <div className="form-actions">
          <button type="button" className="btn btn-primary" onClick={() => setForm('free')}>
            <Sparkles size={16} aria-hidden="true" /> Share your work
          </button>
          <span className="muted small">No Wrap of the Week running right now.</span>
        </div>
      )}

      {form && <PostForm viewerId={viewerId} demo={demo} challenge={form === 'challenge' && current ? { id: current.id, title: current.title } : null} onDone={() => setForm(null)} />}

      {current && (
        <div className="seg" role="group" aria-label="Filter the wall" style={{ alignSelf: 'flex-start' }}>
          <button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
            Everything
          </button>
          <button type="button" aria-pressed={filter === 'challenge'} onClick={() => setFilter('challenge')}>
            This week’s entries
          </button>
        </div>
      )}

      {shown.length === 0 ? (
        <div className="card">
          <EmptyState icon={Sparkles} title="The wall is empty" body="Be the first to share a wrap you’re proud of." />
        </div>
      ) : (
        <div className="wall">
          {shown.map((p) => (
            <PostCard key={p.id} post={p} mine={p.authorId === viewerId} isFaculty={isFaculty} />
          ))}
        </div>
      )}
    </>
  );
}

function PostCard({ post, mine, isFaculty }: { post: ShowcasePost; mine: boolean; isFaculty: boolean }) {
  const [reactions, setReactions] = useState(post.reactions);
  const act = useAction();
  const react = (e: string) => {
    const cur = reactions[e] ?? { count: 0, mine: false };
    const on = !cur.mine;
    setReactions((r) => ({ ...r, [e]: { count: cur.count + (on ? 1 : -1), mine: on } }));
    void toggleReaction({ postId: post.id, emoji: e, on }).then((res) => {
      if (!res.ok) setReactions((r) => ({ ...r, [e]: cur }));
    });
  };
  return (
    <article className="card post" style={post.isHidden ? { opacity: 0.5 } : undefined}>
      <div style={{ position: 'relative' }}>
        {post.photoUrls.length ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.photoUrls[0]} alt={post.caption || `Wrap by ${post.author}`} loading="lazy" />
        ) : (
          <div className="ph" aria-hidden="true">
            🎁
          </div>
        )}
        {post.isWinner && (
          <span className="winner-ribbon">
            <Trophy size={12} aria-hidden="true" /> Wrap of the Week
          </span>
        )}
      </div>
      <div className="post-body">
        {post.photoUrls.length > 1 && (
          <div className="photos" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {post.photoUrls.slice(1).map((u, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={u} src={u} alt={`More from ${post.author} ${i + 2}`} loading="lazy" />
            ))}
          </div>
        )}
        <div>
          <b>{post.author}</b>
          {post.isHidden && <span className="chip off" style={{ marginLeft: 6 }}>Hidden</span>}
          {post.caption && <p style={{ margin: '2px 0 0' }}>{post.caption}</p>}
        </div>
        <div className="react-row" role="group" aria-label="Reactions">
          {EMOJIS.map((e) => {
            const r = reactions[e] ?? { count: 0, mine: false };
            return (
              <button key={e} type="button" className="react" aria-pressed={r.mine} aria-label={`${e} ${r.count}`} onClick={() => react(e)}>
                {e} {r.count > 0 && r.count}
              </button>
            );
          })}
          <span style={{ flex: 1 }} />
          {isFaculty && !mine && (
            <button type="button" className="icon-sm" aria-label={post.isHidden ? 'Show post' : 'Hide post'} title={post.isHidden ? 'Show' : 'Hide'} onClick={() => act.run(() => hidePost({ id: post.id, hidden: !post.isHidden }))}>
              <EyeOff size={15} />
            </button>
          )}
          {mine && (
            <ConfirmButton label="Delete my post" title="Delete this post?" body="The photos are removed from the wall." confirmLabel="Delete" onConfirm={() => act.run(() => deletePost({ id: post.id }))}>
              <Trash2 size={15} />
            </ConfirmButton>
          )}
        </div>
        {act.error && <span className="small" style={{ color: 'var(--red-deep)' }}>{act.error}</span>}
      </div>
    </article>
  );
}
