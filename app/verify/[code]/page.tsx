import { BadgeCheck, Download, SearchX } from 'lucide-react';
import type { Metadata } from 'next';
import { Logo } from '@/components/shell/Logo';
import { longDate, verifyCertificate } from '@/lib/certificates';

type Params = { params: Promise<{ code: string }> };

export const metadata: Metadata = { title: 'Certificate' };

/** Public: anyone with the code can check a certificate is genuine. */
export default async function VerifyPage({ params }: Params) {
  const cert = await verifyCertificate((await params).code);
  return (
    <div className="verify-wrap">
      {cert ? (
        <div className="col" style={{ alignItems: 'center', width: '100%', maxWidth: 760 }}>
          <article className="certificate" aria-label="Certificate">
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Logo />
            </div>
            <p className="muted" style={{ margin: '22px 0 0', letterSpacing: '.14em', textTransform: 'uppercase', fontSize: 12, fontWeight: 700 }}>
              Certificate of completion
            </p>
            <h1>{cert.courseTitle}</h1>
            <p className="muted" style={{ margin: 0 }}>{cert.schoolName}</p>
            <p style={{ margin: '22px 0 0' }}>This certifies that</p>
            <p className="who">{cert.fullName}</p>
            <p style={{ margin: '0 0 22px' }}>completed every lesson, quiz and practical of this course at WrapItUpByPooja.</p>
            <p style={{ margin: 0, fontWeight: 700 }}>{longDate(cert.issuedAt)}</p>
            <p className="code" style={{ margin: '6px 0 0' }}>
              {cert.code}
            </p>
            <p className="chip live" style={{ marginTop: 18 }}>
              <BadgeCheck size={14} aria-hidden="true" /> Verified by Wrap It Up University
            </p>
          </article>
          <a className="btn btn-primary" href={`/verify/${cert.code}/pdf`}>
            <Download size={17} aria-hidden="true" /> Download PDF
          </a>
        </div>
      ) : (
        <div className="card" style={{ maxWidth: 440, textAlign: 'center' }}>
          <SearchX size={36} color="var(--red-deep)" aria-hidden="true" />
          <h1 style={{ fontFamily: 'var(--font-display)', margin: '8px 0' }}>Certificate not found</h1>
          <p className="muted" style={{ margin: 0 }}>
            Check the code. It looks like WIU-XXXX-XXXX and is printed at the bottom of the certificate.
          </p>
        </div>
      )}
    </div>
  );
}
