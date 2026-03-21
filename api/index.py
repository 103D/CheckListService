"""
Vercel Serverless Function for FastAPI
Simple handler that creates the app on each request
"""
import os
import sys

# Add the parent directory to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def create_app():
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware
    
    app = FastAPI(title="CheckList API")
    
    # Configure CORS
    cors_origins = os.getenv("CORS_ORIGINS", "")
    if cors_origins.strip():
        origins = [o.strip() for o in cors_origins.split(",") if o.strip()]
    else:
        origins = ["http://localhost:5173", "http://127.0.0.1:5173", "https://check-list-service.vercel.app"]
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Import routers
    try:
        from app.routers import auth, branches, employees, grades, ratings
        
        app.include_router(branches.router, prefix="/api")
        app.include_router(auth.router, prefix="/api")
        app.include_router(employees.router, prefix="/api")
        app.include_router(grades.router, prefix="/api")
        app.include_router(ratings.router, prefix="/api")
        
        # Try to create tables
        try:
            from app import models
            from app.database import engine
            models.Base.metadata.create_all(bind=engine)
        except Exception as e:
            print(f"Warning: Could not create tables: {e}")
    except Exception as e:
        print(f"Warning: Could not import routers: {e}")
    
    @app.get("/")
    def root():
        return {"message": "API running"}
    
    @app.get("/api/")
    def api_root():
        return {"message": "CheckList API", "version": "1.0"}
    
    return app

# Create app lazily
app = None

def get_app():
    global app
    if app is None:
        app = create_app()
    return app

# Handler for Vercel
def handler(event, context):
    from mangum import Mangum
    return Mangum(get_app(), lifespan="off")(event, context)
