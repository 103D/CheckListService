# Domain Deployment

Two working ways are documented below:

- `Path A (recommended now)`: no Linux server, deploy with `Render + Vercel`.
- `Path B`: your own Ubuntu/VPS with `nginx + systemd`.

## Path A: Launch Domain Now (Render + Vercel)

Use this if you are on Windows and do not have a Linux server.

### 1. Deploy backend to Render

1. Open Render dashboard -> `New` -> `Web Service` -> connect GitHub repo.
2. Configure service:
   - `Root Directory`: repo root (`check-list__app`)
   - `Environment`: `Python 3`
   - `Build Command`: `pip install -r requirements.txt`
   - `Start Command`: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. Add environment variables:
   - `DATABASE_URL=<your_neon_url>`
   - `CORS_ORIGINS=https://YOUR_FRONTEND_DOMAIN`
4. Deploy and copy backend URL, for example:
   - `https://checklist-api.onrender.com`

### 2. Deploy frontend to Vercel

1. Open Vercel -> `Add New` -> `Project` -> import same GitHub repo.
2. In project settings:
   - `Root Directory`: `frontend-react`
   - Framework is detected as `Vite`
3. Add environment variable:
   - `VITE_API_BASE_URL=https://checklist-api.onrender.com`
4. Deploy. Vercel gives URL like:
   - `https://checklist-app.vercel.app`

### 3. Connect your custom domain

1. In Vercel project -> `Settings` -> `Domains` -> add your domain (for example `checklist.yourdomain.com`).
2. Follow Vercel DNS records exactly (usually `CNAME`).
3. After domain becomes active, update Render backend `CORS_ORIGINS` to exact frontend domain:
   - `https://checklist.yourdomain.com`
4. Redeploy backend once.

### 4. Verify

- Open frontend domain and login.
- Browser devtools should show API calls to your Render URL.
- No CORS errors.

### Notes

- With this path, frontend and backend are on different domains/subdomains.
- For strict single-domain routing (`/api` on same host), use `Path B` (VPS/nginx).

## Path B: Single Domain on Ubuntu/VPS (`/` + `/api`)

This setup combines:

- one domain with reverse proxy (`/` frontend, `/api` backend)
- cloud/VPS hosting

### 1. DNS

Point domain record to your server IP:

- `A safia-service-checklist -> <SERVER_IP>`

### 2. Server Packages (Ubuntu)

```bash
sudo apt update
sudo apt install -y nginx python3-venv python3-pip certbot python3-certbot-nginx
```

### 3. Project Paths (example)

- Project: `/opt/checklist/check-list__app`
- Frontend build: `/var/www/checklist/frontend-react/dist`

### 4. Backend Setup

```bash
cd /opt/checklist/check-list__app
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Set production env values in `.env`:

- `DATABASE_URL=...`
- `CORS_ORIGINS=https://safia-service-checklist`

Install systemd service:

```bash
sudo cp deploy/systemd/checklist-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable checklist-backend
sudo systemctl start checklist-backend
sudo systemctl status checklist-backend
```

### 5. Frontend Build + Publish

```bash
cd /opt/checklist/check-list__app/frontend-react
cp .env.production.example .env.production
npm ci
npm run build

sudo mkdir -p /var/www/checklist/frontend-react
sudo cp -r dist /var/www/checklist/frontend-react/
```

### 6. Nginx Reverse Proxy

```bash
sudo cp /opt/checklist/check-list__app/deploy/nginx/checklist.conf /etc/nginx/sites-available/checklist
sudo ln -s /etc/nginx/sites-available/checklist /etc/nginx/sites-enabled/checklist
sudo nginx -t
sudo systemctl reload nginx
```

### 7. HTTPS (Let's Encrypt)

```bash
sudo certbot --nginx -d safia-service-checklist
```

### 8. Verify

- Frontend: `https://safia-service-checklist`
- API health: `https://safia-service-checklist/api/`
