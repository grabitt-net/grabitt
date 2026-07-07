import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, FlatList, StyleSheet, SafeAreaView } from 'react-native'
import { router } from 'expo-router'
import { colors } from '@grabitt/design-tokens'
import { apiClient } from '../lib/trpc'

// Bespoke Jobs board (parity with the web/HTML build) — live JobListings via
// jobs.list, not the old static demo data.
const JOB_TYPES: [string, string | undefined][] = [
  ['All', undefined], ['Full Time', 'full_time'], ['Part Time', 'part_time'],
  ['Contract', 'contract'], ['Temp', 'temporary'], ['Volunteer', 'volunteer'],
]

const TYPE_LABEL: Record<string, string> = {
  full_time: 'Full Time', part_time: 'Part Time', contract: 'Contract',
  temporary: 'Temp', volunteer: 'Volunteer',
}

type Job = {
  ref: string; title: string; company: string; location: string
  salary: string; type: string; remote: boolean; posted: string
}

function relTime(d: string | Date): string {
  const secs = Math.max(0, (Date.now() - new Date(d).getTime()) / 1000)
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

function salaryLabel(min?: string | number | null, max?: string | number | null): string {
  const lo = min != null ? Number(min) : null
  const hi = max != null ? Number(max) : null
  if (lo && hi) return `€${lo.toLocaleString()}–${hi.toLocaleString()}/mo`
  if (lo) return `€${lo.toLocaleString()}/mo`
  if (hi) return `up to €${hi.toLocaleString()}/mo`
  return 'Negotiable'
}

export default function JobsScreen() {
  const [filter, setFilter] = useState(0)
  const [jobs, setJobs] = useState<Job[]>([])

  useEffect(() => {
    const type = JOB_TYPES[filter][1]
    apiClient().jobs.list.query({ ...(type ? { type } : {}) } as any)
      .then((rows: any[]) => setJobs(rows.map(j => ({
        ref: j.listing?.id ?? j.listingId ?? j.id,
        title: j.jobTitle ?? j.listing?.title ?? 'Job',
        company: j.company ?? '',
        location: j.remote ? 'Remote' : (j.listing?.location ?? 'Gran Canaria'),
        salary: salaryLabel(j.salaryMin, j.salaryMax),
        type: TYPE_LABEL[j.type] ?? j.type ?? '',
        remote: !!j.remote,
        posted: relTime(j.createdAt ?? Date.now()),
      }))))
      .catch(() => setJobs([]))
  }, [filter])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={{ fontSize: 22, color: colors.orange }}>‹</Text></TouchableOpacity>
        <Text style={s.heading}>💼 Jobs</Text>
      </View>

      <View style={{ paddingVertical: 8 }}>
        <FlatList
          data={JOB_TYPES}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, gap: 6 }}
          keyExtractor={i => i[0]}
          renderItem={({ item, index }) => (
            <TouchableOpacity onPress={() => setFilter(index)} style={[s.chip, filter === index && s.chipActive]}>
              <Text style={[s.chipLabel, filter === index && s.chipLabelActive]}>{item[0]}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={jobs}
        keyExtractor={(i, idx) => i.ref + idx}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => router.push(`/listing/${item.ref}`)}>
            <View style={s.icon}><Text style={{ fontSize: 28 }}>💼</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.title} numberOfLines={1}>{item.title}</Text>
              <Text style={s.company} numberOfLines={1}>{item.company ? `${item.company} · ` : ''}📍 {item.location}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <Text style={s.salary}>{item.salary}</Text>
                {!!item.type && <View style={s.badge}><Text style={s.badgeText}>{item.type.toUpperCase()}</Text></View>}
                {item.remote && <View style={[s.badge, { backgroundColor: '#EAF4FF' }]}><Text style={[s.badgeText, { color: colors.ocean }]}>REMOTE</Text></View>}
              </View>
            </View>
            <Text style={s.posted}>{item.posted}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<View style={s.empty}><Text style={{ fontSize: 40, marginBottom: 10 }}>💼</Text><Text style={s.emptyText}>No jobs posted right now.</Text></View>}
      />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: '#f0ebe4' },
  heading: { fontFamily: 'Comfortaa', fontSize: 20, fontWeight: '700', color: colors.dark },
  chip: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 50, backgroundColor: '#f5f0e8' },
  chipActive: { backgroundColor: colors.orange },
  chipLabel: { fontFamily: 'Nunito', fontSize: 11, fontWeight: '800', color: '#555' },
  chipLabelActive: { color: '#fff' },
  card: { flexDirection: 'row', gap: 12, padding: 14, backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: '#f0ebe4', alignItems: 'flex-start' },
  icon: { width: 48, height: 48, backgroundColor: '#f5f0e8', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'Nunito', fontSize: 14, fontWeight: '900', color: colors.dark, marginBottom: 2 },
  company: { fontFamily: 'Nunito', fontSize: 11, color: '#666' },
  salary: { fontFamily: 'Georgia', fontSize: 14, fontWeight: '700', color: colors.orange },
  badge: { backgroundColor: '#f5f0e8', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 50 },
  badgeText: { fontFamily: 'Nunito', fontSize: 8, fontWeight: '900', color: '#888' },
  posted: { fontFamily: 'Nunito', fontSize: 10, color: '#bbb' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontFamily: 'Nunito', fontSize: 13, color: '#888' },
})
