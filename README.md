# G4 Assessoria Esportiva

Plataforma web para a assessoria esportiva G4 (ciclismo, corrida e academia).
As visões de atleta e treinador são deliberadamente diferentes:

- **Atleta** — extremamente simples, pensada para o celular: Treino do Dia,
  Botões de Ação (concluir, exportar para o relógio, abrir no Garmin Connect,
  falar com o treinador) e Feedback do Professor.
- **Treinador** — painel completo e analítico, estilo
  [TrainingPeaks](https://www.trainingpeaks.com/): Planejado vs. Concluído,
  TSS, IF, zonas de potência/FC e um cockpit com todos os alunos.

Construído para rodar 100% em planos gratuitos: **Vercel** (hospedagem),
**Supabase** (banco de dados e autenticação), **Strava API** (atividades) e
a camada gratuita do **Gemini** (rascunho de feedback).

## Stack

- [Next.js 16](https://nextjs.org/docs) (App Router) + TypeScript
- [Tailwind CSS](https://tailwindcss.com) com a identidade visual G4
- [Supabase](https://supabase.com) (Postgres, Auth, RLS)
- [Strava API](https://developers.strava.com) (OAuth2 + atividades)
- [Gemini API](https://ai.google.dev) (rascunho de feedback pós-treino)

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
| `GEMINI_API_KEY` | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) (camada gratuita) |

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
- **`0003_gps_whatsapp_ai_feedback.sql`**:
  - `profiles.phone` — telefone (E.164) usado nos links `wa.me`.
  - `workouts.structured_intervals` — segmentos (`warmup`/`interval`/
    `recovery`/`cooldown`, duração, %FTP), base real para gerar o `.ZWO`.
  - `workout_completions.ai_feedback_draft` / `coach_feedback` — rascunho
    gerado por IA e a versão final do treinador (o que o atleta vê).

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

## Exportação para GPS (Garmin/Wahoo)

`src/lib/workout-export.ts` gera um arquivo **.ZWO** (formato de treino
estruturado do Zwift, importável em relógios Garmin/Wahoo) a partir de
`workouts.structured_intervals` — potência sempre em %FTP. O download roda
inteiro no navegador (`DownloadZwoButton`), sem round-trip ao servidor. Hoje
cobre só ciclismo; corrida/academia usariam zonas de ritmo, fora do escopo
atual (`canExportZwo` esconde o botão quando não aplicável).

O botão "Abrir no Garmin Connect" aponta para `connect.garmin.com/modern/`
— em um celular com o app instalado, o link universal abre o app; sem o
app, abre o painel web.

## WhatsApp

`src/lib/whatsapp.ts` monta links `wa.me` com o texto já preenchido:

- Cockpit do treinador → "Enviar via WhatsApp" no detalhe do treino, com o
  texto da prescrição do dia formatado para o aluno.
- Painel do atleta → botão rápido "Falar com o treinador", na Home e no
  detalhe do treino.

Os números vêm de `profiles.phone` (mock por enquanto — veja `mockWorkoutDetails`).

## Feedback híbrido (treinador + IA)

`src/lib/ai/gemini.ts` chama a API do Gemini (`POST /api/ai/draft-feedback`,
exige treinador autenticado) para gerar um **rascunho** de feedback
comparando planejado vs. concluído. O `AiFeedbackComposer` (Cockpit) deixa o
treinador gerar, editar e só então enviar — o rascunho de IA nunca chega ao
atleta sem revisão humana. O atleta vê o resultado no `CoachFeedbackCard`:
o comentário final do treinador, com um selo "✨ com apoio de IA" quando
houve rascunho, mais o RPE/sensação que ele mesmo registrou.

## Estrutura de pastas

```
src/
  app/
    (athlete)/dashboard/          Home do atleta (mobile first)
      treinos/[id]/               Detalhe do treino — AthleteWorkoutView
    (coach)/cockpit/              Cockpit do treinador (desktop)
      treinos/[id]/               Detalhe do treino — CoachWorkoutView
    api/strava/                   Rotas do fluxo OAuth e sincronização
    api/ai/draft-feedback/        Rascunho de feedback via Gemini
    layout.tsx, page.tsx          Layout raiz e landing
  components/
    ui/                           Button, Card, Badge, StatusDot — base visual G4
    athlete/                      Componentes da Home do atleta
    coach/                        Componentes do Cockpit do treinador
    workout/
      AthleteWorkoutView          Treino do Dia + Ações + Feedback do Professor
      CoachWorkoutView            Prescrição + Planejado vs. Concluído + zonas + composer de IA
      ZonesChart                  Zonas de potência/FC (planejado vs. concluído)
      DownloadZwoButton           Exporta .ZWO no navegador
      AiFeedbackComposer          Gera/edita/envia feedback (treinador)
      CoachFeedbackCard           Feedback exibido ao atleta
  lib/
    supabase/                     Clientes (browser, server, admin) e tipos do banco
    strava/                       Cliente OAuth/API do Strava
    ai/gemini.ts                  Cliente da API do Gemini
    workout-export.ts             Gerador do arquivo .ZWO
    whatsapp.ts                   Links wa.me e texto formatado do treino
    workout-metrics.ts            Formatação de duração, pace/velocidade, RPE, sensação
    mock-data.ts                  Dados de exemplo para as telas
supabase/
  migrations/
    0001_init.sql                        Schema inicial + RLS
    0002_workout_details.sql             Prescrição, métricas planejadas e workout_completions
    0003_gps_whatsapp_ai_feedback.sql    Telefone, intervalos estruturados, feedback híbrido
```

## Identidade visual

Painel claro estilo TrainingPeaks: fundo branco/cinza-claro (`g4-bg`,
`g4-surface`), texto em preto fosco (`g4-ink`). O verde neon/lima (`lime`) é
reservado para ações principais, ícones de status e barras de progresso —
ver `tailwind.config.ts`. No gráfico de zonas, planejado/concluído usam o
mesmo matiz em dois tons (`lime-dim` / `lime-deep`), validado com o script
de acessibilidade de cor da skill de dataviz. Fonte
[Inter](https://fonts.google.com/specimen/Inter) carregada via `next/font`.
