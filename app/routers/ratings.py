from typing import List

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import jwt
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.security import ALGORITHM, SECRET_KEY
from app.database import get_db
from app.models import Employee, Grade, User
from app.schemas import EmployeeRating

router = APIRouter(prefix="/ratings", tags=["Ratings"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        user = db.query(User).filter(User.username == username).first()
        return user
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.get("/branch/{branch_id}", response_model=List[EmployeeRating])
def get_branch_ratings(
    branch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # MANAGER может смотреть только свой филиал
    if current_user.role == "MANAGER" and branch_id != current_user.branch_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Считаем средний рейтинг и количество оценок для каждого сотрудника
    ratings = (
        db.query(
            Employee.id.label("employee_id"),
            Employee.name.label("employee_name"),
            func.avg(Grade.value).label("average_score"),
            func.count(Grade.id).label("total_grades"),
        )
        .outerjoin(Grade, Employee.id == Grade.employee_id)
        .filter(Employee.branch_id == branch_id)
        .group_by(Employee.id)
        .order_by(func.avg(Grade.value).desc())
        .all()
    )

    return ratings


@router.get("/all", response_model=List[EmployeeRating])
def get_all_ratings(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")

    ratings = (
        db.query(
            Employee.id.label("employee_id"),
            Employee.name.label("employee_name"),
            func.avg(Grade.value).label("average_score"),
            func.count(Grade.id).label("total_grades"),
        )
        .outerjoin(Grade, Employee.id == Grade.employee_id)
        .group_by(Employee.id)
        .order_by(func.avg(Grade.value).desc())
        .all()
    )

    return ratings


@router.get("/top", response_model=List[EmployeeRating])
def get_top_employees(
    top_n: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Возвращает топ N сотрудников по среднему баллу.
    - ADMIN видит всех
    - MANAGER видит только свой филиал
    """
    query = db.query(
        Employee.id.label("employee_id"),
        Employee.name.label("employee_name"),
        func.avg(Grade.value).label("average_score"),
        func.count(Grade.id).label("total_grades"),
    ).outerjoin(Grade, Employee.id == Grade.employee_id)

    # MANAGER видит только свой филиал
    if current_user.role == "MANAGER":
        query = query.filter(Employee.branch_id == current_user.branch_id)

    query = (
        query.group_by(Employee.id).order_by(func.avg(Grade.value).desc()).limit(top_n)
    )
    return query.all()
