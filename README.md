# G4 Assessoria Esportiva

Plataforma web para a assessoria esportiva G4 (ciclismo, corrida e academia):
o atleta acompanha o treino prescrito do dia e conecta o Strava; o treinador
acompanha todos os alunos em um cockpit único.

Construído para rodar 100% em planos gratuitos: **Vercel** (hospedagem),
**Supabase** (banco de dados e autenticação) e **Strava API** (dados de
atividades).

## Stack

- [Next.js 14](https://nextjs.org/docs) (App Router) + TypeScript
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

> As telas de Atleta (`/dashboard`) e Cockpit do Treinador (`/cockpit`) usam
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

O schema inicial está em `supabase/migrations/0001_init.sql`, com as tabelas:

- **profiles** — usuários (`athlete` ou `coach`), 1:1 com `auth.users`.
- **strava_tokens** — tokens OAuth do Strava por atleta.
- **workouts** — treinos prescritos pelo treinador para cada atleta.
- **strava_activities** — atividades importadas do Strava, opcionalmente
  vinculadas a um treino prescrito.

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

Cadastre a aplicação em [strava.com/settings/api](https://www.strava.com/settings/api)
com o Authorization Callback Domain apontando para seu domínio (ou
`localhost` em desenvolvimento).

## Estrutura de pastas

```
src/
  app/
    (athlete)/dashboard/   Home do atleta (mobile first)
    (coach)/cockpit/       Cockpit do treinador (desktop)
    api/strava/            Rotas do fluxo OAuth e sincronização
    layout.tsx, page.tsx   Layout raiz e landing
  components/
    ui/                    Button, Card, Badge, StatusDot — base visual G4
    athlete/                Componentes da Home do atleta
    coach/                  Componentes do Cockpit do treinador
  lib/
    supabase/               Clientes (browser, server, admin) e tipos do banco
    strava/                 Cliente OAuth/API do Strava
    mock-data.ts            Dados de exemplo para as telas
supabase/
  migrations/0001_init.sql  Schema + RLS
```

## Identidade visual

Fundo grafite/preto fosco (`g4-bg`, `g4-surface`) com destaques em verde
neon/lima (`lime`) para ações e status — ver `tailwind.config.ts`. Fonte
[Inter](https://fonts.google.com/specimen/Inter) carregada via `next/font`.
