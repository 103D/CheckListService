from typing import Optional

from pydantic import BaseModel, Field, field_validator


class EmployeeRating(BaseModel):
    employee_id: int
    employee_name: str
    average_score: float
    total_grades: int

    class Config:
        from_attributes = True


class GradeCreate(BaseModel):
    value: int  # 1–100
    role_in_shift: str  # Продавец, Официант, Кассир, Бариста
    comment: Optional[str] = None
    employee_id: int


class GradeResponse(BaseModel):
    id: int
    value: int
    role_in_shift: str
    comment: Optional[str]
    employee_id: int
    manager_id: int
    created_at: str

    class Config:
        from_attributes = True


class EmployeeCreate(BaseModel):
    name: str
    branch_id: int  # филиал, к которому принадлежит сотрудник


class EmployeeResponse(BaseModel):
    id: int
    name: str
    branch_id: int

    class Config:
        from_attributes = True


class BranchCreate(BaseModel):
    name: str


class BranchResponse(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=6, max_length=128)
    role: str  # ADMIN или MANAGER
    branch_id: int

    @field_validator("password")
    @classmethod
    def validate_password_bcrypt_limit(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password is too long for bcrypt (max 72 bytes)")
        return value


class UserResponse(BaseModel):
    id: int
    username: str
    role: str
    branch_id: int

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
