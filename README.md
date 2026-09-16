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

  Alunos cadastrados na primeira aba já persistem de verdade no Supabase
  (nada em memória) — hoje só existe uma organização/assessoria usando o
  sistema, mas o modelo de dados já é multi-tenant (ver "Multi-tenant" logo
  abaixo).

Construído para rodar 100% em planos gratuitos: **Vercel** (hospedagem),
**Supabase** (banco de dados e autenticação), **Strava API** (atividades) e
a camada gratuita do **Gemini** (rascunho de feedback).

## Multi-tenant (SaaS)

O sistema foi desenhado pra hospedar **várias assessorias/academias
diferentes na mesma instância**, com isolamento total de dados entre elas:

- **`organizations`** — uma linha por assessoria contratante. Toda tabela de
  dado operacional (`profiles`, `alunos`, `treinos` via `alunos`,
  `exercise_library`, `access_requests`) carrega um `organization_id`.
- **Papéis** — `profiles.role` é `athlete`, `coach` ou `admin`; além disso,
  `profiles.is_platform_admin` marca quem administra a plataforma como um
  todo (todas as organizações), separado do admin comum de uma organização
  (só a própria).
- **`plans`** / **`subscriptions`** — plano contratado por organização
  (nome, preço, limite de atletas) e o registro da assinatura em si
  (`status`: `active`/`trialing`/`canceled`/etc.). Ainda não há gateway de
  pagamento real conectado — ver "Assinaturas e pagamento" abaixo.
- **Isolamento na prática**: a maioria das Server Actions usa o client
  `service role` do Supabase (`createAdminClient()`), que **ignora RLS**.
  Por isso o isolamento entre organizações não depende só das policies de
  RLS — cada Server Action que lê/escreve um recurso por id (`alunoId`,
  `studentId` etc.) faz uma checagem explícita
  `.eq("organization_id", organizationId)` antes de continuar. RLS
  (via a função `current_profile()`, `supabase/migrations/0022_*.sql`)
  é a segunda camada, útil sobretudo pro que roda com o client autenticado
  comum (não a service role).
- Hoje existe uma única organização em produção ("G4 Assessoria
  Esportiva"), atribuída automaticamente a toda conta nova (ver
  `src/app/solicitar-acesso/actions.ts`) — ainda não existe uma tela de
  onboarding pra cadastrar uma nova assessoria nem um link de pedido de
  acesso por organização; isso é o próximo passo pra vender o sistema pra
  um segundo cliente (ver `## Assinaturas e pagamento`).

## Assinaturas e pagamento

`plans` e `subscriptions` (migração `0022_multi_tenant_foundation.sql`)
guardam plano/assinatura por organização, mas **não há nenhum gateway de
pagamento integrado** — cobrar de um cliente novo hoje é 100% manual
(negociar fora do sistema, criar a linha em `subscriptions` direto no
banco). Não existe nenhuma simulação de pagamento no código: propositalmente,
para não passar a impressão de uma cobrança que não acontece de verdade.
Antes de vender pra mais de uma assessoria de forma self-service, falta:
um gateway real (Stripe, Mercado Pago ou similar), uma tela de checkout/
upgrade de plano, e o onboarding de organização citado acima.

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
> Treinador (`/cockpit`) já leem/gravam no Supabase real — `src/lib/mock-data.ts`
> hoje só fornece os *templates* de treino por modalidade e as funções que
> montam o objeto de treino (`buildPrescribedWorkout` etc.) a partir de uma
> linha real de `treinos`, não dado inventado.

## Variáveis de ambiente

Veja `.env.example`. Resumo:

