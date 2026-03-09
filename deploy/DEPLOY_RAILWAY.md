# Railway + Vercel Deployment

This path replaces Render with Railway for backend stability.

## 1. Create backend service on Railway

1. Open Railway dashboard -> `New Project` -> `Deploy from GitHub repo`.
2. Select this repository.
3. In service settings, use repo root as source.
4. Railway will install Python dependencies from `requirements.txt`.
5. `railway.json` in repo sets the start command automatically:
   - `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

## 2. Set Railway environment variables

Add these variables in Railway service `Variables`:

- `DATABASE_URL=<your_neon_or_postgres_url>`
- `CORS_ORIGINS=https://check-list-service.vercel.app,http://localhost:5173,http://127.0.0.1:5173`

After setting variables, redeploy the service.

## 3. Verify backend

Check these URLs from Railway service public domain:

- `https://<your-railway-domain>/`
- `https://<your-railway-domain>/docs`

`/` should return JSON with `API running`.

## 4. Connect Vercel frontend

Preferred approach: keep frontend on same-origin `/api` and use Vercel rewrite.

Update `frontend-react/vercel.json` destination:

```json
{
  "source": "/api/:path*",
  "destination": "https://<your-railway-domain>/:path*"
}
```

Then redeploy Vercel.

## 5. Vercel environment variable

Use:

- `VITE_API_BASE_URL=/api`

This prevents browser CORS because frontend calls Vercel origin, and Vercel proxies to Railway.

## 6. Final check

From browser DevTools -> Network:

1. Login request URL should be `https://check-list-service.vercel.app/api/auth/login`.
2. Request should return 200 without CORS errors.
3. Backend response should contain `access_token`.

## Troubleshooting

- 404 on Vercel routes:
  Keep SPA fallback rewrite to `/index.html` in `frontend-react/vercel.json`.
- CORS errors:
  Confirm Vercel uses `/api` (not direct backend URL).
- 5xx from backend:
  Check Railway logs and validate `DATABASE_URL`.
