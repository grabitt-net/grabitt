import { useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, FlatList } from 'react-native'
import { colors } from '@grabitt/design-tokens'

const STATS = [
  { label: 'Members', value: '4,219', icon: '👥', delta: '+23 today' },
  { label: 'Listings', value: '12,847', icon: '📦', delta: '+104 today' },
  { label: 'Revenue', value: '€8,342', icon: '💰', delta: 'this month' },
  { label: 'Open Disputes', value: '3', icon: '⚠️', delta: 'needs review' },
]

const VIEWS = ['Dashboard', 'Members', 'Disputes', 'Reports']

const RECENT_MEMBERS = [
  { id: 'U1', name: 'María López', grade: 'Grabber', joined: '2h ago', verified: true },
  { id: 'U2', name: 'James O\'Brien', grade: 'Dealer', joined: '4h ago', verified: true },
  { id: 'U3', name: 'Ana García', grade: 'Grabber', joined: '8h ago', verified: false },
  { id: 'U4', name: 'Tom Wilson', grade: 'Trader', joined: '1d ago', verified: true },
]

const DISPUTES = [
  { id: 'D1', ref: 'TXN-G1-ABC', buyer: 'Carlos M.', seller: 'Pedro R.', amount: '€149', reason: 'Item not as described', age: '2d' },
  { id: 'D2', ref: 'TXN-G2-DEF', buyer: 'Ana L.', seller: 'Juan P.', amount: '€399', reason: 'Non-delivery', age: '5d' },
  { id: 'D3', ref: 'TXN-G3-GHI', buyer: 'Tom W.', seller: 'María R.', amount: '€89', reason: 'Item damaged', age: '8d' },
]

const GRADE_COLORS: Record<string, string> = {
  Grabber: '#9E8F7A',
  Dealer: colors.sage,
  Trader: colors.orange,
  Pro: '#6d28d9',
}

