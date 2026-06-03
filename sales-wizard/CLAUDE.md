# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # start dev server on localhost:3000
npm run build        # production build (runs next build)
npm run lint         # ESLint check
npx prisma studio    # visual DB browser
npx prisma migrate dev --name <name>   # create and apply a new migration
npx prisma migrate deploy              # apply migrations (production)
npx prisma generate                    # regenerate Prisma client after schema changes
```

Environment variables required: `DATABASE_URL`, `DIRECT_URL` (Supabase pooler + direct connection strings).

## Architecture

This is a **Next.js 14 App Router** app for AI-powered real estate lead qualification targeting Nigerian buyers.

### Data flow

1. Visitor opens chat widget (`src/components/ChatWidget.tsx`) on the landing page
2. Each message POSTs to `/api/chat` → `runQualification()` in `src/lib/ai/qualifier.ts`
3. The qualifier is **rule-based** (no external API): it asks questions in a fixed sequence (name → phone → budget → location → propertyType → timeline → readyToBuy), extracts values from each reply, then calls `scoreLead()` in `src/lib/scoring/leadScorer.ts`
4. Lead scoring is deterministic: budget(+30), location(+20), propertyType(+15), timeline(+25/12/5), readyToBuy(+10). Bands: HOT ≥65, WARM 35–64, COLD <35
5. Extracted fields are upserted into the `Lead` table; messages saved to `Conversation`/`Message` tables
6. Admin dashboard at `/admin` (server component) reads Prisma directly — never fetches internal `/api/*` routes

### Key conventions

- **Server components call Prisma directly** — no internal `fetch()` to API routes from server components
- **`export const dynamic = 'force-dynamic'`** on all admin pages to prevent stale caching
- **`src/lib/prisma.ts`** holds the global PrismaClient singleton (prevents connection exhaustion in dev)
- **WhatsApp** is abstracted behind `WhatsAppProvider` interface (`src/lib/whatsapp/index.ts`); current provider is mock (logs to console). Swap by editing `getProvider()` factory
- `conversationId` is always server-assigned (never from client input) to prevent IDOR
- Message history is capped at 20 entries before passing to the qualifier

### Database models (Prisma)

`Lead` — core CRM record with score/band fields merged in (no separate ScoreResult table)  
`Conversation` → `Message` — chat thread per visitor session  
`Agent` — sales agent assignments  
`Property` — property listings  
`FollowUpLog` — WhatsApp send history per lead  

### Vercel deployment

- Root Directory must be set to `sales-wizard`
- Build Command: `npx prisma migrate deploy && npx next build`
- `prisma generate` runs automatically via `postinstall` script in `package.json`
- Requires both `DATABASE_URL` (pooled, port 6543) and `DIRECT_URL` (direct, port 5432) for Supabase + Prisma migrations
