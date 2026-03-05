from typing import List

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import jwt
from sqlalchemy.orm import Session

from app.core.security import ALGORITHM, SECRET_KEY
from app.database import get_db
from app.models import Branch, User
from app.schemas import BranchCreate, BranchResponse

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
