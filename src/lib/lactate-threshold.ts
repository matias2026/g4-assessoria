// Detecção automática de limiares de lactato a partir dos estágios de um
// teste incremental — pura matemática sobre os pontos coletados, sem
// nenhuma chamada externa. Métodos usados (decisão registrada aqui, não
// escondida):
//
// - LT1 (limiar aeróbico): OBLA (Onset of Blood Lactate Accumulation) em
//   2.0 mmol/L, por interpolação linear entre os dois estágios que
//   cercam esse valor. Protocolo fixo e bem documentado, mais simples e
//   previsível que um método de curva pra esse limiar.
// - LT2 (limiar anaeróbico): Dmax modificado (Bishop et al. 1998) — ajusta
//   um polinômio de 3º grau aos pontos a partir da primeira subida
//   sustentada de lactato (≥0.4 mmol/L entre estágios consecutivos),
//   traça uma reta do primeiro ao último ponto dessa faixa e encontra o
//   ponto da curva com maior distância perpendicular a essa reta (eixos
//   normalizados 0–1, senão a escala de potência dominaria a distância
//   sobre a escala de lactato).
//
// Sempre um PONTO DE PARTIDA pro treinador revisar, nunca a palavra
// final — a UI sempre deixa sobrescrever manualmente (ver PhysiologyTab).

export interface LactateStagePoint {
  intensity: number | null; // potência (W) — corrida usa pace, fora do escopo da detecção automática por ora
  lactate: number | null;
  fc: number | null;
}

export interface DetectedThresholds {
  lt1Intensity: number | null;
  lt1Fc: number | null;
  lt2Intensity: number | null;
  lt2Fc: number | null;
}

function validPoints(stages: LactateStagePoint[]): { intensity: number; lactate: number; fc: number | null }[] {
  return stages
    .filter((s): s is { intensity: number; lactate: number; fc: number | null } => s.intensity != null && s.lactate != null)
    .sort((a, b) => a.intensity - b.intensity);
}

// Interpola a intensidade onde o lactato cruza `target` (OBLA) — só
// considera cruzamentos ascendentes (lactato sobe com a intensidade, o
// que é sempre o esperado num teste incremental de verdade).
function interpolateAtLactate(points: { intensity: number; lactate: number }[], target: number): number | null {
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    if (prev.lactate <= target && curr.lactate >= target && curr.lactate !== prev.lactate) {
      const t = (target - prev.lactate) / (curr.lactate - prev.lactate);
      return Math.round((prev.intensity + t * (curr.intensity - prev.intensity)) * 10) / 10;
    }
  }
  return null;
}

// Interpola a FC na intensidade encontrada, a partir dos mesmos estágios
// (fc é opcional por estágio — estágios sem FC registrada são ignorados).
function interpolateFcAtIntensity(stages: LactateStagePoint[], intensity: number | null): number | null {
  if (intensity == null) return null;
  const points = stages
    .filter((s): s is { intensity: number; lactate: number | null; fc: number } => s.intensity != null && s.fc != null)
    .sort((a, b) => a.intensity - b.intensity);
  if (points.length === 0) return null;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    if (intensity >= prev.intensity && intensity <= curr.intensity && curr.intensity !== prev.intensity) {
      const t = (intensity - prev.intensity) / (curr.intensity - prev.intensity);
      return Math.round(prev.fc + t * (curr.fc - prev.fc));
    }
  }
  // Fora da faixa coletada (ex.: LT2 acima do último estágio) — usa o
  // ponto mais próximo em vez de extrapolar uma reta além do que foi
  // medido de verdade.
  const closest = points.reduce((a, b) => (Math.abs(b.intensity - intensity) < Math.abs(a.intensity - intensity) ? b : a));
  return closest.fc;
}

