# G4 Assessoria Esportiva

Plataforma web para a assessoria esportiva G4 (ciclismo, corrida e academia).
As visões de atleta e treinador são deliberadamente diferentes:

- **Atleta** — extremamente simples, pensada para o celular, em um fluxo
  único (sem cards soltos e desconectados): Treino do Dia (com o status do
  Strava integrado ao card, não isolado), Ações — baixar o treino
  estruturado em **.FIT** ou **.ZWO**, abrir no Garmin Connect, marcar como
  concluído (abre um modal de RPE + sensação + observações) — tutorial de
  dispositivo (Garmin/iGPSPORT/Wahoo) e Feedback do Professor.
- **Treinador** — painel completo e analítico, estilo
  [TrainingPeaks](https://www.trainingpeaks.com/), organizado em 4 abas para
  não misturar cadastro, prescrição, acompanhamento e análise na mesma tela:
  1. **Alunos cadastrados** — tabela geral (FTP com W/kg calculado, peso,
     modalidade, status do dia, Strava) e cadastro de novo aluno em um modal
     com dados de nível profissional: gerais (idade, sexo, altura, peso,
     composição corporal, histórico/restrições) + seções específicas por
     modalidade — Ciclismo (FTP, FC máx/repouso/limiar, cadência, picos de
     potência, histórico de MTB), Corrida (pace limiar, VO2max, FC, recordes
     pessoais, biomecânica) e Academia (objetivo, cargas de referência,
     foco/assimetrias) — mostradas dinamicamente conforme a modalidade
     principal e as adicionais escolhidas, em seções que abrem/fecham para
     não poluir a tela.
  2. **Criar/Prescrever treino** — aluno, data, modalidade, blocos
     estruturados (aquecimento/tiros/desaquecimento), editor de intervalos
     por %FTP/zona, metas de TSS/IF, vídeo/preleção e envio direto por
     WhatsApp.
  3. **Acompanhamento do dia** — quem concluiu, quem está pendente e quem já
     sincronizou o Strava.
  4. **Analisar treino do aluno** — comparação Planejado vs. Concluído
     (Duração, Distância, TSS, IF, FC e ritmo/velocidade), gráfico de blocos,
     zonas de potência/FC e o composer de feedback com IA.

  Roda com um único aluno de exemplo (Carlos Silva) para validar as 4 abas
  sem o ruído de uma lista fictícia grande — novos alunos cadastrados na
  primeira aba entram em memória (useState) até a persistência real via
  Supabase.

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

> As telas de Atleta (`/dashboard`, `/dashboard/treinos/[id]`) e o Cockpit do
> Treinador (`/cockpit`) usam dados de exemplo (`src/lib/mock-data.ts`) até a
> integração real com Supabase ser conectada — veja os `TODO` nas páginas
> correspondentes.

## Variáveis de ambiente

Veja `.env.example`. Resumo:

| Variável | Onde obter |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Projeto Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Idem (uso exclusivo em servidor) |
| `STRAVA_CLIENT_ID` / `STRAVA_CLIENT_SECRET` | App em strava.com/settings/api |
| `GEMINI_API_KEY` | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) (camada gratuita) |

## Segurança

- **Cabeçalhos HTTP** (`next.config.mjs`, aplicados a toda resposta):
  `Content-Security-Policy`, `X-Frame-Options: DENY` (anti-clickjacking),
  `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`
  (bloqueia câmera/microfone/geolocalização, não usados pelo app) e
  `Strict-Transport-Security`.
- **RLS no Supabase**: toda tabela em `public` tem Row Level Security
  habilitada — nenhuma fica exposta à `anon key` sem política explícita.
  Ao criar uma tabela nova, sempre habilite RLS antes de expor dados reais
  e defina as políticas de acordo com quem deve ler/escrever cada linha.
- **`/api/ai/draft-feedback`** verifica não só que há um usuário
  autenticado, mas que o `profiles.role` dele é `coach` — rascunho de IA é
  uma ferramenta do treinador, não do atleta.
- `SUPABASE_SERVICE_ROLE_KEY` só é usada em `src/lib/supabase/admin.ts`
  (rotas de servidor); nunca é referenciada em código que roda no
  navegador. `.env*.local` está no `.gitignore`.

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

`src/lib/workout-export.ts` gera o treino estruturado em dois formatos,
ambos direto no navegador (sem round-trip ao servidor), a partir de
`workouts.structured_intervals` — potência sempre em %FTP:

