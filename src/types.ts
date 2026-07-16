export interface Participant {
  id: string;
  name: string;
  phone: string;
  nickname: string;
  email: string;
  created_at: string;
}

export interface Team {
  id: number;
  name: string;
  confederation: string;
  flag_emoji: string;
}

export interface Ticket {
  id: string;
  participant_id: string;
  payment_status: 'pending' | 'confirmed';
  payment_receipt_url: string | null;
  assigned_team: string | null;
  created_at: string;
  // Join properties
  participants?: Participant;
}

export interface Match {
  id: number;
  jornada: number;
  local_team: string;
  visitor_team: string;
  match_date: string;
  score_local: number | null;
  score_visitor: number | null;
  result: 'L' | 'E' | 'V' | null;
  status: 'pending' | 'finished';
  created_at: string;
}

export interface QuinielaRegistration {
  id: string;
  participant_id: string;
  jornada: number;
  payment_status: 'pending' | 'confirmed';
  payment_receipt_url: string | null;
  quiniela_image_url: string | null;
  points: number;
  created_at: string;
  // Join properties
  participants?: Participant;
  forecasts?: QuinielaForecast[];
}

export interface QuinielaForecast {
  id: string;
  registration_id: string;
  match_id: number;
  prediction: 'L' | 'E' | 'V';
  created_at: string;
  // Join properties
  matches?: Match;
}

export interface BankDetails {
  banco: string;
  cuenta: string;
  clabe: string;
  titular: string;
  concepto?: string;
  zelle?: string;
  zelle_titular?: string;
  zelle_usd?: number;
}

export interface Prices {
  ticket_tombola: number;
  jornada_quiniela: number;
}

export interface Links {
  live_stream: string;
  rules: string;
}

export interface TombolaStatus {
  drawn: boolean;
  draw_date: string;
  drawn_by: string | null;
}
