from fastapi import FastAPI

from app import models
from app.database import engine
from app.routers import auth, branches, employees, grades, ratings
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
# Разрешаем все домены (для разработки)
origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Можно указать список фронтендов
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    print("CREATING TABLES...")
    models.Base.metadata.create_all(bind=engine)
    print("DONE")


@app.get("/")
def root():
    return {"message": "API running"}


app.include_router(branches.router)
app.include_router(auth.router)
app.include_router(employees.router)
app.include_router(grades.router)
app.include_router(ratings.router)
