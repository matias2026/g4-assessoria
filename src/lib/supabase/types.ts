// Tipos do banco de dados Supabase. Mantenha em sincronia com
// supabase/migrations/0001_init.sql (ou gere via `supabase gen types typescript`
// quando o projeto Supabase estiver provisionado).

export type ProfileRole = "athlete" | "coach" | "admin";

export type AccessRequestRole = "athlete" | "coach";

export type AccessRequestStatus = "pending" | "approved" | "denied";

export type WorkoutStatus = "pending" | "done" | "missed";

export type WorkoutCompletionSource = "strava" | "manual";

export type WorkoutIntervalType = "warmup" | "steady" | "interval" | "recovery" | "cooldown";

/** Alvo de potência do bloco, em %FTP (zona Coggan) — só faz sentido pra ciclismo. */
export interface IntervalPowerTarget {
  lowPct: number;
  highPct: number;
}

/**
 * Alvo de frequência cardíaca do bloco — zona (1-5, mesma classificação
 * Karvonen do Monitoramento, ver src/lib/hr-zones.ts), não bpm digitado à
 * mão. O bpm de cada zona é calculado na hora (tela e exportação .FIT) a
 * partir da FC máx/repouso cadastrada na ficha do aluno, nunca guardado
 * aqui — assim a mesma prescrição continua válida se a ficha for
 * atualizada depois.
 */
export interface IntervalHrTarget {
  zone: 1 | 2 | 3 | 4 | 5;
}

/** Alvo de cadência do bloco, em rpm (ciclismo) ou passos/min (corrida). */
export interface IntervalCadenceTarget {
  low: number;
  high: number;
}

/**
 * Segmento de treino estruturado (base pra gerar o arquivo .FIT de teste
 * do treinador — ver src/lib/workout-export.ts). Um bloco pode combinar
 * mais de um alvo ao mesmo tempo (ex.: "sprint a 180bpm com cadência a
 * 100rpm") — todos os campos de alvo são independentes e opcionais; nulo/
 * ausente = esse tipo de alvo não se aplica a esse bloco.
 */
export interface WorkoutInterval {
  type: WorkoutIntervalType;
  durationSeconds: number;
  power?: IntervalPowerTarget | null;
  hr?: IntervalHrTarget | null;
  cadence?: IntervalCadenceTarget | null;
}

/** Uma série de um exercício — texto livre em série/rep e carga, como no padrão de apps de musculação. */
export interface ExerciseSet {
  reps: string; // ex.: "4x8"
  load: string; // ex.: "média", "20kg"
  restSeconds: number;
}

/** Um exercício dentro de um treino de Academia — nome, vídeo demonstrativo e as séries. */
export interface PrescribedExercise {
  name: string;
  videoUrl: string | null;
  sets: ExerciseSet[];
}

/** Um treino nomeado (ex.: "Treino 1") dentro da prescrição de Academia — vários por plano, reordenáveis. */
export interface TrainingSession {
  name: string;
  exercises: PrescribedExercise[];
}

/** Configuração de série salva pelo treinador pra reaproveitar em outros exercícios/alunos. */
export interface SetPreset {
  id: string;
  name: string;
  reps: string;
  load: string;
  restSeconds: number;
}

/** Um exercício salvo pelo treinador na biblioteca — nome + vídeo, reutilizável entre prescrições. */
export interface ExerciseLibraryItem {
  id: string;
  name: string;
  videoUrl: string | null;
}

/**
 * Conteúdo de `treinos.conteudo` (jsonb) — a parte da prescrição rica
 * demais pra virar colunas tipadas (blocos, sessões de exercício, zonas,
 * métricas planejadas). Tudo opcional porque a coluna nasce `{}` e é
 * lida de volta como `MockWorkoutDetail` com fallback pra cada campo —
 * ver buildPrescribedWorkout em mock-data.ts.
 */
export interface PrescriptionContent {
  prescription?: {
    warmup: string;
    mainSet: string;
    cooldown: string;
    videoUrl: string | null;
  };
  structuredIntervals?: WorkoutInterval[];
  trainingSessions?: TrainingSession[];
  powerZones?: { zone: string; label: string; plannedMinutes: number; completedMinutes: number }[];
  planned?: {
    durationSeconds: number | null;
    distanceMeters: number | null;
    tss: number | null;
    ifScore: number | null;
    hrMin: number | null;
    hrAvg: number | null;
    hrMax: number | null;
  };
}

/**
 * Conteúdo de `treinos.rascunho` (jsonb) — o que o treinador está
 * montando/editando, nunca visível pro aluno até "Enviar treino" copiar
 * isso pra titulo/modalidade/descricao/conteudo e marcar `enviado`.
 * Mesmos campos de PrescriptionContent + os 3 que ali viram colunas
 * flat só depois de enviado.
 */
export interface PrescriptionDraft extends PrescriptionContent {
  title?: string;
  discipline?: string;
  description?: string;
}