| Variável | Onde obter |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Projeto Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Idem (uso exclusivo em servidor) |
| `STRAVA_CLIENT_ID` / `STRAVA_CLIENT_SECRET` | App em strava.com/settings/api |
| `GEMINI_API_KEY` | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) (camada gratuita) |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` / `RECAPTCHA_SECRET_KEY` | [google.com/recaptcha/admin](https://www.google.com/recaptcha/admin) (reCAPTCHA v2, gratuito). Opcional: sem elas, `/solicitar-acesso` funciona normalmente, só sem a verificação. |

Rate limiting não precisa de variável nova — roda no próprio Postgres do
Supabase que você já configurou acima (ver seção Segurança).

## Segurança

Site fechado: **ninguém entra sem conta**, e nenhuma conta se cria sozinha.
Existem só duas portas de entrada pra uma conta nova, ambas atrás do login
do admin: o admin cria direto em `/admin`, ou aprova um pedido enviado por
`/solicitar-acesso` (tela pública, sem login — é só um formulário de
interesse, não dá acesso a nada até o admin aprovar).

- **Autenticação real (Supabase Auth), login único** — `/login` serve
  treinador, aluno e admin (o toggle "Sou aluno/Sou treinador" é só uma
  conveniência de UX, não uma trava real). `src/proxy.ts` (convenção do
  Next.js 16 para o antigo `middleware.ts`) barra `/dashboard`, `/cockpit`
  e `/admin` no servidor: sem sessão válida ou com o papel errado,
  redireciona pro login. Admin tem acesso liberado às três áreas (não só
  ao painel) — `src/components/auth/RoleNav.tsx` mostra os atalhos
  "Cockpit / Área do atleta / Painel admin" só pra quem é admin; cai no
  Cockpit por padrão depois do login.
- **Pedido de acesso** (`/solicitar-acesso`) — nome, e-mail, WhatsApp
  (opcional) e "sou aluno/treinador"; cai numa fila em `/admin` com botões
  **Aprovar** (cria a conta de verdade e mostra uma senha provisória, uma
  única vez, pro admin repassar) e **Negar**. Protegida por rate limit (3
  pedidos/hora por IP), reCAPTCHA v2 e botão travado durante o envio (sem
  duplo clique) — é a tela mais exposta do site, já que não exige login. O
  insert no banco (`access_requests`) só acontece pela Server Action, com a
  service role; não existe policy de insert pra `anon`, então nem chamando a
  API do Supabase direto dá pra burlar essas travas.
- **Suspender conta** (`/admin`, botão por linha) — marca `profiles.active =
  false`. Login passa a recusar na hora; RLS também corta o acesso de quem
  já tinha sessão aberta (não é só bloqueio no login). Um admin não
  consegue suspender a própria conta.
- **RLS no Supabase, com políticas reais** (não só habilitada): `profiles`
  — cada usuário só lê/edita o próprio registro; `alunos`/`treinos` —
  treinador e admin (ativos) enxergam/gerenciam tudo, aluno (ativo) só o
  próprio registro (via `alunos.user_id`) e só atualiza pra registrar a
  execução do treino. Cadastro em `profiles`/`access_requests` não tem
  policy de insert pra `anon`/`authenticated` — só a service role cria.
- **Trava de 50 atletas**: reforçada duas vezes — na aprovação/criação
  (pré-checagem, tanto no formulário direto quanto ao aprovar um pedido) e
  num trigger no banco (`enforce_athlete_cap()`, em `profiles`) que recusa
  o 51º perfil com `role = 'athlete'` mesmo se alguém inserir direto via
  SQL/service role.
- **Rate limiting por IP** direto no Postgres do Supabase — sem serviço
  externo, sem variável de ambiente nova. A função `check_rate_limit`
  (`supabase/migrations/0006_rate_limit_via_postgres.sql`) conta
  tentativas por janela de tempo numa tabela própria
  (`rate_limit_buckets`, só a service role acessa); `src/lib/rate-limit.ts`
  chama essa função via RPC. Limites: 5 tentativas de login a cada 5 min
  por IP, 30 requisições/min por IP nas rotas de API (`/api/*`, incluindo
  o proxy), 3 pedidos de acesso/hora por IP. Login e pedido de acesso
  rodam como Server Action (não client-side direto no Supabase),
  justamente pra esse rate limit valer de verdade. Como reforço adicional
  (já ativo por padrão, sem configuração): o próprio Supabase Auth tem
  rate limit embutido nos endpoints de login/cadastro.
- **reCAPTCHA v2** em `/solicitar-acesso` (`src/lib/recaptcha.ts`) — o
  token do widget é verificado no servidor contra a API do Google antes de
  gravar o pedido. Sem `RECAPTCHA_SECRET_KEY` configurada, o formulário
  funciona normalmente sem a verificação (log de aviso, não quebra o
  deploy antes da chave existir).
- **Cabeçalhos HTTP** (`next.config.mjs`, aplicados a toda resposta):
  `Content-Security-Policy` (com exceção pontual pro script/iframe do
  reCAPTCHA), `X-Frame-Options: DENY` (anti-clickjacking),
  `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`
  (bloqueia câmera/microfone/geolocalização, não usados pelo app) e
  `Strict-Transport-Security`.
- **`/api/ai/draft-feedback`** verifica não só que há um usuário
  autenticado, mas que o `profiles.role` dele é `coach` (ou `admin`) —
  rascunho de IA é uma ferramenta do treinador, não do atleta.
- **XSS/links**: auditado — nenhum `dangerouslySetInnerHTML`/`innerHTML`
  no código, todo `target="_blank"` já usa `rel="noreferrer"` (evita
  reverse tabnabbing), e o link do WhatsApp (`buildWhatsAppLink`) filtra o
  telefone pra só dígitos antes de montar a URL.
- **Duplo clique**: todo Server Action de escrita (login, criar/aprovar/
  negar conta, suspender, pedido de acesso) desabilita o próprio botão
  enquanto a requisição está em voo (`pending`/`useTransition`).
- `SUPABASE_SERVICE_ROLE_KEY` só é usada em `src/lib/supabase/admin.ts`
  (rotas/Server Actions de servidor — inclui o painel admin, que precisa
  do Auth Admin API pra criar contas); nunca é referenciada em código que
  roda no navegador. `.env*.local` está no `.gitignore`.

### Criando o primeiro administrador

O painel `/admin` cria contas de treinador e aluno, mas o **primeiro**
admin precisa existir antes de alguém conseguir entrar em `/admin`. Duas
opções:

1. No painel do Supabase → Authentication → Add user, crie o login com
   e-mail/senha. Depois rode no SQL Editor:
   ```sql
   insert into public.profiles (id, role, full_name)
   values ('<uuid do usuário criado>', 'admin', 'Seu nome');
   ```
2. Ou peça pra eu criar (preciso do e-mail e uma senha provisória que você
   escolher).

## Banco de dados

O modelo oficial é **`alunos`/`treinos`** (não `workouts`/
`workout_completions` — esses nomes apareceram numa versão inicial do
schema e foram abandonados antes de qualquer código depender deles).
Todas as migrações abaixo estão aplicadas no projeto Supabase real, em
ordem, em `supabase/migrations/`:

- **Núcleo** (`0001`–`0002`) — `profiles` (1:1 com `auth.users`,
  `role`: `athlete`/`coach`/`admin`), `alunos` (ficha do atleta) e
  `treinos` (um registro por aluno+data; guarda tanto o planejado quanto o
  executado na mesma linha, em vez de duas tabelas separadas).
- **Segurança e acesso** (`0004`–`0009`) — RLS em `alunos`/`treinos`,
  papéis e policies de `profiles`, rate limiting via Postgres
  (`rate_limit_buckets` + `check_rate_limit()`), flag `active`/suspensão,
  fila de `access_requests` (pedido de acesso público).
- **Ficha e prescrição completas** (`0010`–`0017`) — `exercise_library`
  (biblioteca de exercícios de academia), perfil completo do aluno
  (idade/sexo/composição corporal/zonas por modalidade), relatório do
  treinador/anamnese, prescrição estruturada + rascunho (`treinos.rascunho`,
  separado do que já foi enviado ao aluno), notas privadas do treinador
  (`aluno_notes`, nunca visíveis ao aluno), feedback pós-treino (RPE/
  sensação/comentário) e upload do arquivo `.FIT`.
- **Strava** (`0018`–`0019`) — `strava_tokens` (OAuth por perfil) e
  `strava_activities` (atividades importadas, com esforço relativo).
- **Feedback do treinador** (`0020`–`0021`) — campos adicionais de
  `access_requests` (anamnese/modalidade na hora do pedido) e
  `treinos.coach_feedback` / `ai_feedback_draft`.
- **Multi-tenant** (`0022`–`0024`) — `organizations`, `plans`,
  `subscriptions`; `organization_id` (obrigatório) em `profiles`/`alunos`/
  `exercise_library`, opcional em `access_requests`;
  `profiles.is_platform_admin`; a função `current_profile()` (SECURITY
  DEFINER, evita recursão de RLS numa policy que precisa consultar a
  própria `profiles`); limite de 50 atletas e nome único de exercício
  recalculados **por organização**, não mais globais. Ver a seção
  "Multi-tenant (SaaS)" acima para o que isso muda na prática.

Todas as tabelas têm Row Level Security habilitada — mas RLS sozinha
**não** é a trava de isolamento entre organizações, porque a maior parte
das Server Actions usa a service role (que ignora RLS); veja
"Multi-tenant (SaaS)" acima.

Aplique o schema criando um projeto gratuito em
[supabase.com](https://supabase.com) e rodando:

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
(emoji, 1–5) e observações livres, e grava direto em `treinos`
(`rpe_esforco`/`sensacao`/`comentarios`, `supabase/migrations/0016_*.sql`).
O resultado aparece imediatamente no `CoachFeedbackCard`, junto com o que o
treinador ainda vai comentar.

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
    0001-0002   Schema inicial (profiles/alunos/treinos) + RLS
    0004-0009   RLS completa, rate limit, active/suspensão, access_requests
    0010-0017   Ficha completa, biblioteca de exercícios, prescrição/rascunho,
                notas privadas, feedback pós-treino, upload .FIT
    0018-0019   Strava (tokens + atividades)
    0020-0021   Anamnese no pedido de acesso, coach_feedback/ai_feedback_draft
    0022-0024   Multi-tenant (organizations/plans/subscriptions,
                organization_id, current_profile())
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
