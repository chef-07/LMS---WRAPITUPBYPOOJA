import { Document, Page, Path, StyleSheet, Svg, Text, View, renderToBuffer } from '@react-pdf/renderer';
import { longDate, verifyCertificate } from '@/lib/certificates';

export const runtime = 'nodejs';

const s = StyleSheet.create({
  page: { backgroundColor: '#FFF6EC', padding: 28, fontFamily: 'Helvetica' },
  frame: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 18, padding: 40, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  band: { position: 'absolute', top: 0, left: 0, right: 0, height: 12, flexDirection: 'row', borderTopLeftRadius: 18, borderTopRightRadius: 18, overflow: 'hidden' },
  brand: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#1F1A2E', letterSpacing: 1 },
  eyebrow: { marginTop: 22, fontSize: 10, letterSpacing: 3, color: '#6E6985', fontFamily: 'Helvetica-Bold' },
  course: { marginTop: 10, fontSize: 30, fontFamily: 'Times-Bold', color: '#1F1A2E', textAlign: 'center' },
  school: { marginTop: 4, fontSize: 12, color: '#6E6985' },
  line: { marginTop: 20, fontSize: 12, color: '#4A4560' },
  name: { marginTop: 8, fontSize: 28, fontFamily: 'Times-BoldItalic', color: '#C2185B' },
  body: { marginTop: 8, fontSize: 11, color: '#4A4560', textAlign: 'center', maxWidth: 420 },
  date: { marginTop: 22, fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#1F1A2E' },
  code: { marginTop: 4, fontSize: 10, fontFamily: 'Courier', color: '#6E6985', letterSpacing: 1 },
  verify: { marginTop: 14, fontSize: 9, color: '#00796F' },
});

const BAND = ['#7C5CFF', '#FF4D8D', '#FF7A1A', '#FFC727', '#00C2B2'];

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const cert = await verifyCertificate((await params).code);
  if (!cert) return new Response('Certificate not found', { status: 404 });
  const verifyUrl = `${new URL(req.url).origin}/verify/${cert.code}`;

  const doc = (
    <Document title={`${cert.courseTitle}: ${cert.fullName}`} author="Wrap It Up University">
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.frame}>
          <View style={s.band}>
            {BAND.map((c) => (
              <View key={c} style={{ flex: 1, backgroundColor: c }} />
            ))}
          </View>
          <Svg width="54" height="34" viewBox="0 0 54 34">
            <Path d="M27 17 C 18 4, 6 8, 9 17 C 11 24, 21 22, 27 17 Z" fill="#FF4D8D" />
            <Path d="M27 17 C 36 4, 48 8, 45 17 C 43 24, 33 22, 27 17 Z" fill="#FF7A1A" />
            <Path d="M24 17 L 18 33 M 30 17 L 36 33" stroke="#7C5CFF" strokeWidth={3} />
          </Svg>
          <Text style={s.brand}>WRAP IT UP UNIVERSITY</Text>
          <Text style={s.eyebrow}>CERTIFICATE OF COMPLETION</Text>
          <Text style={s.course}>{cert.courseTitle}</Text>
          <Text style={s.school}>{cert.schoolName}</Text>
          <Text style={s.line}>This certifies that</Text>
          <Text style={s.name}>{cert.fullName}</Text>
          <Text style={s.body}>completed every lesson, quiz and practical of this course at WrapItUpByPooja.</Text>
          <Text style={s.date}>{longDate(cert.issuedAt)}</Text>
          <Text style={s.code}>{cert.code}</Text>
          <Text style={s.verify}>Check it at {verifyUrl}</Text>
        </View>
      </Page>
    </Document>
  );

  const pdf = await renderToBuffer(doc);
  return new Response(new Uint8Array(pdf), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `inline; filename="${cert.code}.pdf"`,
      'cache-control': 'private, max-age=300',
    },
  });
}
