# Clinical Summarization Frontend (React)

This React app integrates with the Fastify API in ../api and calls POST /v1/summaries.

## Run

1. Start the backend API in ../api.
2. Set the frontend API base URL (optional, defaults to http://localhost:3000).
3. Run this frontend.

```bash
npm install
npm run dev
```

## Environment Variables

Create a .env file in this folder if you want a default base URL:

```env
VITE_API_BASE_URL=http://localhost:3000
```

## API Inputs

- The UI only asks for Raw Note.
- Base URL is read from VITE_API_BASE_URL in .env.
- Request body sent: { "note": { "raw": "..." } }

## Backend Auth Mode (for this UI)

To run this UI without exposing API keys in the browser, set these in api/.env:

```env
ALLOW_PUBLIC_SUMMARIES=true
PUBLIC_TENANT_ID=clinic-main
```

When enabled, the backend accepts summary requests without Authorization and assigns them to PUBLIC_TENANT_ID.

## Build

```bash
npm run build
```
