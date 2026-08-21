import { redirect } from 'next/navigation'

// The manual CV builder was retired — a candidate's CV is now generated from the
// roles, experience and languages they tick in Account → Employment. Keep this
// route as a redirect so any old links/bookmarks land in the right place.
export default function CvPage() {
  redirect('/account?section=employment')
}
