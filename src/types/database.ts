export type Role = 'scout' | 'counselor' | 'leader' | 'admin'
export type Rank = 'scout' | 'tenderfoot' | 'second_class' | 'first_class' | 'star' | 'life' | 'eagle'
export type LocationType = 'in_person' | 'virtual' | 'hybrid'
export type ClassStatus = 'draft' | 'open' | 'full' | 'closed' | 'cancelled'
export type RegistrationStatus = 'registered' | 'waitlisted' | 'cancelled'
export type NotificationType = 'class_opened' | 'class_reminder' | 'waitlist_available'
export type CompletionSource = 'manual' | 'scoutbook_import'

export interface Troop {
  id: string
  name: string
  unit_number: string
  council_name: string | null
  city: string | null
  state: string | null
  created_at: string
}

export interface Profile {
  id: string
  troop_id: string | null
  role: Role
  first_name: string
  last_name: string
  phone: string | null
  rank: Rank | null
  patrol: string | null
  bsa_member_id: string | null
  date_of_birth: string | null
  created_at: string
  updated_at: string
}

export interface Invitation {
  id: string
  troop_id: string
  email: string | null
  role: Role
  invited_by: string | null
  token: string
  invited_at: string
  accepted_at: string | null
}

export interface MeritBadge {
  id: string
  bsa_badge_id: string | null
  name: string
  description: string | null
  eagle_required: boolean
  category: string
  requirements: { number: string; text: string }[] | null
  image_url: string | null
  created_at: string
}

export interface MBClass {
  id: string
  troop_id: string
  merit_badge_id: string
  counselor_id: string
  description: string | null
  location: string | null
  location_type: LocationType
  session_date: string
  session_time: string | null
  duration_hours: number | null
  capacity: number | null
  status: ClassStatus
  prerequisites: string | null
  materials: string | null
  created_at: string
  updated_at: string
}

export interface Registration {
  id: string
  scout_id: string
  class_id: string
  status: RegistrationStatus
  registered_at: string
}

export interface Interest {
  id: string
  scout_id: string
  merit_badge_id: string
  created_at: string
}

export interface Completion {
  id: string
  scout_id: string
  merit_badge_id: string
  completed_date: string | null
  counselor_name: string | null
  source: CompletionSource
  notes: string | null
  created_at: string
}

export const RANK_LABELS: Record<Rank, string> = {
  scout: 'Scout',
  tenderfoot: 'Tenderfoot',
  second_class: 'Second Class',
  first_class: 'First Class',
  star: 'Star Scout',
  life: 'Life Scout',
  eagle: 'Eagle Scout',
}

export const RANK_ORDER: Rank[] = [
  'scout', 'tenderfoot', 'second_class', 'first_class', 'star', 'life', 'eagle'
]
