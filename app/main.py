from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

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
    ensure_grade_role_in_shift_column()
    ensure_branch_city_column()
    seed_demo_employees_and_grades()
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


def ensure_grade_role_in_shift_column() -> None:
    inspector = inspect(engine)
    if "grades" not in inspector.get_table_names():
        return

    grade_columns = {column["name"] for column in inspector.get_columns("grades")}

    with engine.begin() as connection:
        if "role_in_shift" not in grade_columns:
            connection.execute(
                text(
                    "ALTER TABLE grades "
                    "ADD COLUMN role_in_shift VARCHAR NOT NULL DEFAULT 'Продавец'"
                )
            )

        connection.execute(
            text(
                "UPDATE grades "
                "SET role_in_shift = 'Продавец' "
                "WHERE role_in_shift IS NULL OR TRIM(role_in_shift) = ''"
            )
        )


def ensure_branch_city_column() -> None:
    inspector = inspect(engine)
    if "branches" not in inspector.get_table_names():
        return

    branch_columns = {column["name"] for column in inspector.get_columns("branches")}

    with engine.begin() as connection:
        if "city" not in branch_columns:
            connection.execute(
                text(
                    "ALTER TABLE branches "
                    "ADD COLUMN city VARCHAR NOT NULL DEFAULT 'Almaty'"
                )
            )

        connection.execute(
            text(
                "UPDATE branches "
                "SET city = 'Almaty' "
                "WHERE city IS NULL OR TRIM(city) = ''"
            )
        )


def seed_demo_employees_and_grades() -> None:
    with Session(engine) as db:
        grade_count = db.query(models.Grade).count()
        if grade_count >= 30:
            return

        manager = db.query(models.User).filter(models.User.role == "MANAGER").first()
        if not manager:
            manager = db.query(models.User).first()
        if not manager:
            return

        branches = db.query(models.Branch).all()
        if not branches:
            return

        demo_employee_names = [
            "Алихан",
            "Аружан",
            "Данияр",
            "Мадина",
            "Нурсултан",
            "Айгерим",
            "Руслан",
            "Томирис",
            "Ержан",
            "Зере",
            "Аян",
            "Сабина",
        ]

        created_employees = []
        for index, employee_name in enumerate(demo_employee_names):
            branch = branches[index % len(branches)]
            employee = models.Employee(name=employee_name, branch_id=branch.id)
            db.add(employee)
            created_employees.append(employee)

        db.flush()

        demo_grades = [
            [97, 95, 98],
            [94, 92, 93],
            [91, 90, 92],
            [89, 88, 90],
            [87, 88, 86],
            [85, 84, 83],
            [82, 81, 84],
            [80, 79, 81],
            [78, 77, 79],
            [76, 75, 74],
            [73, 72, 71],
            [70, 69, 68],
        ]

        for employee, employee_grades in zip(created_employees, demo_grades):
            for value in employee_grades:
                db.add(
                    models.Grade(
                        value=value,
                        role_in_shift="Продавец",
                        comment="Seeded for ratings UI",
                        employee_id=employee.id,
                        manager_id=manager.id,
                    )
                )

        db.commit()


@app.get("/")
def root():
    return {"message": "API running"}


app.include_router(branches.router)
app.include_router(auth.router)
app.include_router(employees.router)
app.include_router(grades.router)
app.include_router(ratings.router)
