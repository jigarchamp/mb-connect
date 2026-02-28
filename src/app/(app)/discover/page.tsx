import { redirect } from 'next/navigation'

// Catalog has moved to the public home page
export default function DiscoverPage() {
  redirect('/')
}
