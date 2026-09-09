// Formatos mínimos da API do Strava usados pela integração.
// Referência: https://developers.strava.com/docs/reference/

export interface StravaTokenResponse {
  token_type: string;
  expires_at: number; // epoch seconds
  expires_in: number;
  refresh_token: string;
  access_token: string;
  athlete?: { id: number };
}

export interface StravaSummaryActivity {
  id: number;
  name: string;
  type: string;
  distance: number; // metros
  moving_time: number; // segundos
  start_date: string; // ISO
  average_heartrate?: number;
}
