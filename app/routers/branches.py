from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordBearer
from jose import jwt
from sqlalchemy import and_, func
from sqlalchemy.orm import Session

from app.core.security import ALGORITHM, SECRET_KEY
from app.database import get_db
from app.models import Branch, Employee, Grade, User
from app.schemas import (
    BranchCreate,
    BranchRatingsHistory,
    BranchResponse,
    BranchUpdate,
    BranchWithStats,
    DailyRating,
)

router = APIRouter(prefix="/branches", tags=["Branches"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")


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


def get_date_filter(period: Optional[str], date_from: Optional[str] = None, date_to: Optional[str] = None) -> tuple[datetime, datetime]:
    """Calculate date range based on period filter or custom date range."""
    now = datetime.utcnow()

    # If custom date range is provided, use it
    if date_from or date_to:
        if date_from:
            try:
                start = datetime.strptime(date_from, "%Y-%m-%d")
            except ValueError:
                start = datetime(1970, 1, 1)
        else:
            start = datetime(1970, 1, 1)
        
        if date_to:
            try:
                end = datetime.strptime(date_to, "%Y-%m-%d")
                end = end.replace(hour=23, minute=59, second=59, microsecond=999999)
            except ValueError:
                end = now
        else:
            end = now
        
        return start, end

    if period == "today":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=1)
    elif period == "week":
        start = now - timedelta(days=now.weekday())
        start = start.replace(hour=0, minute=0, second=0, microsecond=0)
        end = now
    elif period == "month":
        start = datetime(now.year, now.month, 1)
        end = now
    elif period == "year":
        start = datetime(now.year, 1, 1)
        end = now
    else:
        # No period filter - use all time
        start = datetime(1970, 1, 1)
        end = now

    return start, end


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


@router.get("/cities", response_model=List[str])
def get_cities(db: Session = Depends(get_db)):
    """Returns list of unique cities."""
    results = db.query(Branch.city).distinct().all()
    return [r[0] for r in results]


@router.get("/", response_model=List[BranchWithStats])
def get_branches(
    db: Session = Depends(get_db),
    search: Optional[str] = Query(None, description="Search by name or city"),
    city: Optional[str] = Query(None, description="Filter by city"),
    period: Optional[str] = Query(
        None, description="Period for rating: today, week, month, year"
    ),
    date_from: Optional[str] = Query(None, description="Start date for custom range (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="End date for custom range (YYYY-MM-DD)"),
    sort_by: Optional[str] = Query(
        "id", description="Sort by: id, name, city, average_rating, employees_count"
    ),
    sort_order: Optional[str] = Query("asc", description="Sort order: asc, desc"),
):
    # Get date range for period filter or custom date range
    date_start, date_end = get_date_filter(period, date_from, date_to)

    # Subquery for average rating per branch (filtered by period and status)
    avg_rating_subquery = (
        db.query(Employee.branch_id, func.avg(Grade.value).label("average_rating"))
        .join(Grade, Grade.employee_id == Employee.id)
        .filter(
            and_(
                Grade.created_at >= date_start,
                Grade.created_at < date_end,
                Grade.status == "APPROVED",
            )
        )
        .group_by(Employee.branch_id)
        .subquery()
    )

    # Subquery for employee count per branch
    employees_count_subquery = (
        db.query(Employee.branch_id, func.count(Employee.id).label("employees_count"))
        .group_by(Employee.branch_id)
        .subquery()
    )

    # Main query joining branches with the subqueries
    query = (
        db.query(
            Branch.id,
            Branch.name,
            Branch.city,
            func.coalesce(avg_rating_subquery.c.average_rating, 0).label(
                "average_rating"
            ),
            func.coalesce(employees_count_subquery.c.employees_count, 0).label(
                "employees_count"
            ),
        )
        .outerjoin(avg_rating_subquery, Branch.id == avg_rating_subquery.c.branch_id)
        .outerjoin(
            employees_count_subquery, Branch.id == employees_count_subquery.c.branch_id
        )
    )

    # Apply search filter
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Branch.name.ilike(search_term)) | (Branch.city.ilike(search_term))
        )

    # Apply city filter
    if city:
        query = query.filter(Branch.city == city)

    # Execute the query to get all branches with their stats
    results_raw = query.all()

    # Convert to BranchWithStats objects
    results = []
    for row in results_raw:
        avg_rating = row.average_rating
        average_rating = round(avg_rating, 2) if avg_rating else None
        employees_count = row.employees_count if row.employees_count else 0

        results.append(
            BranchWithStats(
                id=row.id,
                name=row.name,
                city=row.city,
                average_rating=average_rating,
                employees_count=employees_count,
            )
        )

    # Apply sorting
    reverse = sort_order == "desc"

    if sort_by == "name":
        results.sort(key=lambda x: x.name or "", reverse=reverse)
    elif sort_by == "city":
        results.sort(key=lambda x: x.city or "", reverse=reverse)
    elif sort_by == "average_rating":
        results.sort(
            key=lambda x: x.average_rating if x.average_rating is not None else -1,
            reverse=reverse,
        )
    elif sort_by == "employees_count":
        results.sort(key=lambda x: x.employees_count, reverse=reverse)
    else:  # sort_by == "id"
        results.sort(key=lambda x: x.id, reverse=reverse)

    return results


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


