# DEPLOY_RAILWAY.md

Инструкции по Railway/Vercel удалены. Используйте только локальный запуск.
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
