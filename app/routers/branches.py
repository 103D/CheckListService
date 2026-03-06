from typing import List

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import jwt
from sqlalchemy.orm import Session

from app.core.security import ALGORITHM, SECRET_KEY
from app.database import get_db
from app.models import Branch, Employee, User
from app.schemas import BranchCreate, BranchResponse, BranchUpdate

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
        raise HTTPException(status_code=403, detail="Только администратор может создавать филиалы")
    branch = Branch(name=branch_data.name, city=branch_data.city or "Almaty")
    db.add(branch)
    db.commit()
    db.refresh(branch)
    return branch


@router.get("/", response_model=List[BranchResponse])
def get_branches(db: Session = Depends(get_db)):
    return db.query(Branch).all()


@router.put("/{branch_id}", response_model=BranchResponse)
def update_branch(
    branch_id: int,
    branch_data: BranchUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Только администратор может изменять филиалы")

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
        raise HTTPException(status_code=403, detail="Только администратор может удалять филиалы")

    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Филиал не найден")

    has_employees = db.query(Employee.id).filter(Employee.branch_id == branch_id).first()
    has_users = db.query(User.id).filter(User.branch_id == branch_id).first()
    if has_employees or has_users:
        raise HTTPException(
            status_code=400,
            detail="Нельзя удалить филиал: к нему привязаны сотрудники или пользователи",
        )

    db.delete(branch)
    db.commit()
