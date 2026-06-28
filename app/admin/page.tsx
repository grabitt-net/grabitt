import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AdminApp from '@/components/admin/AdminApp'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    redirect('/?error=unauthorized')
  }

  // Fetch all data for the admin app
  const [
    { data: contacts },
    { data: members },
    { data: disputes },
    { data: reports },
    { data: banners },
    { data: orders },
    { data: listings },
  ] = await Promise.all([
    supabase.from('crm_contacts').select('*').order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, full_name, email, grade, status, is_seller, created_at, seller_rating, seller_review_count, buyer_review_count').order('created_at', { ascending: false }),
    supabase.from('disputes').select('*, orders!order_id(id, amount), raised_by:profiles!raised_by(full_name, email)').order('created_at', { ascending: false }),
    supabase.from('reports').select('*, reported_by:profiles!reported_by(full_name), listings!listing_id(title)').order('created_at', { ascending: false }),
    supabase.from('banners').select('*, crm_contacts!rented_to(name, company)').order('created_at', { ascending: false }),
    supabase.from('orders').select('id, amount, status, created_at, buyer_id, seller_id').order('created_at', { ascending: false }).limit(100),
    supabase.from('listings').select('id, title, status, created_at, price').order('created_at', { ascending: false }).limit(100),
  ])

  return (
    <AdminApp
      contacts={contacts ?? []}
      members={members ?? []}
      disputes={disputes ?? []}
      reports={reports ?? []}
      banners={banners ?? []}
      orders={orders ?? []}
      listings={listings ?? []}
    />
  )
}
