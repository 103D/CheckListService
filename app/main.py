from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

from app import models
from app.database import engine
from app.routers import auth, branches, employees, grades, ratings

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
    ensure_grade_created_at_column()
    print("DONE")


def ensure_grade_created_at_column() -> None:
    inspector = inspect(engine)
    if "grades" not in inspector.get_table_names():
        return

    grade_columns = {column["name"] for column in inspector.get_columns("grades")}
    if "created_at" in grade_columns:
        return

    with engine.begin() as connection:
        connection.execute(
            text(
                "ALTER TABLE grades "
                "ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP"
            )
        )


@app.get("/")
def root():
    return {"message": "API running"}


app.include_router(branches.router)
app.include_router(auth.router)
app.include_router(employees.router)
app.include_router(grades.router)
app.include_router(ratings.router)
