import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import CreateListingForm from '@/components/marketplace/CreateListingForm'

export default async function NewListingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug, icon')
    .eq('is_active', true)
    .order('sort_order')

  return <CreateListingForm categories={categories ?? []} userId={user.id} />
}
