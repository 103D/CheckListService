from typing import List

from app.schemas import BranchCreate, BranchResponse
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Branch

router = APIRouter(prefix="/branches", tags=["Branches"])


@router.post("/", response_model=BranchResponse)
def create_branch(branch_data: BranchCreate, db: Session = Depends(get_db)):
    branch = Branch(name=branch_data.name)
    db.add(branch)
    db.commit()
    db.refresh(branch)
    return branch


@router.get("/", response_model=List[BranchResponse])
def get_branches(db: Session = Depends(get_db)):
    return db.query(Branch).all()
