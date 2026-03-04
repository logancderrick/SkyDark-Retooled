export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time?: string;
  all_day?: boolean;
  location?: string;
  calendar_id?: string[];
  recurrence_rule?: string;
  external_id?: string;
  external_source?: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  color: string;
  initial?: string;
  avatar_url?: string;
  sort_order?: number;
}
