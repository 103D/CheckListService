# Domain Deployment (Option 1 + 3)

This setup combines:

- **Option 1**: one domain with reverse proxy (`/` frontend, `/api` backend)
- **Option 3**: cloud/VPS hosting

## 1. DNS

Point both records to your server IP:

- `A safia-service-checklist -> <SERVER_IP>`

## 2. Server Packages (Ubuntu)

```bash
sudo apt update
sudo apt install -y nginx python3-venv python3-pip certbot python3-certbot-nginx
```

## 3. Project Paths (example)

- Project: `/opt/checklist/check-list__app`
- Frontend build: `/var/www/checklist/frontend-react/dist`

## 4. Backend Setup

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

## 5. Frontend Build + Publish

```bash
cd /opt/checklist/check-list__app/frontend-react
cp .env.production.example .env.production
npm ci
npm run build

sudo mkdir -p /var/www/checklist/frontend-react
sudo cp -r dist /var/www/checklist/frontend-react/
```

## 6. Nginx Reverse Proxy

```bash
sudo cp /opt/checklist/check-list__app/deploy/nginx/checklist.conf /etc/nginx/sites-available/checklist
sudo ln -s /etc/nginx/sites-available/checklist /etc/nginx/sites-enabled/checklist
sudo nginx -t
sudo systemctl reload nginx
```

## 7. HTTPS (Let's Encrypt)

```bash
sudo certbot --nginx -d safia-service-checklist
```

## 8. Verify

- Frontend: `https://safia-service-checklist`
- API health: `https://safia-service-checklist/api/`

## Notes for PaaS

If your provider has built-in routing (Render/Fly/etc), keep same rule concept:

- `/` -> static frontend
- `/api/*` -> FastAPI service

Keep frontend API base URL as `/api` in production.
