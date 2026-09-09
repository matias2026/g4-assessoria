# G4 Assessoria Esportiva

Plataforma web para a assessoria esportiva G4 (ciclismo, corrida e academia),
com design inspirado no [TrainingPeaks](https://www.trainingpeaks.com/): o
atleta acompanha o treino prescrito do dia, compara Planejado vs. Concluído
e conecta o Strava; o treinador acompanha todos os alunos em um cockpit
único.

Construído para rodar 100% em planos gratuitos: **Vercel** (hospedagem),
**Supabase** (banco de dados e autenticação) e **Strava API** (dados de
atividades).

## Stack

- [Next.js 16](https://nextjs.org/docs) (App Router) + TypeScript
- [Tailwind CSS](https://tailwindcss.com) com a identidade visual G4
- [Supabase](https://supabase.com) (Postgres, Auth, RLS)
- [Strava API](https://developers.strava.com) (OAuth2 + atividades)

## Como rodar localmente

```bash
npm install
cp .env.example .env.local   # preencha as chaves (veja abaixo)
npm run dev
```

Abra `http://localhost:3000`.

> As telas de Atleta (`/dashboard`), Cockpit do Treinador (`/cockpit`) e o
> detalhe de treino (`/dashboard/treinos/[id]`, `/cockpit/treinos/[id]`) usam
> dados de exemplo (`src/lib/mock-data.ts`) até a integração real com
> Supabase ser conectada — veja os `TODO` nas páginas correspondentes.

## Variáveis de ambiente

Veja `.env.example`. Resumo:

| Variável | Onde obter |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Projeto Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Idem (uso exclusivo em servidor) |
| `STRAVA_CLIENT_ID` / `STRAVA_CLIENT_SECRET` | App em strava.com/settings/api |

## Banco de dados

O schema está em `supabase/migrations/`:

- **`0001_init.sql`**
  - **profiles** — usuários (`athlete` ou `coach`), 1:1 com `auth.users`.
  - **strava_tokens** — tokens OAuth do Strava por atleta.
  - **workouts** — treinos prescritos pelo treinador para cada atleta.
  - **strava_activities** — atividades importadas do Strava, opcionalmente
    vinculadas a um treino prescrito.
- **`0002_workout_details.sql`** — módulo de treino no padrão TrainingPeaks:
  - `workouts` ganha prescrição estruturada (`warmup_text`, `main_set_text`,
    `cooldown_text`, `video_url`) e métricas planejadas (duração, distância,
    TSS, IF, FC mín/média/máx).
  - **workout_completions** — dados reais do treino (via Strava ou
    lançamento manual do treinador), com as mesmas métricas do planejado
    mais feedback subjetivo do atleta (`rpe` 1–10, `feeling` 1–5, comentário).
    Ritmo/velocidade média não é armazenado: é calculado a partir de
    distância + duração em `src/lib/workout-metrics.ts`.

Todas as tabelas têm Row Level Security habilitada. Aplique o schema criando
um projeto gratuito em [supabase.com](https://supabase.com) e rodando:

```bash
supabase link --project-ref <seu-projeto>
supabase db push
```

## Integração com o Strava

Fluxo OAuth já estruturado em `src/lib/strava` e nas rotas:

- `GET /api/strava/connect` — inicia o OAuth para o atleta autenticado.
- `GET /api/strava/callback` — troca o `code` por tokens e salva em `strava_tokens`.
- `POST /api/strava/sync` — renova o token se necessário e importa atividades
  recentes para `strava_activities`.

Para preencher a coluna "Concluído" de um treino a partir do Strava, associe
a atividade sincronizada (`strava_activities`) ao `workout_id` correspondente
e grave o resultado em `workout_completions` com `source = 'strava'`; o
lançamento manual do treinador usa `source = 'manual'` na mesma tabela.

Cadastre a aplicação em [strava.com/settings/api](https://www.strava.com/settings/api)
com o Authorization Callback Domain apontando para seu domínio (ou
`localhost` em desenvolvimento).

## Estrutura de pastas

```
src/
  app/
    (athlete)/dashboard/          Home do atleta (mobile first)
      treinos/[id]/               Detalhe do treino (Planejado vs. Concluído)
    (coach)/cockpit/              Cockpit do treinador (desktop)
      treinos/[id]/               Mesmo detalhe de treino, visão do treinador
    api/strava/                   Rotas do fluxo OAuth e sincronização
    layout.tsx, page.tsx          Layout raiz e landing
  components/
    ui/                           Button, Card, Badge, StatusDot — base visual G4
    athlete/                      Componentes da Home do atleta
    coach/                        Componentes do Cockpit do treinador
    workout/                      Prescrição, comparação Planejado vs. Concluído, feedback subjetivo
  lib/
    supabase/                     Clientes (browser, server, admin) e tipos do banco
    strava/                       Cliente OAuth/API do Strava
    workout-metrics.ts            Formatação de duração, pace/velocidade, RPE, sensação
    mock-data.ts                  Dados de exemplo para as telas
supabase/
  migrations/
    0001_init.sql                 Schema inicial + RLS
    0002_workout_details.sql      Prescrição, métricas planejadas e workout_completions
```

## Identidade visual

Painel claro estilo TrainingPeaks: fundo branco/cinza-claro (`g4-bg`,
`g4-surface`), texto em preto fosco (`g4-ink`). O verde neon/lima (`lime`) é
reservado para ações principais, ícones de status e barras de progresso —
ver `tailwind.config.ts`. Fonte [Inter](https://fonts.google.com/specimen/Inter)
carregada via `next/font`.
