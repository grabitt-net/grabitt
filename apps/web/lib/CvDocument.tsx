import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'

// The generated CV. Two columns, navy accents — the format recruiters receive on
// apply. `revealed` controls identity: when false (default, pre-shortlist) the
// name becomes an anonymous reference and contact details are omitted, honouring
// "identity hidden until you hire".
export type CvData = {
  name: string
  email?: string | null
  phone?: string | null
  location?: string | null
  headline?: string | null
  summary?: string | null
  skills?: string[]
  keyStrengths?: string[]
  certifications?: string[]
  languages?: string[]
  availability?: string | null
  rightToWork?: string | null
  workExperience?: Array<{ title?: string; employer?: string; location?: string; start?: string; end?: string; current?: boolean; bullets?: string[] }>
  education?: Array<{ qualification?: string; institution?: string; start?: string; end?: string; status?: string }>
}

const NAVY = '#1e3a5f'
const s = StyleSheet.create({
  page: { flexDirection: 'row', fontSize: 9.5, color: '#222', fontFamily: 'Helvetica' },
  side: { width: '33%', backgroundColor: '#f4f6f8', padding: 18, paddingTop: 24 },
  main: { width: '67%', padding: 22, paddingTop: 24 },
  name: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: NAVY, letterSpacing: 1 },
  headline: { fontSize: 10, color: '#555', marginTop: 3, marginBottom: 6 },
  contact: { fontSize: 9, color: '#444', marginTop: 1 },
  sideHead: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: NAVY, marginTop: 14, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  mainHead: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: NAVY, marginTop: 14, marginBottom: 7, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: `1.2px solid ${NAVY}`, paddingBottom: 3 },
  li: { flexDirection: 'row', marginBottom: 3 },
  dot: { width: 8, color: NAVY },
  liText: { flex: 1, lineHeight: 1.35 },
  jobTitle: { fontSize: 10.5, fontFamily: 'Helvetica-Bold', color: '#1a1a1a' },
  jobMeta: { fontSize: 9, color: '#666', marginBottom: 3 },
  block: { marginBottom: 9 },
  summary: { lineHeight: 1.45, color: '#333' },
})

function List({ items }: { items: string[] }) {
  return (
    <View>
      {items.map((it, i) => (
        <View key={i} style={s.li}><Text style={s.dot}>•</Text><Text style={s.liText}>{it}</Text></View>
      ))}
    </View>
  )
}

const dateRange = (a?: string, b?: string, current?: boolean) => {
  const to = current ? 'Present' : (b || '')
  return [a || '', to].filter(Boolean).join(' – ')
}

export default function CvDocument({ data, revealed }: { data: CvData; revealed: boolean }) {
  const work = (data.workExperience || []).filter(w => w.title || w.employer)
  const edu = (data.education || []).filter(e => e.qualification || e.institution)
  const languages = data.languages || []
  const strengths = data.keyStrengths || []
  const certs = data.certifications || []
  const skills = data.skills || []

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Sidebar */}
        <View style={s.side}>
          {revealed && (
            <View style={{ marginBottom: 6 }}>
              <Text style={s.sideHead}>Contact</Text>
              {data.phone ? <Text style={s.contact}>{data.phone}</Text> : null}
              {data.email ? <Text style={s.contact}>{data.email}</Text> : null}
              {data.location ? <Text style={s.contact}>{data.location}</Text> : null}
            </View>
          )}
          {languages.length > 0 && (<><Text style={s.sideHead}>Languages</Text><List items={languages} /></>)}
          {strengths.length > 0 && (<><Text style={s.sideHead}>Key Strengths</Text><List items={strengths} /></>)}
          {certs.length > 0 && (<><Text style={s.sideHead}>Certifications</Text><List items={certs} /></>)}
          {(data.availability || data.rightToWork) && (
            <>
              <Text style={s.sideHead}>Availability</Text>
              {data.availability ? <Text style={s.contact}>{data.availability}</Text> : null}
              {data.rightToWork ? <Text style={[s.contact, { marginTop: 2 }]}>{data.rightToWork}</Text> : null}
            </>
          )}
        </View>

        {/* Main */}
        <View style={s.main}>
          <Text style={s.name}>{revealed ? (data.name || 'Candidate') : 'Candidate'}</Text>
          {data.headline ? <Text style={s.headline}>{data.headline}</Text> : null}
          {!revealed && <Text style={[s.headline, { color: '#999', fontSize: 8.5 }]}>Identity shared once shortlisted</Text>}

          {data.summary ? (
            <><Text style={s.mainHead}>Professional Summary</Text><Text style={s.summary}>{data.summary}</Text></>
          ) : null}

          {work.length > 0 && (
            <>
              <Text style={s.mainHead}>Work Experience</Text>
              {work.map((w, i) => (
                <View key={i} style={s.block}>
                  <Text style={s.jobTitle}>{w.title || 'Role'}{w.employer ? `  ·  ${w.employer}` : ''}</Text>
                  <Text style={s.jobMeta}>{[dateRange(w.start, w.end, w.current), w.location].filter(Boolean).join('  |  ')}</Text>
                  {(w.bullets || []).filter(Boolean).length > 0 && <List items={(w.bullets || []).filter(Boolean)} />}
                </View>
              ))}
            </>
          )}

          {edu.length > 0 && (
            <>
              <Text style={s.mainHead}>Education</Text>
              {edu.map((e, i) => (
                <View key={i} style={s.block}>
                  <Text style={s.jobTitle}>{e.qualification || 'Qualification'}{e.status ? `  (${e.status})` : ''}</Text>
                  <Text style={s.jobMeta}>{[e.institution, dateRange(e.start, e.end)].filter(Boolean).join('  |  ')}</Text>
                </View>
              ))}
            </>
          )}

          {skills.length > 0 && (<><Text style={s.mainHead}>Skills</Text><List items={skills} /></>)}
        </View>
      </Page>
    </Document>
  )
}
