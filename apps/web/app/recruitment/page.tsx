import { redirect } from 'next/navigation'

// The old Recruitment hub (Find Work / Find Staff chooser) has been removed —
// Recruitment now goes straight to the jobs results page, where employers post
// via the "Post a Job" button. Keep this route as a redirect so any existing
// links or bookmarks still land somewhere sensible.
export default function RecruitmentPage() {
  redirect('/jobs')
}