- **.ZWO** — formato do Zwift, importável em Garmin/Wahoo (`DownloadZwoButton`).
- **.FIT** — formato binário nativo Garmin, gerado com o SDK oficial
  ([`@garmin/fitsdk`](https://www.npmjs.com/package/@garmin/fitsdk)) via
  `buildFitWorkout` (`DownloadFitButton`) — mensagens `workout`/`workoutStep`
  com os números de campo/enum do FIT Profile embutido no pacote, validado
  com round-trip real (`Decoder.checkIntegrity()`) durante o desenvolvimento.

Hoje cobre só ciclismo; corrida/academia usariam zonas de ritmo, fora do
escopo atual (`canExportStructuredWorkout` esconde os botões quando não
aplicável).

O botão "Abrir no Garmin Connect" aponta para `connect.garmin.com/modern/`
— em um celular com o app instalado, o link universal abre o app; sem o
app, abre o painel web.

Como nem todo aluno usa Garmin, o `DeviceTutorial` (na visão do atleta)
deixa escolher a marca do GPS — Garmin, iGPSPORT ou Wahoo/Outros — e abre
um mini tutorial curto de importação específico para cada uma.

## Feedback pós-treino (RPE)

Ao clicar em "Marcar como concluído" na visão do atleta, o
`RpeFeedbackModal` pede a percepção de esforço (RPE 1–10), a sensação geral
(emoji, 1–5) e observações livres — sem round-trip ao servidor ainda (TODO:
persistir em `workout_completions` via Supabase). O resultado aparece
imediatamente no `CoachFeedbackCard`, junto com o que o treinador ainda vai
comentar.

## WhatsApp

`src/lib/whatsapp.ts` monta links `wa.me` com o texto já preenchido:

- Cockpit do treinador → aba "Criar/Prescrever treino", botão "Enviar via
  WhatsApp" com o texto da prescrição do dia formatado para o aluno
  selecionado.
- Painel do atleta → botão rápido "Falar com o treinador", na Home e no
  detalhe do treino.

Os números vêm do cadastro do aluno (`MockStudent.phone`, editável na aba
"Alunos cadastrados").

## Feedback híbrido (treinador + IA)

`src/lib/ai/gemini.ts` chama a API do Gemini (`POST /api/ai/draft-feedback`,
exige treinador autenticado) para gerar um **rascunho** de feedback
comparando planejado vs. concluído. O `AiFeedbackComposer` (aba "Analisar
treino do aluno") deixa o treinador gerar, editar e só então enviar — o
rascunho de IA nunca chega ao atleta sem revisão humana. O atleta vê o
resultado no `CoachFeedbackCard`: o comentário final do treinador, com um
selo "✨ com apoio de IA" quando houve rascunho, mais o RPE/sensação que ele
mesmo registrou.

## Estrutura de pastas

```
src/
  app/
    (athlete)/dashboard/          Home do atleta (mobile first)
      treinos/[id]/               Detalhe do treino — AthleteWorkoutView
    (coach)/cockpit/              Cockpit do treinador — shell de abas (CockpitTabs)
    api/strava/                   Rotas do fluxo OAuth e sincronização
    api/ai/draft-feedback/        Rascunho de feedback via Gemini
    layout.tsx, page.tsx          Layout raiz e landing
  components/
    ui/                           Button, Card, Badge, StatusDot, Avatar — base visual G4
    athlete/                      WeeklyHistory (Home do atleta)
    coach/
      CockpitTabs                  Shell: estado do roster/prescrições + navegação das 4 abas
      RosterTab                    Aba "Alunos cadastrados": tabela geral + aciona o AddStudentModal
      AddStudentModal               Cadastro completo (dados gerais + perfil por modalidade) em accordion
      PrescribeTab                 Aba "Criar/Prescrever treino": formulário completo + WhatsApp
      TodayOverviewTab             Aba "Acompanhamento do dia": visão geral rápida
      AnalyzeTab                   Aba "Analisar treino do aluno": painel analítico completo
      CockpitStats                 Barra de estatísticas: concluídos, pendentes, sem Strava
      IntervalTimeline             Gráfico de blocos do treino (duração x %FTP)
    workout/
      AthleteWorkoutView          Treino do Dia + Ações (exportar/concluir) + Feedback do Professor
      WorkoutPrescriptionEditor   Descrição, blocos estruturados, vídeo e métricas planejadas (editável)
      IntervalEditor               Blocos por %FTP/zona (aquecimento, tiros, recuperação) — ciclismo
      ZonesChart                  Zonas de potência/FC (planejado vs. concluído)
      DownloadFitButton           Exporta .FIT (SDK oficial Garmin) no navegador
      DownloadZwoButton           Exporta .ZWO no navegador
      DeviceTutorial              Seletor de GPS (Garmin/iGPSPORT/Wahoo) + mini tutorial
      RpeFeedbackModal             Modal de RPE/sensação/observações pós-treino
      AiFeedbackComposer          Gera/edita/envia feedback (treinador)
      CoachFeedbackCard           Feedback exibido ao atleta
  lib/
    supabase/                     Clientes (browser, server, admin) e tipos do banco
    strava/                       Cliente OAuth/API do Strava
    ai/gemini.ts                  Cliente da API do Gemini
    workout-export.ts             Geradores dos arquivos .FIT (@garmin/fitsdk) e .ZWO
    whatsapp.ts                   Links wa.me e texto formatado do treino
    workout-metrics.ts            Formatação de duração, pace/velocidade, RPE, sensação
    mock-data.ts                  Aluno de exemplo, templates por modalidade e prescrições
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

### Logo

- `public/logo-g4-full.png` — logo completa (emblema escuro + verde), usada
  na entrada principal do site (`/`).
- `public/logo-g4-icon.png` / `logo-g4-icon-dumbbell.png` — marca "G4"
  compacta (com/sem o detalhe do haltere), fundo transparente; o componente
  `Logo` (`src/components/ui/Logo.tsx`) usa a versão sem haltere nos
  cabeçalhos de `/dashboard` e `/cockpit`.
- `src/app/icon.png` — favicon, gerado a partir da marca compacta.