// Resumo + amostras de série temporal — de um arquivo .FIT enviado pelo
// aluno (ver src/lib/fit-import.ts) ou dos streams de uma atividade
// sincronizada via Strava (ver src/lib/strava/client.ts) — salvo pronto em
// `treinos.atividade_fit` pra não reprocessar/rebuscar toda vez que a
// análise carrega (o binário do .FIT fica à parte no Storage,
// `treinos.arquivo_fit_path`, quando a fonte é essa).
export interface UploadedActivity {
  // undefined nos registros antigos (só existiam vindos de .FIT) — trate
  // como "fit" nesse caso.
  source?: "fit" | "strava";
  startedAt: string | null; // ISO, horário real do primeiro registro
  durationSeconds: number | null;
  distanceMeters: number | null;
  avgSpeedKmh: number | null;
  elevationGainMeters: number | null;
  avgCadence: number | null;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  avgPower: number | null;
  maxPower: number | null;
  calories: number | null;
  // Relative Effort (suffer_score) da Strava — só existe quando source é
  // "strava" e a atividade tem FC ou potência. Base do ACWR no Alerta de
  // overtraining quando não há TSS calculado.
  relativeEffort?: number | null;
  samples: {
    timestamp: number;
    distanceMeters: number;
    cadence: number;
    power: number;
    altitudeMeters: number;
    heartRate: number;
    speedKmh: number;
  }[];
}

// Sexo do aluno (dado corporal geral, usado só como referência do treinador).
export type StudentSex = "Masculino" | "Feminino" | "Outro";

// Objetivo principal do aluno na Academia/Força.
export type StrengthGoal = "Hipertrofia" | "Emagrecimento" | "Fortalecimento para endurance";

// Composição corporal — opcional, complementa peso/altura.
export interface BodyComposition {
  bodyFatPct: number | null;
  muscleMassKg: number | null;
  waistCm: number | null;
}

// Perfil físico específico de ciclismo — só preenchido quando o aluno
// pratica a modalidade (principal ou adicional). FTP mora aqui (não mais
// solto em MockStudent) porque é um dado de ciclismo, não um dado geral.
export interface CyclingProfile {
  ftpWatts: number | null;
  hrMax: number | null;
  hrRest: number | null;
  hrThreshold: number | null;
  preferredCadence: number | null;
  peakPowerShort: number | null; // pico curto (sprint), watts
  peakPowerLong: number | null; // pico longo (~20min), watts
  mtbNotes: string; // histórico de MTB (altimetria, TSS, IF) — texto livre
}

// Perfil físico específico de corrida.
export interface RunningProfile {
  thresholdPace: string; // "4:15" (min/km) — texto livre, sem cálculo
  vo2max: number | null;
  hrMax: number | null;
  // Só ciclismo pedia isso até agora — corrida precisa pra calcular bpm de
  // zona de FC nos blocos de treino (fórmula de Karvonen exige FC de
  // repouso, não só máxima).
  hrRest: number | null;
  hrThreshold: number | null;
  pr5k: string;
  pr10k: string;
  prHalfMarathon: string;
  cadence: number | null; // passos/min
  strideLengthCm: number | null;
  verticalOscillationCm: number | null;
}

// Perfil físico específico de academia/força.
export interface StrengthProfile {
  goal: StrengthGoal | null;
  squat1RM: number | null;
  deadlift1RM: number | null;
  benchPress1RM: number | null;
  legPress1RM: number | null;
  focusNotes: string; // foco dos treinos
  asymmetryNotes: string; // assimetrias musculares relatadas
}

