/**
 * Turns an EmailPlan into the HTML and plain-text bodies (pure, unit-tested).
 * Email clients ignore most CSS, so this is table layout with inline styles
 * and a solid colour behind every gradient.
 */
import type { EmailKind, EmailPlan } from '../reminders';

export const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const WHY: Record<EmailKind, string> = {
  reminder: 'You get this when something in your training needs you, never more than once a day.',
  streak: 'You get this in the evening when your learning streak would end tonight.',
  digest: 'The Monday summary for admins of Wrap It Up University.',
};
const OFF: Record<EmailKind, string> = {
  reminder: 'Stop reminder emails',
  streak: 'Stop streak emails',
  digest: 'Stop the Monday summary',
};

export type Rendered = { html: string; text: string };

export function renderEmail(plan: EmailPlan, links: { siteUrl: string; unsubscribeUrl: string }): Rendered {
  const abs = (href: string) => (/^https?:\/\//.test(href) ? href : `${links.siteUrl.replace(/\/$/, '')}${href}`);
  const settings = abs('/settings');
  const font = "'Plus Jakarta Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

  const items = plan.items
    .map(
      (i) => `<tr>
  <td width="36" valign="top" style="padding:10px 0;font-size:20px;line-height:24px">${esc(i.emoji)}</td>
  <td valign="top" style="padding:10px 0;font-size:15px;line-height:22px;color:#1f1a2e;border-bottom:1px solid #f0e8de"><a href="${esc(abs(i.href))}" style="color:#1f1a2e;text-decoration:none">${esc(i.text)}</a></td>
</tr>`,
    )
    .join('\n');

  const stats = plan.stats?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 16px"><tr>${plan.stats
        .map(
          (st) => `<td width="${Math.floor(100 / plan.stats!.length)}%" style="padding:12px 8px;background:#fff9f2;border:4px solid #ffffff;border-radius:14px;text-align:center">
  <div style="font-size:22px;font-weight:800;color:#1f1a2e">${esc(st.value)}</div>
  <div style="font-size:12px;color:#4a4560">${esc(st.label)}</div>
</td>`,
        )
        .join('')}</tr></table>`
    : '';

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${esc(plan.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#fff9f2;font-family:${font}">
<div style="display:none;max-height:0;overflow:hidden">${esc(plan.intro)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff9f2">
<tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
  <tr><td bgcolor="#5536d9" style="background:#5536d9;background-image:linear-gradient(120deg,#5536d9,#c2185b 55%,#b04500);border-radius:24px 24px 0 0;padding:22px 28px">
    <div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#ffffff;font-weight:700">🎀 Wrap It Up University</div>
    <h1 style="margin:10px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:32px;color:#ffffff;font-weight:700">${esc(plan.heading)}</h1>
  </td></tr>
  <tr><td style="background:#ffffff;border-radius:0 0 24px 24px;padding:22px 28px 26px">
    <p style="margin:0 0 8px;font-size:15px;line-height:22px;color:#4a4560">${esc(plan.intro)}</p>
    ${stats}
    ${items ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${items}</table>` : ''}
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:22px"><tr>
      <td bgcolor="#b04500" style="border-radius:12px"><a href="${esc(abs(plan.cta.href))}" style="display:inline-block;padding:13px 22px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px">${esc(plan.cta.label)} →</a></td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:18px 28px;font-size:12px;line-height:18px;color:#6e6985;text-align:center">
    ${esc(WHY[plan.kind])}<br>
    <a href="${esc(links.unsubscribeUrl)}" style="color:#6e6985">${esc(OFF[plan.kind])}</a> · <a href="${esc(settings)}" style="color:#6e6985">Email settings</a>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    plan.heading,
    '',
    plan.intro,
    '',
    ...(plan.stats ?? []).map((st) => `${st.label}: ${st.value}`),
    ...(plan.stats?.length ? [''] : []),
    ...plan.items.map((i) => `${i.emoji} ${i.text}\n   ${abs(i.href)}`),
    '',
    `${plan.cta.label}: ${abs(plan.cta.href)}`,
    '',
    '--',
    WHY[plan.kind],
    `${OFF[plan.kind]}: ${links.unsubscribeUrl}`,
    `Email settings: ${settings}`,
  ].join('\n');

  return { html, text };
}
