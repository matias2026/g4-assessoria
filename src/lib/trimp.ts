import type { StudentSex } from "./supabase/types";

export interface TrimpInput {
  avgHeartRate: number;
  durationSeconds: number;
  hrRest: number;
  hrMax: number;
  sex: StudentSex | null;
}

/**
 * TRIMP (Training Impulse, Banister) — carga de treino a partir só de FC
 * média + duração, ponderando o quanto a FC média da sessão está perto da
 * reserva cardíaca do aluno (FC máx - FC repouso) com peso exponencial (uma
 * sessão bem intensa pesa desproporcionalmente mais que uma tranquila mais
 * longa, igual o corpo realmente sente). Não depende de potência nem de
 * FTP calibrado — funciona pra qualquer sessão com FC média registrada,
 * tanto de .FIT quanto de Strava.
 *
 * A fórmula original tem coeficientes diferentes por sexo (validados em
 * populações separadas na pesquisa original) — "Outro"/sem sexo cadastrado
 * usa os coeficientes masculinos como aproximação razoável, na falta de um
 * conjunto de coeficientes próprio.
 */
export function computeTrimp({ avgHeartRate, durationSeconds, hrRest, hrMax, sex }: TrimpInput): number | null {
  if (hrMax <= hrRest) return null; // perfil de FC inconsistente — não dá pra calcular reserva cardíaca

  const hrr = (avgHeartRate - hrRest) / (hrMax - hrRest);
  if (hrr <= 0) return 0; // FC média abaixo do repouso cadastrado — sem carga cardiovascular real

  const clampedHrr = Math.min(hrr, 1.2); // tolera um pouco acima de 1.0 (FC média momentânea > FC máx cadastrada), sem deixar explodir
  const durationMinutes = durationSeconds / 60;

  const isFeminino = sex === "Feminino";
  const k = isFeminino ? 0.86 : 0.64;
  const y = isFeminino ? 1.67 : 1.92;

  return Math.round(durationMinutes * clampedHrr * k * Math.exp(y * clampedHrr) * 10) / 10;
}