export default function ExecTab() {
  const [view, setView] = useState('Dashboard')
  const [selectedMember, setSelectedMember] = useState<string | null>(null)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={s.header}>
        <Text style={s.heading}>⚡ Exec</Text>
        <View style={s.badge}><Text style={s.badgeText}>ADMIN</Text></View>
      </View>

      {/* Nav */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 6, flexDirection: 'row' }}>
        {VIEWS.map(v => (
          <TouchableOpacity key={v} onPress={() => setView(v)} style={[s.navBtn, view === v && s.navBtnActive]}>
            <Text style={[s.navLabel, view === v && s.navLabelActive]}>{v}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {view === 'Dashboard' && (
          <>
            <View style={s.statsGrid}>
              {STATS.map(stat => (
                <View key={stat.label} style={s.statCard}>
                  <Text style={{ fontSize: 24 }}>{stat.icon}</Text>
                  <Text style={s.statValue}>{stat.value}</Text>
                  <Text style={s.statLabel}>{stat.label}</Text>
                  <Text style={s.statDelta}>{stat.delta}</Text>
                </View>
              ))}
            </View>

            <Text style={s.sectionTitle}>Recent Members</Text>
            {RECENT_MEMBERS.map(m => (
              <View key={m.id} style={s.memberRow}>
                <View style={[s.avatar, { backgroundColor: GRADE_COLORS[m.grade] + '22' }]}>
                  <Text style={{ fontSize: 18 }}>👤</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.memberName}>{m.name} {m.verified ? '✅' : ''}</Text>
                  <Text style={s.memberMeta}>{m.grade} · {m.joined}</Text>
                </View>
                <View style={[s.gradeBadge, { backgroundColor: GRADE_COLORS[m.grade] + '22' }]}>
                  <Text style={[s.gradeText, { color: GRADE_COLORS[m.grade] }]}>{m.grade}</Text>
                </View>
              </View>
            ))}
          </>
        )}

        {view === 'Members' && (
          <>
            <Text style={s.sectionTitle}>Member Management</Text>
            {RECENT_MEMBERS.map(m => (
              <View key={m.id}>
                <TouchableOpacity style={s.memberRow} onPress={() => setSelectedMember(selectedMember === m.id ? null : m.id)}>
                  <View style={[s.avatar, { backgroundColor: GRADE_COLORS[m.grade] + '22' }]}>
                    <Text style={{ fontSize: 18 }}>👤</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.memberName}>{m.name}</Text>
                    <Text style={s.memberMeta}>{m.grade} · {m.joined}</Text>
                  </View>
                  <Text style={{ color: '#aaa' }}>{selectedMember === m.id ? '▲' : '▼'}</Text>
                </TouchableOpacity>

                {selectedMember === m.id && (
                  <View style={s.actionPanel}>
                    <Text style={s.actionTitle}>Exec Actions</Text>
                    <View style={s.actionBtns}>
                      <ActionBtn label="Strike" color="#f59e0b" />
                      <ActionBtn label="Suspend" color="#ef4444" />
                      <ActionBtn label="Award Credits" color={colors.sage} />
                      <ActionBtn label="Mark Verified" color={colors.orange} />
                    </View>
                  </View>
                )}
              </View>
            ))}
          </>
        )}

        {view === 'Disputes' && (
          <>
            <Text style={s.sectionTitle}>Open Disputes ({DISPUTES.length})</Text>
            {DISPUTES.map(d => (
              <View key={d.id} style={s.disputeCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ fontFamily: 'Courier', fontSize: 11, color: '#888' }}>{d.ref}</Text>
                  <View style={s.ageBadge}><Text style={s.ageText}>{d.age} old</Text></View>
                </View>
                <Text style={s.disputeReason}>{d.reason}</Text>
                <Text style={s.disputeMeta}>{d.buyer} vs {d.seller} · {d.amount}</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                  <TouchableOpacity style={[s.disputeBtn, { backgroundColor: '#fef9f0', borderColor: '#f59e0b' }]}>
                    <Text style={{ fontFamily: 'Nunito', fontSize: 11, fontWeight: '900', color: '#f59e0b' }}>Mediate</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.disputeBtn, { backgroundColor: '#fef2f2', borderColor: '#ef4444' }]}>
                    <Text style={{ fontFamily: 'Nunito', fontSize: 11, fontWeight: '900', color: '#ef4444' }}>Escalate</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.disputeBtn, { backgroundColor: '#f0fdf4', borderColor: '#22c55e' }]}>
                    <Text style={{ fontFamily: 'Nunito', fontSize: 11, fontWeight: '900', color: '#22c55e' }}>Resolve</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}

        {view === 'Reports' && (
          <>
            <Text style={s.sectionTitle}>Reports &amp; Fakes</Text>
            {[
              { id: 'R1', title: 'Fake Rolex listing', reporter: 'Ana L.', age: '1h', category: 'Counterfeit' },
              { id: 'R2', title: 'Contact info in messages', reporter: 'Tom W.', age: '3h', category: 'Policy' },
              { id: 'R3', title: 'Scam seller profile', reporter: 'María R.', age: '1d', category: 'Fraud' },
            ].map(r => (
              <View key={r.id} style={s.reportCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <View style={s.catBadge}><Text style={s.catText}>{r.category}</Text></View>
                  <Text style={{ fontFamily: 'Nunito', fontSize: 10, color: '#aaa' }}>{r.age} ago</Text>
                </View>
                <Text style={s.reportTitle}>{r.title}</Text>
                <Text style={s.reportMeta}>Reported by {r.reporter}</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                  <TouchableOpacity style={[s.disputeBtn, { backgroundColor: '#fef2f2', borderColor: '#ef4444' }]}>
                    <Text style={{ fontFamily: 'Nunito', fontSize: 11, fontWeight: '900', color: '#ef4444' }}>Remove</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.disputeBtn, { backgroundColor: '#f5f0e8', borderColor: '#9E8F7A' }]}>
                    <Text style={{ fontFamily: 'Nunito', fontSize: 11, fontWeight: '900', color: '#9E8F7A' }}>Dismiss</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function ActionBtn({ label, color }: { label: string; color: string }) {
  return (
    <TouchableOpacity style={[s.actionBtn, { borderColor: color }]}>
      <Text style={[s.actionBtnText, { color }]}>{label}</Text>
    </TouchableOpacity>
  )
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0ebe4' },
  heading: { fontFamily: 'Comfortaa', fontSize: 22, fontWeight: '700', color: colors.dark, flex: 1 },
  badge: { backgroundColor: '#ef4444', borderRadius: 50, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontFamily: 'Nunito', fontSize: 9, fontWeight: '900', color: '#fff' },
  navBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 50, backgroundColor: '#f5f0e8' },
  navBtnActive: { backgroundColor: colors.orange },
  navLabel: { fontFamily: 'Nunito', fontSize: 11, fontWeight: '800', color: '#555' },
  navLabelActive: { color: '#fff' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  statCard: { width: '47%', backgroundColor: '#faf9f7', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#f0ebe4' },
  statValue: { fontFamily: 'Georgia', fontSize: 22, fontWeight: '700', color: colors.dark, marginTop: 6 },
  statLabel: { fontFamily: 'Nunito', fontSize: 10, fontWeight: '900', color: '#888', marginTop: 2 },
  statDelta: { fontFamily: 'Nunito', fontSize: 9, color: colors.sage, marginTop: 2 },
  sectionTitle: { fontFamily: 'Nunito', fontSize: 14, fontWeight: '900', color: colors.dark, marginBottom: 12 },
  memberRow: { flexDirection: 'row', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#f0ebe4', marginBottom: 8, alignItems: 'center', backgroundColor: '#fff' },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  memberName: { fontFamily: 'Nunito', fontSize: 13, fontWeight: '900', color: colors.dark },
  memberMeta: { fontFamily: 'Nunito', fontSize: 11, color: '#888' },
  gradeBadge: { borderRadius: 50, paddingHorizontal: 10, paddingVertical: 3 },
  gradeText: { fontFamily: 'Nunito', fontSize: 10, fontWeight: '900' },
  actionPanel: { backgroundColor: '#faf9f7', borderRadius: 12, padding: 14, marginBottom: 8, marginTop: -4, borderWidth: 1, borderColor: '#f0ebe4' },
  actionTitle: { fontFamily: 'Nunito', fontSize: 11, fontWeight: '900', color: '#888', marginBottom: 10 },
  actionBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 50, borderWidth: 1.5 },
  actionBtnText: { fontFamily: 'Nunito', fontSize: 11, fontWeight: '900' },
  disputeCard: { backgroundColor: '#faf9f7', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#f0ebe4' },
  ageBadge: { backgroundColor: '#fef9f0', borderRadius: 50, paddingHorizontal: 8, paddingVertical: 2 },
  ageText: { fontFamily: 'Nunito', fontSize: 9, fontWeight: '900', color: '#f59e0b' },
  disputeReason: { fontFamily: 'Nunito', fontSize: 13, fontWeight: '900', color: colors.dark, marginBottom: 2 },
  disputeMeta: { fontFamily: 'Nunito', fontSize: 11, color: '#888' },
  disputeBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 50, borderWidth: 1.5 },
  reportCard: { backgroundColor: '#faf9f7', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#f0ebe4' },
  catBadge: { backgroundColor: '#fef2f2', borderRadius: 50, paddingHorizontal: 10, paddingVertical: 2 },
  catText: { fontFamily: 'Nunito', fontSize: 9, fontWeight: '900', color: '#ef4444' },
  reportTitle: { fontFamily: 'Nunito', fontSize: 13, fontWeight: '900', color: colors.dark, marginBottom: 2 },
  reportMeta: { fontFamily: 'Nunito', fontSize: 11, color: '#888' },
})
