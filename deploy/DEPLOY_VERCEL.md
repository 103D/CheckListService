# Vercel Deployment Guide (Full Stack)

This guide covers deploying both backend and frontend to Vercel.

## Architecture

- **Frontend:** Vercel (static hosting with Vite)
- **Backend:** Vercel Serverless Functions (Python/FastAPI)

---

## Part 1: Prepare Project

### 1. Create Vercel Configuration
Create `vercel.json` in the root directory:

```json
{
  "buildCommand": "cd frontend-react && npm run build",
  "outputDirectory": "frontend-react/dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "/api/:path*"
    }
  ]
}
```

### 2. Create API Directory
Create `api/` directory in the root with `main.py` wrapper:

```python
# api/index.py
from app.main import app

handler = app
```

Actually, for FastAPI on Vercel, we need a different approach. Let me create the proper setup.

---

## Part 2: Deploy Backend to Vercel

### Option 1: Using vercel-python (Recommended)

1. Create `api/requirements.txt`:
```
fastapi==0.115.0
uvicorn==0.32.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
sqlalchemy==2.0.36
psycopg2-binary==2.9.10
python-multipart==0.0.20
pydantic==2.10.0
```

2. Create `api/index.py`:
```python
import os
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import json

# Import your FastAPI app
from app.main import app

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        path = urlparse(self.path).path
        # Handle API routes
        if path.startswith('/api/'):
            # Redirect to FastAPI
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"message": "API works"}).encode())
            return
        
        self.send_response(404)
        self.end_headers()
    
    def do_POST(self):
        self.do_GET()
```

Actually, this won't work well. Let me use the proper Vercel Python runtime.

### Proper Vercel Python Setup

Create these files in the root:

**1. `api/main.py`**:
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app import models
from app.database import engine
from app.routers import auth, branches, employees, grades, ratings

app = FastAPI()

# CORS - configure for your Vercel frontend
origins = ["https://your-project.vercel.app"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and include routers
app.include_router(branches.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(employees.router, prefix="/api")
app.include_router(grades.router, prefix="/api")
app.include_router(ratings.router, prefix="/api")

@app.get("/")
def root():
    return {"message": "API running"}
```

**2. `api/requirements.txt`**:
```
fastapi==0.115.0
uvicorn[standard]==0.32.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
sqlalchemy==2.0.36
psycopg2-binary==2.9.10
python-multipart==0.0.20
pydantic==2.10.0
python-dotenv==1.0.0
```

**3. `vercel.json`**:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "frontend-react/dist",
  "framework": "vite",
  "installCommand": "cd frontend-react && npm install",
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/main.py"
    },
    {
      "handle": "filesystem"
    },
    {
      "src": "/(.*)",
      "dest": "/frontend-react/dist/$1"
    }
  ]
}
```

---

## Part 3: Environment Variables

Add in Vercel Project Settings:

```
DATABASE_URL=postgresql://user:pass@host:5432/db
SECRET_KEY=your-secret-key-here
CORS_ORIGINS=https://your-project.vercel.app
```

---

## Part 4: Deploy

1. Push code to GitHub
2. Import project in Vercel
3. Configure:
   - Framework Preset: Other
   - Build Command: (leave default)
   - Output Directory: (leave default)
4. Add Environment Variables
5. Deploy

---

## Part 5: Verify

1. Open `https://your-project.vercel.app/api/`
2. Should return `{"message": "API running"}`
3. Test login at `https://your-project.vercel.app/api/auth/login`

---

## Troubleshooting

### 500 Error on API
- Check Vercel function logs
- Ensure DATABASE_URL is set correctly
- Check Python version compatibility

### CORS Errors
- Add your Vercel URL to CORS_ORIGINS in the app

### Database Connection
- Use Vercel Postgres or external PostgreSQL
- Ensure DATABASE_URL is correct
