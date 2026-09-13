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
  start_date: string; // ISO, UTC
  start_date_local: string; // ISO, já ajustado pro fuso do atleta — usado pra casar com treinos.data
  average_heartrate?: number;
}

// Streams de uma atividade (/activities/{id}/streams?key_by_type=true) —
// cada chave só existe se o sensor/GPS correspondente gravou aquilo
// (ex.: corrida sem monitor de potência não tem "watts").
export interface StravaStreamSet {
  time?: number[]; // segundos desde o início
  distance?: number[]; // metros acumulados
  heartrate?: number[]; // bpm
  watts?: number[];
  cadence?: number[];
  altitude?: number[]; // metros
  velocity_smooth?: number[]; // m/s
}
