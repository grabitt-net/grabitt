import { useEffect, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Switch, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { SAFE_TOP } from '../lib/layout'
import { router } from 'expo-router'
import { colors } from '@grabitt/design-tokens'
import { useAuth } from '../lib/auth'
import { apiClient } from '../lib/trpc'

const toList = (s: string) => s.split(',').map(x => x.trim()).filter(Boolean)

export default function RecruitmentScreen() {
  const { token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [active, setActive] = useState(true)
  const [headline, setHeadline] = useState('')
  const [summary, setSummary] = useState('')
  const [sectors, setSectors] = useState('')
  const [skills, setSkills] = useState('')
  const [experience, setExperience] = useState('')
  const [town, setTown] = useState('')

  useEffect(() => {
    if (!token) { setLoading(false); return }
    apiClient(token).seekers.myProfile.query().then((p: any) => {
      if (p) {
        setActive(p.active ?? true)
        setHeadline(p.headline ?? '')
        setSummary(p.summary ?? '')
        setSectors((p.sectors ?? []).join(', '))
        setSkills((p.skills ?? []).join(', '))
        setExperience(p.experienceMonths ? String(Math.round(p.experienceMonths / 12)) : '')
        setTown(p.town ?? '')
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [token])

  const save = async () => {
    setSaving(true)
    try {
      await apiClient(token!).seekers.upsertProfile.mutate({
        active,
        headline: headline.trim() || null,
        summary: summary.trim() || null,
        sectors: toList(sectors),
        skills: toList(skills),
        experienceMonths: experience ? Math.round(Number(experience) * 12) : 0,
        town: town.trim() || null,
      } as any)
      Alert.alert('Saved', 'Your work profile has been updated.', [{ text: 'OK', onPress: () => router.back() }])
    } catch (e: any) { Alert.alert('Could not save', e?.message ?? 'Try again') }
    finally { setSaving(false) }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={[s.header, { paddingTop: SAFE_TOP + 14 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><Text style={{ fontSize: 22, color: colors.orange }}>‹</Text></TouchableOpacity>
        <Text style={s.heading}>💼 Work profile</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? <View style={{ paddingTop: 60, alignItems: 'center' }}><ActivityIndicator color={colors.orange} /></View> : (
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <View style={s.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.switchLabel}>Open to work</Text>
              <Text style={s.switchSub}>Appear in recruiter candidate searches.</Text>
            </View>
            <Switch value={active} onValueChange={setActive} trackColor={{ true: colors.orange }} />
          </View>

          <Text style={s.label}>Headline</Text>
          <TextInput value={headline} onChangeText={setHeadline} placeholder="e.g. Experienced bartender & barista" placeholderTextColor="#aaa" style={s.input} />

          <Text style={s.label}>About you</Text>
          <TextInput value={summary} onChangeText={setSummary} placeholder="A short summary of your experience…" placeholderTextColor="#aaa" style={[s.input, { height: 90, textAlignVertical: 'top' }]} multiline />

          <Text style={s.label}>Sectors (comma separated)</Text>
          <TextInput value={sectors} onChangeText={setSectors} placeholder="Hospitality, Retail, Admin" placeholderTextColor="#aaa" style={s.input} />

          <Text style={s.label}>Skills (comma separated)</Text>
          <TextInput value={skills} onChangeText={setSkills} placeholder="Customer service, POS, English, Spanish" placeholderTextColor="#aaa" style={s.input} />

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Experience (years)</Text>
              <TextInput value={experience} onChangeText={setExperience} keyboardType="numeric" placeholder="0" placeholderTextColor="#aaa" style={s.input} />
            </View>
            <View style={{ flex: 2 }}>
              <Text style={s.label}>Town</Text>
              <TextInput value={town} onChangeText={setTown} placeholder="Las Palmas de Gran Canaria" placeholderTextColor="#aaa" style={s.input} />
            </View>
          </View>

          <TouchableOpacity style={[s.save, saving && { opacity: 0.6 }]} disabled={saving} onPress={save}>
            <Text style={s.saveText}>{saving ? 'Saving…' : 'Save work profile'}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#f0ebe4' },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  heading: { flex: 1, fontFamily: 'Comfortaa', fontSize: 18, fontWeight: '700', color: colors.dark, textAlign: 'center' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#faf6ef', borderRadius: 12, padding: 14, marginBottom: 6 },
  switchLabel: { fontFamily: 'Nunito', fontSize: 14, fontWeight: '800', color: colors.dark },
  switchSub: { fontFamily: 'Nunito', fontSize: 11, color: '#888', marginTop: 2 },
  label: { fontFamily: 'Nunito', fontSize: 12, fontWeight: '800', color: '#555', marginBottom: 6, marginTop: 16 },
  input: { borderWidth: 1.5, borderColor: '#e5e0d8', borderRadius: 10, padding: 12, fontFamily: 'Nunito', fontSize: 15, color: colors.dark },
  save: { backgroundColor: colors.orange, borderRadius: 50, padding: 16, alignItems: 'center', marginTop: 28 },
  saveText: { fontFamily: 'Nunito', fontSize: 15, fontWeight: '900', color: '#fff' },
})