/** Última atividade sincronizada exibida no roster do Cockpit. */
export interface LastActivity {
  name: string;
  distanceKm: number;
  date: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: ProfileRole;
          full_name: string;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          role: ProfileRole;
          full_name?: string;
          active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      alunos: {
        Row: {
          id: string;
          nome: string;
          whatsapp: string | null;
          modalidade: string | null;
          ftp: number | null;
          peso: number | null;
          altura: number | null;
          user_id: string | null;
          secondary_disciplines: string[];
          age: number | null;
          sex: StudentSex | null;
          body_composition: BodyComposition | null;
          weight_history_notes: string;
          medical_notes: string;
          cycling_profile: CyclingProfile | null;
          running_profile: RunningProfile | null;
          strength_profile: StrengthProfile | null;
          athlete_report: string;
          coach_notes: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          whatsapp?: string | null;
          modalidade?: string | null;
          ftp?: number | null;
          peso?: number | null;
          altura?: number | null;
          user_id?: string | null;
          secondary_disciplines?: string[];
          age?: number | null;
          sex?: StudentSex | null;
          body_composition?: BodyComposition | null;
          weight_history_notes?: string;
          medical_notes?: string;
          cycling_profile?: CyclingProfile | null;
          running_profile?: RunningProfile | null;
          strength_profile?: StrengthProfile | null;
          athlete_report?: string;
          coach_notes?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["alunos"]["Insert"]>;
        Relationships: [];
      };
      treinos: {
        Row: {
          id: string;
          aluno_id: string | null;
          data: string;
          modalidade: string | null;
          titulo: string | null;
          descricao: string | null;
          duracao_planejada: string | null;
          distancia_planejada: number | null;
          tss_planejado: number | null;
          concluido: boolean | null;
          duracao_real: string | null;
          distancia_real: number | null;
          tss_real: number | null;
          rpe_esforco: number | null;
          sensacao: number | null;
          comentarios: string | null;
          arquivo_fit_path: string | null;
          atividade_fit: UploadedActivity | null;
          conteudo: PrescriptionContent;
          rascunho: PrescriptionDraft;
          enviado: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          aluno_id?: string | null;
          data: string;
          modalidade?: string | null;
          titulo?: string | null;
          descricao?: string | null;
          duracao_planejada?: string | null;
          distancia_planejada?: number | null;
          tss_planejado?: number | null;
          concluido?: boolean | null;
          duracao_real?: string | null;
          distancia_real?: number | null;
          tss_real?: number | null;
          rpe_esforco?: number | null;
          sensacao?: number | null;
          comentarios?: string | null;
          arquivo_fit_path?: string | null;
          atividade_fit?: UploadedActivity | null;
          conteudo?: PrescriptionContent;
          rascunho?: PrescriptionDraft;
          enviado?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["treinos"]["Insert"]>;
        Relationships: [];
      };
      exercise_library: {
        Row: {
          id: string;
          name: string;
          video_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          video_url?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["exercise_library"]["Insert"]>;
        Relationships: [];
      };
      aluno_notes: {
        Row: {
          aluno_id: string;
          notes: string;
          updated_at: string;
        };
        Insert: {
          aluno_id: string;
          notes?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["aluno_notes"]["Insert"]>;
        Relationships: [];
      };
      access_requests: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          password: string | null;
          phone: string | null;
          role_requested: AccessRequestRole;
          message: string | null;
          status: AccessRequestStatus;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
          birth_date: string | null;
          weight_kg: number | null;
          height_cm: number | null;
          medical_notes: string | null;
          modalidade: string | null;
          training_experience: "iniciante" | "experiente" | null;
        };
        Insert: {
          id?: string;
          full_name: string;
          email: string;
          password?: string | null;
          phone?: string | null;
          role_requested: AccessRequestRole;
          message?: string | null;
          status?: AccessRequestStatus;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          birth_date?: string | null;
          weight_kg?: number | null;
          height_cm?: number | null;
          medical_notes?: string | null;
          modalidade?: string | null;
          training_experience?: "iniciante" | "experiente" | null;
        };
        Update: Partial<Database["public"]["Tables"]["access_requests"]["Insert"]>;
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
          warmup_text: string | null;
          main_set_text: string | null;
          cooldown_text: string | null;
          video_url: string | null;
          planned_duration_seconds: number | null;
          planned_distance_meters: number | null;
          planned_tss: number | null;
          planned_if: number | null;
          planned_hr_min: number | null;
          planned_hr_avg: number | null;
          planned_hr_max: number | null;
          structured_intervals: WorkoutInterval[] | null;
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
          warmup_text?: string | null;
          main_set_text?: string | null;
          cooldown_text?: string | null;
          video_url?: string | null;
          planned_duration_seconds?: number | null;
          planned_distance_meters?: number | null;
          planned_tss?: number | null;
          planned_if?: number | null;
          planned_hr_min?: number | null;
          planned_hr_avg?: number | null;
          planned_hr_max?: number | null;
          structured_intervals?: WorkoutInterval[] | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["workouts"]["Insert"]>;
        Relationships: [];
      };
      workout_completions: {
        Row: {
          id: string;
          workout_id: string;
          profile_id: string;
          source: WorkoutCompletionSource;
          strava_activity_id: string | null;
          duration_seconds: number | null;
          distance_meters: number | null;
          tss: number | null;
          if_score: number | null;
          hr_min: number | null;
          hr_avg: number | null;
          hr_max: number | null;
          rpe: number | null;
          feeling: number | null;
          comments: string | null;
          ai_feedback_draft: string | null;
          coach_feedback: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workout_id: string;
          profile_id: string;
          source?: WorkoutCompletionSource;
          strava_activity_id?: string | null;
          duration_seconds?: number | null;
          distance_meters?: number | null;
          tss?: number | null;
          if_score?: number | null;
          hr_min?: number | null;
          hr_avg?: number | null;
          hr_max?: number | null;
          rpe?: number | null;
          feeling?: number | null;
          comments?: string | null;
          ai_feedback_draft?: string | null;
          coach_feedback?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["workout_completions"]["Insert"]>;
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
          relative_effort: number | null;
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
          relative_effort?: number | null;
          raw?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["strava_activities"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      check_rate_limit: {
        Args: { p_key: string; p_window_seconds: number; p_max: number };
        Returns: boolean;
      };
    };
  };
}
