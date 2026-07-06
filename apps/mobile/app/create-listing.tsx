import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image, Alert, ActivityIndicator } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { colors } from '@grabitt/design-tokens'
import { useAuth } from '../lib/auth'
import { apiClient } from '../lib/trpc'
import { uploadListingPhoto } from '../lib/upload'

const DEPTS: [string, string][] = [
  ['Electronics', 'electronics'], ['Fashion', 'fashion'], ['Home & Garden', 'home_garden'], ['Sport', 'sport'],
  ['Gaming', 'gaming'], ['Motors', 'motors'], ['Kids & Baby', 'kids_baby'], ['Pet Shop', 'pet_shop'],
  ['Retro & Vintage', 'retro_vintage'], ['Property', 'property'], ['Jobs', 'jobs'], ['Handy Help', 'handy_help'],
  ['Collectables', 'collectables'], ['Other', 'other'],
]
const CONDITIONS: [string, string][] = [['New', 'new'], ['Like New', 'like_new'], ['Very Good', 'very_good'], ['Good', 'good'], ['Fair', 'fair']]
const TOWNS = ['Las Palmas', 'Maspalomas', 'Playa del Inglés', 'Telde', 'Arucas', 'Vecindario', 'Gáldar', 'Mogán', 'Other']

export default function CreateListingScreen() {
  const { token } = useAuth()
  const params = useLocalSearchParams<{ category?: string }>()
  const [images, setImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [title, setTitle] = useState('')
  const [dept, setDept] = useState<string>(DEPTS.find(d => d[0] === params.category)?.[1] ?? '')
  const [condition, setCondition] = useState('')
  const [price, setPrice] = useState('')
  const [location, setLocation] = useState('Las Palmas')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const pick = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) { Alert.alert('Permission needed', 'Allow photo access to add images.'); return }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, base64: true, quality: 0.7, allowsMultipleSelection: true, selectionLimit: 8 - images.length })
    if (res.canceled) return
    setUploading(true)
    try {
      const urls: string[] = []
      for (const a of res.assets) { if (a.base64) urls.push(await uploadListingPhoto(a.base64)) }
      setImages(prev => [...prev, ...urls].slice(0, 8))
    } catch (e: any) { Alert.alert('Upload failed', e?.message ?? 'Try again') }
    finally { setUploading(false) }
  }

  const submit = async () => {
    if (!token) { Alert.alert('Please log in', 'Log in to create a listing.', [{ text: 'Log in', onPress: () => router.push('/auth') }, { text: 'Cancel' }]); return }
    if (images.length === 0) { Alert.alert('Add a photo', 'At least one photo is required.'); return }
    if (title.trim().length < 4 || !dept || !condition || !price) { Alert.alert('Missing details', 'Add a title (4+ chars), department, condition and price.'); return }
    setSaving(true)
    try {
      await apiClient(token).listings.create.mutate({
        title: title.trim(), description: description.trim(), price: Number(price),
        department: dept as any, condition: condition as any, images, location, deliveryFee: 0,
      })
      Alert.alert('Listing live!', 'Your item is now on Grabitt.', [{ text: 'OK', onPress: () => router.replace('/(tabs)') }])
    } catch (e: any) { Alert.alert('Could not create listing', e?.message ?? 'Try again') }
    finally { setSaving(false) }
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 16, paddingTop: 56, paddingBottom: 60 }}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={{ fontSize: 24, color: colors.orange }}>‹</Text></TouchableOpacity>
        <Text style={s.heading}>List an item</Text>
      </View>

      {/* Photos */}
      <Text style={s.label}>Photos *</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
        {images.map((u, i) => (
          <View key={u} style={{ marginRight: 8 }}>
            <Image source={{ uri: u }} style={s.photo} />
            <TouchableOpacity style={s.removePhoto} onPress={() => setImages(images.filter((_, j) => j !== i))}><Text style={{ color: '#fff', fontSize: 12 }}>✕</Text></TouchableOpacity>
          </View>
        ))}
        {images.length < 8 && (
          <TouchableOpacity style={s.addPhoto} onPress={pick} disabled={uploading}>
            {uploading ? <ActivityIndicator color={colors.orange} /> : <Text style={{ fontSize: 26, color: colors.orange }}>＋</Text>}
          </TouchableOpacity>
        )}
      </ScrollView>

      <Text style={s.label}>Title *</Text>
      <TextInput value={title} onChangeText={setTitle} placeholder="e.g. iPhone 14 — 128GB Unlocked" placeholderTextColor="#aaa" style={s.input} />

      <Text style={s.label}>Department *</Text>
      <View style={s.chips}>{DEPTS.map(([l, v]) => <Chip key={v} label={l} active={dept === v} onPress={() => setDept(v)} />)}</View>

      <Text style={s.label}>Condition *</Text>
      <View style={s.chips}>{CONDITIONS.map(([l, v]) => <Chip key={v} label={l} active={condition === v} onPress={() => setCondition(v)} />)}</View>

      <Text style={s.label}>Price (€) *</Text>
      <TextInput value={price} onChangeText={setPrice} placeholder="0" placeholderTextColor="#aaa" keyboardType="numeric" style={s.input} />

      <Text style={s.label}>Location</Text>
      <View style={s.chips}>{TOWNS.map(t => <Chip key={t} label={t} active={location === t} onPress={() => setLocation(t)} />)}</View>

      <Text style={s.label}>Description</Text>
      <TextInput value={description} onChangeText={setDescription} placeholder="Describe your item…" placeholderTextColor="#aaa" style={[s.input, { height: 90, textAlignVertical: 'top' }]} multiline />

      <TouchableOpacity style={[s.submit, saving && { opacity: 0.6 }]} onPress={submit} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.submitText}>🚀 Publish listing</Text>}
      </TouchableOpacity>
    </ScrollView>
  )
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={[s.chip, active && s.chipActive]}>
      <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  heading: { fontFamily: 'Nunito', fontSize: 20, fontWeight: '800', color: colors.dark },
  label: { fontFamily: 'Nunito', fontSize: 12, fontWeight: '800', color: '#555', marginBottom: 6, marginTop: 6 },
  input: { backgroundColor: '#fafafa', borderRadius: 10, padding: 12, fontFamily: 'Nunito', fontSize: 14, color: colors.dark, borderWidth: 1, borderColor: '#eee', marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 50, backgroundColor: '#f5f0e8' },
  chipActive: { backgroundColor: colors.orange },
  chipText: { fontFamily: 'Nunito', fontSize: 12, fontWeight: '800', color: '#555' },
  chipTextActive: { color: '#fff' },
  photo: { width: 84, height: 84, borderRadius: 10 },
  removePhoto: { position: 'absolute', top: -6, right: -6, backgroundColor: '#00000099', width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  addPhoto: { width: 84, height: 84, borderRadius: 10, borderWidth: 1.5, borderColor: colors.orange, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  submit: { backgroundColor: colors.orange, borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 18 },
  submitText: { color: '#fff', fontWeight: '900', fontSize: 15, fontFamily: 'Nunito' },
})
