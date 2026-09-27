'use client';
import { Check, Copy, ExternalLink, FileText, ListChecks, MessageCircle, PlayCircle, Send } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import type { SopItem } from '@/lib/team-life';

export function SopItemCard({ item }: { item: SopItem }) {
  return (
    <article className="card sop-item" id={`sop-${item.id}`}>
      <header className="sop-item-head">
        <span className="sop-kind" aria-hidden="true">
          {item.kind === 'template' ? <MessageCircle size={16} /> : item.kind === 'steps' ? <ListChecks size={16} /> : item.kind === 'link' ? <ExternalLink size={16} /> : <FileText size={16} />}
        </span>
        <h3>{item.title}</h3>
      </header>
      {item.kind === 'template' && <Template text={item.body} />}
      {item.kind === 'steps' && <Steps text={item.body} id={item.id} />}
      {(item.kind === 'link' || item.kind === 'file') && (
        <>
          {item.body && <p className="muted small" style={{ margin: '0 0 10px' }}>{item.body}</p>}
          {item.href ? (
            <a className="btn btn-ghost btn-sm" href={item.href} target="_blank" rel="noreferrer">
              {item.kind === 'file' ? <FileText size={14} aria-hidden="true" /> : <ExternalLink size={14} aria-hidden="true" />} {item.kind === 'file' ? 'Open file' : 'Open link'}
            </a>
          ) : (
            <span className="muted small">File unavailable.</span>
          )}
        </>
      )}
      {item.lesson && (
        <Link href={item.lesson.href} className="sop-lesson">
          <PlayCircle size={14} aria-hidden="true" /> Watch: {item.lesson.title}
        </Link>
      )}
    </article>
  );
}

function Template({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Older phones: fall back to a hidden textarea.
      const t = document.createElement('textarea');
      t.value = text;
      document.body.appendChild(t);
      t.select();
      document.execCommand('copy');
      t.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <>
      <p className="bubble sop-template">{text}</p>
      <div className="form-actions">
        <button type="button" className="btn btn-primary btn-sm" onClick={() => void copy()}>
          {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />} {copied ? 'Copied' : 'Copy'}
        </button>
        <a className="btn btn-ghost btn-sm" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">
          <Send size={14} aria-hidden="true" /> WhatsApp
        </a>
      </div>
    </>
  );
}

function Steps({ text, id }: { text: string; id: string }) {
  const steps = text.split('\n').map((s) => s.trim()).filter(Boolean);
  const [done, setDone] = useState<Set<number>>(new Set());
  return (
    <ol className="sop-steps">
      {steps.map((s, i) => (
        <li key={i}>
          <label>
            <input
              type="checkbox"
              checked={done.has(i)}
              onChange={() =>
                setDone((d) => {
                  const n = new Set(d);
                  if (n.has(i)) n.delete(i);
                  else n.add(i);
                  return n;
                })
              }
              aria-describedby={`${id}-${i}`}
            />
            <span id={`${id}-${i}`}>{s}</span>
          </label>
        </li>
      ))}
    </ol>
  );
}
