from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Branch
from app.schemas import BranchCreate, BranchResponse

router = APIRouter(prefix="/branches", tags=["Branches"])


@router.post("/", response_model=BranchResponse)
def create_branch(branch_data: BranchCreate, db: Session = Depends(get_db)):
    branch = Branch(name=branch_data.name, city=branch_data.city or "Almaty")
    db.add(branch)
    db.commit()
    db.refresh(branch)
    return branch


@router.get("/", response_model=List[BranchResponse])
def get_branches(db: Session = Depends(get_db)):
    return db.query(Branch).all()
