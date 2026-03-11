from typing import List

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import jwt
from sqlalchemy.orm import Session

from app.core.security import ALGORITHM, SECRET_KEY
from app.database import get_db
from sqlalchemy import func

from app.models import Branch, Employee, Grade, User
from app.schemas import BranchCreate, BranchResponse, BranchUpdate, BranchWithRating

router = APIRouter(prefix="/branches", tags=["Branches"])
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


@router.post("/", response_model=BranchResponse)
def create_branch(
    branch_data: BranchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=403, detail="Только администратор может создавать филиалы"
        )
    branch = Branch(name=branch_data.name, city=branch_data.city or "Almaty")
    db.add(branch)
    db.commit()
    db.refresh(branch)
    return branch


@router.get("/", response_model=List[BranchWithRating])
def get_branches(db: Session = Depends(get_db)):
    avg_score = func.coalesce(func.avg(Grade.value), 0.0)
    emp_count = func.count(func.distinct(Employee.id))

    rows = (
        db.query(
            Branch.id,
            Branch.name,
            Branch.city,
            avg_score.label("average_score"),
            emp_count.label("employee_count"),
        )
        .outerjoin(Employee, Employee.branch_id == Branch.id)
        .outerjoin(
            Grade,
            (Grade.employee_id == Employee.id) & (Grade.status == "APPROVED"),
        )
        .group_by(Branch.id)
        .order_by(Branch.id)
        .all()
    )
    return rows


@router.put("/{branch_id}", response_model=BranchResponse)
def update_branch(
    branch_id: int,
    branch_data: BranchUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=403, detail="Только администратор может изменять филиалы"
        )

    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Филиал не найден")

    branch.name = branch_data.name
    branch.city = branch_data.city or "Almaty"
    db.commit()
    db.refresh(branch)
    return branch


@router.delete("/{branch_id}", status_code=204)
def delete_branch(
    branch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=403, detail="Только администратор может удалять филиалы"
        )

    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Филиал не найден")

    has_employees = (
        db.query(Employee.id).filter(Employee.branch_id == branch_id).first()
    )
    has_users = db.query(User.id).filter(User.branch_id == branch_id).first()
    if has_employees or has_users:
        raise HTTPException(
            status_code=400,
            detail="Нельзя удалить филиал: к нему привязаны сотрудники или пользователи",
        )

    db.delete(branch)
    db.commit()
