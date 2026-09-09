// Tipos do banco de dados Supabase. Mantenha em sincronia com
// supabase/migrations/0001_init.sql (ou gere via `supabase gen types typescript`
// quando o projeto Supabase estiver provisionado).

export type ProfileRole = "athlete" | "coach";

export type WorkoutStatus = "pending" | "done" | "missed";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          role: ProfileRole;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          role?: ProfileRole;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      strava_tokens: {
        Row: {
          id: string;
          profile_id: string;
          strava_athlete_id: number;
          access_token: string;
          refresh_token: string;
          expires_at: string;
          scope: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          strava_athlete_id: number;
          access_token: string;
          refresh_token: string;
          expires_at: string;
          scope?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["strava_tokens"]["Insert"]>;
        Relationships: [];
      };
      workouts: {
        Row: {
          id: string;
          profile_id: string;
          coach_id: string;
          title: string;
          description: string | null;
          discipline: string;
          scheduled_date: string;
          status: WorkoutStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          coach_id: string;
          title: string;
          description?: string | null;
          discipline?: string;
          scheduled_date: string;
          status?: WorkoutStatus;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["workouts"]["Insert"]>;
        Relationships: [];
      };
      strava_activities: {
        Row: {
          id: string;
          profile_id: string;
          workout_id: string | null;
          strava_activity_id: number;
          name: string;
          type: string;
          distance_meters: number | null;
          moving_time_seconds: number | null;
          start_date: string;
          average_heartrate: number | null;
          raw: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          workout_id?: string | null;
          strava_activity_id: number;
          name: string;
          type: string;
          distance_meters?: number | null;
          moving_time_seconds?: number | null;
          start_date: string;
          average_heartrate?: number | null;
          raw?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["strava_activities"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
