from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Branch(Base):
    __tablename__ = "branches"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String, unique=True)

    users = relationship("User", back_populates="branch")
    employees = relationship("Employee", back_populates="branch")


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column("email", String, unique=True)
    hashed_password: Mapped[str] = mapped_column(String)
    role: Mapped[str] = mapped_column(String)  # ADMIN или MANAGER

    branch_id: Mapped[int] = mapped_column(ForeignKey("branches.id"))

    branch = relationship("Branch", back_populates="users")
    grades = relationship("Grade", back_populates="manager")


class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String)

    branch_id: Mapped[int] = mapped_column(ForeignKey("branches.id"))

    branch = relationship("Branch", back_populates="employees")
    grades = relationship("Grade", back_populates="employee")


class Grade(Base):
    __tablename__ = "grades"

    id: Mapped[int] = mapped_column(primary_key=True)
    value: Mapped[int] = mapped_column(Integer)
    comment: Mapped[str] = mapped_column(String, nullable=True)
    role_in_shift: Mapped[str] = mapped_column(String)  # Новое поле

    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"))
    manager_id: Mapped[int] = mapped_column(ForeignKey("users.id"))

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    employee = relationship("Employee", back_populates="grades")
    manager = relationship("User", back_populates="grades")