@router.get("/ratings-history", response_model=list[BranchRatingsHistory])
def get_branches_ratings_history(
    days: int = Query(30, ge=1, le=365, description="Number of days to look back"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns daily average ratings for all branches over the specified number of days.
    Optimized to use single query with SQL aggregation instead of N+1 queries.
    """

    # Get all branches
    branches = db.query(Branch).all()

    # Calculate date range
    today = datetime.utcnow().date()
    start_date = today - timedelta(days=days - 1)  # days-1 to include today
    start_datetime = datetime.combine(start_date, datetime.min.time())
    end_datetime = datetime.combine(today + timedelta(days=1), datetime.min.time())

    # Single query to get all ratings data with aggregation
    # Groups by branch_id and date to get daily averages and counts
    ratings_data = (
        db.query(
            Employee.branch_id,
            func.date(Grade.created_at).label("date"),
            func.avg(Grade.value).label("avg_rating"),
            func.count(Grade.id).label("grades_count"),
        )
        .join(Grade, Grade.employee_id == Employee.id)
        .filter(
            and_(
                Grade.created_at >= start_datetime,
                Grade.created_at < end_datetime,
                Grade.status == "APPROVED",
            )
        )
        .group_by(Employee.branch_id, func.date(Grade.created_at))
        .all()
    )

    # Build a lookup dictionary: (branch_id, date_string) -> (avg_rating, count)
    ratings_lookup = {}
    for branch_id, date, avg_rating, grades_count in ratings_data:
        date_str = date.strftime("%Y-%m-%d") if hasattr(date, "strftime") else str(date)
        ratings_lookup[(branch_id, date_str)] = (
            round(avg_rating, 2) if avg_rating else None,
            grades_count or 0,
        )

    # Build results for each branch
    results = []
    for branch in branches:
        ratings = []

        # Generate entries for each day in range
        for i in range(days):
            day = today - timedelta(days=i)
            day_str = day.strftime("%Y-%m-%d")

            # Look up the rating data for this branch and day
            rating_data = ratings_lookup.get((branch.id, day_str))

            if rating_data:
                avg_rating, grades_count = rating_data
                ratings.append(
                    DailyRating(
                        date=day_str,
                        average_rating=avg_rating,
                        grades_count=grades_count,
                    )
                )
            else:
                ratings.append(
                    DailyRating(
                        date=day_str,
                        average_rating=None,
                        grades_count=0,
                    )
                )

        # Reverse to show oldest first
        ratings.reverse()

        results.append(
            BranchRatingsHistory(
                branch_id=branch.id,
                branch_name=branch.name,
                ratings=ratings,
            )
        )

    return results