// Regressão polinomial por mínimos quadrados (equações normais + eliminação
// de Gauss) — sem dependência externa, só pra esse ajuste de 3º grau.
function polyfit(xs: number[], ys: number[], degree: number): number[] | null {
  const n = xs.length;
  const cols = degree + 1;
  // Matriz normal (cols x cols) e vetor (cols)
  const ata: number[][] = Array.from({ length: cols }, () => new Array(cols).fill(0));
  const atb: number[] = new Array(cols).fill(0);

  for (let i = 0; i < n; i++) {
    const powers = new Array(cols).fill(1).map((_, k) => Math.pow(xs[i], k));
    for (let r = 0; r < cols; r++) {
      atb[r] += powers[r] * ys[i];
      for (let c = 0; c < cols; c++) {
        ata[r][c] += powers[r] * powers[c];
      }
    }
  }

  // Eliminação de Gauss com pivoteamento parcial.
  for (let col = 0; col < cols; col++) {
    let pivot = col;
    for (let row = col + 1; row < cols; row++) {
      if (Math.abs(ata[row][col]) > Math.abs(ata[pivot][col])) pivot = row;
    }
    if (Math.abs(ata[pivot][col]) < 1e-10) return null; // matriz singular — pontos insuficientes/colineares
    [ata[col], ata[pivot]] = [ata[pivot], ata[col]];
    [atb[col], atb[pivot]] = [atb[pivot], atb[col]];

    for (let row = 0; row < cols; row++) {
      if (row === col) continue;
      const factor = ata[row][col] / ata[col][col];
      for (let c = col; c < cols; c++) ata[row][c] -= factor * ata[col][c];
      atb[row] -= factor * atb[col];
    }
  }

  return ata.map((row, i) => atb[i] / row[i]);
}

function evalPoly(coeffs: number[], x: number): number {
  return coeffs.reduce((sum, c, i) => sum + c * Math.pow(x, i), 0);
}

function perpendicularDistance(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  const num = Math.abs((b.y - a.y) * p.x - (b.x - a.x) * p.y + b.x * a.y - b.y * a.x);
  const den = Math.sqrt((b.y - a.y) ** 2 + (b.x - a.x) ** 2);
  return den === 0 ? 0 : num / den;
}

function detectDmaxModificado(points: { intensity: number; lactate: number }[]): number | null {
  if (points.length < 4) return null; // pontos de menos pra um ajuste de 3º grau confiável

  // Primeira subida sustentada (≥0.4 mmol/L entre estágios consecutivos) —
  // o ajuste usa só a partir do estágio anterior a essa subida (método
  // "modificado" de Bishop, em vez do Dmax clássico que usa todos os
  // pontos desde o repouso).
  let riseIndex = 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i].lactate - points[i - 1].lactate >= 0.4) {
      riseIndex = i - 1;
      break;
    }
  }

  const fitPoints = points.slice(riseIndex);
  if (fitPoints.length < 4) return null;

  const xs = fitPoints.map((p) => p.intensity);
  const ys = fitPoints.map((p) => p.lactate);
  const coeffs = polyfit(xs, ys, 3);
  if (!coeffs) return null;

  const xMin = xs[0];
  const xMax = xs[xs.length - 1];
  const yValues = xs.map((x) => evalPoly(coeffs, x));
  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);
  if (xMax === xMin || yMax === yMin) return null;

  const norm = (x: number, y: number) => ({ x: (x - xMin) / (xMax - xMin), y: (y - yMin) / (yMax - yMin) });
  const a = norm(xMin, evalPoly(coeffs, xMin));
  const b = norm(xMax, evalPoly(coeffs, xMax));

  let bestX: number | null = null;
  let maxDist = -1;
  const steps = 200;
  for (let i = 0; i <= steps; i++) {
    const x = xMin + ((xMax - xMin) * i) / steps;
    const y = evalPoly(coeffs, x);
    const dist = perpendicularDistance(norm(x, y), a, b);
    if (dist > maxDist) {
      maxDist = dist;
      bestX = x;
    }
  }

  return bestX != null ? Math.round(bestX * 10) / 10 : null;
}

/**
 * Detecta LT1 (OBLA 2.0 mmol/L) e LT2 (Dmax modificado) a partir dos
 * estágios com potência preenchida — retorna null pros valores que não
 * dá pra calcular (poucos pontos, lactato nunca cruza 2.0/4.0 etc.), nunca
 * inventa um número. Só funciona pra teste por potência (ciclismo); teste
 * por pace (corrida) não entra na detecção automática nesta versão — o
 * treinador marca manualmente.
 */
export function detectThresholds(stages: LactateStagePoint[]): DetectedThresholds {
  const points = validPoints(stages);
  if (points.length < 2) {
    return { lt1Intensity: null, lt1Fc: null, lt2Intensity: null, lt2Fc: null };
  }

  const lt1Intensity = interpolateAtLactate(points, 2.0);
  const lt2Intensity = detectDmaxModificado(points);

  return {
    lt1Intensity,
    lt1Fc: interpolateFcAtIntensity(stages, lt1Intensity),
    lt2Intensity,
    lt2Fc: interpolateFcAtIntensity(stages, lt2Intensity),
  };
}
