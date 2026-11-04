export type Stage = "new" | "contacted" | "quoted" | "won" | "lost";
export type QuoteStatus = "draft" | "sent" | "viewed" | "accepted" | "declined" | "expired";
export type SubjectType = "quote" | "invoice" | "lead";

export interface Business {
  id: string;
  name: string;
  industry: string | null;
  city: string | null;
  owner_name: string | null;
  phone: string | null;
  sending_enabled: boolean;
  is_demo: boolean;
}
export interface Contact {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
}
export interface Lead {
  id: string;
  contact_id: string | null;
  title: string;
  source: string;
  stage: Stage;
  value: number;
  notes: string | null;
  lost_reason: string | null;
  first_response_at: string | null;
  last_touch_at: string | null;
  created_at: string;
}
export interface LineItem {
  description: string;
  qty: number;
  unit: number;
}
export interface Quote {
  id: string;
  lead_id: string | null;
  contact_id: string | null;
  number: string;
  title: string;
  items: LineItem[];
  amount: number;
  status: QuoteStatus;
  public_token: string;
  sent_at: string | null;
  viewed_at: string | null;
  decided_at: string | null;
  accepted_by: string | null;
  valid_until: string | null;
  chase_paused: boolean;
  created_at: string;
}
export interface Invoice {
  id: string;
  contact_id: string | null;
  quote_id: string | null;
  number: string;
  title: string;
  amount: number;
  paid: number;
  issued_on: string;
  due_on: string;
  paid_on: string | null;
  chase_paused: boolean;
  created_at: string;
}
export interface Message {
  id: string;
  contact_id: string | null;
  subject_type: SubjectType;
  subject_id: string;
  step: number | null;
  direction: "out" | "in";
  channel: "email" | "sms";
  status: "queued" | "sent" | "skipped" | "received";
  subject: string | null;
  body: string;
  due_at: string;
  sent_at: string | null;
  created_at: string;
}
export interface Activity {
  id: string;
  subject_type: SubjectType;
  subject_id: string;
  kind: string;
  body: string;
  created_at: string;
}
export interface CadenceStep {
  day: number;
  channel: "email" | "sms";
  label: string;
  subject: string | null;
  body: string;
}
export type Cadences = Record<SubjectType, CadenceStep[]>;
