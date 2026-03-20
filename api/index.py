"""
Vercel Serverless Function for FastAPI
Uses Mangum to adapt FastAPI to AWS Lambda/Vercel
"""
import os
from mangum import Mangum
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app import models
from app.database import engine
from app.routers import auth, branches, employees, grades, ratings
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(title="CheckList API")

# Configure CORS
cors_origins = os.getenv("CORS_ORIGINS", "")
if cors_origins.strip():
    origins = [o.strip() for o in cors_origins.split(",") if o.strip()]
else:
    origins = ["http://localhost:5173", "http://127.0.0.1:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers with /api prefix
app.include_router(branches.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(employees.router, prefix="/api")
app.include_router(grades.router, prefix="/api")
app.include_router(ratings.router, prefix="/api")

@app.get("/")
def root():
    return {"message": "API running"}

@app.get("/api/")
def api_root():
    return {"message": "CheckList API", "version": "1.0"}

# Create tables (for development - use migrations in production)
models.Base.metadata.create_all(bind=engine)

# Handler for Vercel
handler = Mangum(app, lifespan="off")
