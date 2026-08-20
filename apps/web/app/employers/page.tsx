import { redirect } from 'next/navigation'

// The old /employers URL — the page is now "For Business" at /for-business.
export default function EmployersRedirect() {
  redirect('/for-business')
}
