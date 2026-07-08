import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, Alert, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { colors } from '@grabitt/design-tokens'
import { useAuth } from '../lib/auth'
import { apiClient } from '../lib/trpc'

const TYPES: [string, string][] = [
  ['Full Time', 'full_time'], ['Part Time', 'part_time'], ['Contract', 'contract'], ['Temp', 'temporary'], ['Volunteer', 'volunteer'],
]
const SECTORS = ['Hostelería', 'Retail', 'Construcción', 'Administración', 'Salud', 'Educación', 'Transporte', 'Turismo', 'Limpieza', 'Tech / IT', 'Other']

export default function CreateJobScreen() {
  const { token } = useAuth()
  const [f, setF] = useState({
    jobTitle: '', company: '', sector: '', type: 'full_time', location: '', address: '',
    salaryMin: '', salaryMax: '', salaryPeriod: 'month', payments: '', overtime: false, tips: false,
    remote: false, hours: '', startDate: '', description: '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k: string, v: any) => setF(p => ({ ...p, [k]: v }))

  const submit = async () => {
    if (!token) { Alert.alert('Please log in', 'Log in to post a job.', [{ text: 'Log in', onPress: () => router.push('/auth') }, { text: 'Cancel' }]); return }
    if (!f.jobTitle.trim() || !f.company.trim() || !f.location.trim()) { Alert.alert('Missing info', 'Job title, employer and location are required.'); return }
    setSaving(true)
    try {
      const listing: any = await apiClient(token).jobs.create.mutate({
        jobTitle: f.jobTitle.trim(), company: f.company.trim(), type: f.type,
        location: f.location.trim(),
        ...(f.address.trim() && { address: f.address.trim() }),
        ...(f.sector && { sector: f.sector }),
        ...(f.description.trim() && { description: f.description.trim() }),
        ...(f.salaryMin && { salaryMin: Number(f.salaryMin) }),
        ...(f.salaryMax && { salaryMax: Number(f.salaryMax) }),
        salaryPeriod: f.salaryPeriod,
        ...(f.payments && { payments: Number(f.payments) }),
        overtime: f.overtime, tips: f.tips, remote: f.remote,
        ...(f.hours.trim() && { hours: f.hours.trim() }),
        ...(f.startDate.trim() && { startDate: f.startDate.trim() }),
      } as any)
      router.replace(`/listing/${listing.id}`)
    } catch (e: any) {
      Alert.alert('Could not post', e?.message ?? 'Please check the fields and try again.')
    } finally { setSaving(false) }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f7f4ee' }}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={{ fontSize: 22, color: colors.orange }}>‹</Text></TouchableOpacity>
        <Text style={s.heading}>💼 Post a Job</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 40, gap: 12 }}>
        <Section title="The role">
          <Field label="Job title *"><TextInput value={f.jobTitle} onChangeText={v => set('jobTitle', v)} placeholder="e.g. Bar Staff" placeholderTextColor="#aaa" style={s.input} /></Field>
          <Field label="Employer name *"><TextInput value={f.company} onChangeText={v => set('company', v)} placeholder="e.g. The Irish Rover" placeholderTextColor="#aaa" style={s.input} /></Field>
          <Field label="Category / sector"><Chips options={SECTORS.map(x => [x, x] as [string, string])} value={f.sector} onSelect={v => set('sector', v)} /></Field>
          <Field label="Role type"><Chips options={TYPES} value={f.type} onSelect={v => set('type', v)} /></Field>
          <Field label="Hours of operation"><TextInput value={f.hours} onChangeText={v => set('hours', v)} placeholder="Mon–Fri 9:00–17:00" placeholderTextColor="#aaa" style={s.input} /></Field>
          <Toggle label="Remote / work from home" on={f.remote} onToggle={() => set('remote', !f.remote)} />
        </Section>

        <Section title="Location">
          <Field label="Location (town / area) *"><TextInput value={f.location} onChangeText={v => set('location', v)} placeholder="Playa del Inglés" placeholderTextColor="#aaa" style={s.input} /></Field>
          <Field label="Full address (map on the listing)"><TextInput value={f.address} onChangeText={v => set('address', v)} placeholder="Street, number, postcode, town" placeholderTextColor="#aaa" style={s.input} /></Field>
        </Section>

        <Section title="Pay">
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Field label="From (€)"><TextInput value={f.salaryMin} onChangeText={v => set('salaryMin', v)} keyboardType="numeric" placeholder="1200" placeholderTextColor="#aaa" style={s.input} /></Field>
            <Field label="To (€)"><TextInput value={f.salaryMax} onChangeText={v => set('salaryMax', v)} keyboardType="numeric" placeholder="1400" placeholderTextColor="#aaa" style={s.input} /></Field>
          </View>
          <Field label="Per"><Chips options={[['Month', 'month'], ['Year', 'year'], ['Hour', 'hour']]} value={f.salaryPeriod} onSelect={v => set('salaryPeriod', v)} /></Field>
          <Field label="Payments / year"><Chips options={[['12', '12'], ['14', '14']]} value={f.payments} onSelect={v => set('payments', f.payments === v ? '' : v)} /></Field>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Toggle label="Overtime" on={f.overtime} onToggle={() => set('overtime', !f.overtime)} />
            <Toggle label="Tips" on={f.tips} onToggle={() => set('tips', !f.tips)} />
          </View>
        </Section>

        <Section title="Details">
          <Field label="Expected start date (YYYY-MM-DD)"><TextInput value={f.startDate} onChangeText={v => set('startDate', v)} placeholder="2026-08-01" placeholderTextColor="#aaa" style={s.input} /></Field>
          <Field label="Description"><TextInput value={f.description} onChangeText={v => set('description', v)} placeholder="Describe the role…" placeholderTextColor="#aaa" style={[s.input, { height: 100, textAlignVertical: 'top' }]} multiline /></Field>
        </Section>

        <TouchableOpacity onPress={submit} disabled={saving} style={[s.submit, saving && { opacity: 0.7 }]}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.submitText}>Post Job →</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={{ gap: 10 }}>{children}</View>
    </View>
  )
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <View style={{ flex: 1 }}><Text style={s.label}>{label}</Text>{children}</View>
}
function Chips({ options, value, onSelect }: { options: [string, string][]; value: string; onSelect: (v: string) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {options.map(([label, val]) => (
        <TouchableOpacity key={val} onPress={() => onSelect(val)} style={[s.chip, value === val && s.chipOn]}>
          <Text style={[s.chipText, value === val && s.chipTextOn]}>{label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}
function Toggle({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <TouchableOpacity onPress={onToggle} style={[s.chip, on && s.chipOn]}>
      <Text style={[s.chipText, on && s.chipTextOn]}>{on ? '✓ ' : ''}{label}</Text>
    </TouchableOpacity>
  )
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, backgroundColor: colors.sand, borderBottomWidth: 1, borderBottomColor: colors.sand2 },
  heading: { fontFamily: 'Comfortaa', fontSize: 20, fontWeight: '700', color: colors.dark },
  section: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ece3d7', borderRadius: 14, padding: 14 },
  sectionTitle: { fontFamily: 'Nunito', fontSize: 11, fontWeight: '900', color: colors.orange, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  label: { fontFamily: 'Nunito', fontSize: 10, fontWeight: '800', color: '#999', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 },
  input: { borderWidth: 1.5, borderColor: '#e0d8d0', borderRadius: 8, paddingHorizontal: 11, paddingVertical: 9, fontFamily: 'Nunito', fontSize: 13, color: colors.dark, backgroundColor: '#fff' },
  chip: { borderWidth: 1.5, borderColor: '#e0d8d0', borderRadius: 50, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#fff' },
  chipOn: { backgroundColor: colors.orange, borderColor: colors.orange },
  chipText: { fontFamily: 'Nunito', fontSize: 11.5, fontWeight: '800', color: '#555' },
  chipTextOn: { color: '#fff' },
  submit: { backgroundColor: colors.orange, borderRadius: 12, padding: 15, alignItems: 'center' },
  submitText: { color: '#fff', fontFamily: 'Nunito', fontSize: 15, fontWeight: '900' },
})
