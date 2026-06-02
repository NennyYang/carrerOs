from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from database import get_db
from models import User
from schemas import UserRegister, UserLogin, UserResponse, AuthResponse
import bcrypt

router = APIRouter(prefix="/api/auth", tags=["auth"])

def verify_password(plain_password: str, hashed_password: str) -> bool:
    # bcrypt 限制密码最大为 72 字节
    plain_password_bytes = plain_password.encode("utf-8")[:72]
    return bcrypt.checkpw(plain_password_bytes, hashed_password.encode("utf-8"))

def get_password_hash(password: str) -> str:
    # bcrypt 限制密码最大为 72 字节
    password_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password_bytes, salt).decode("utf-8")

@router.post("/register", response_model=AuthResponse)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    email = str(user_data.email).strip().lower()
    try:
        existing_user = db.query(User).filter(func.lower(User.email) == email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="该邮箱已被注册"
            )

        hashed_password = get_password_hash(user_data.password)
        new_user = User(
            name=user_data.name,
            email=email,
            password=hashed_password
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        return AuthResponse(
            success=True,
            message="注册成功",
            user=UserResponse(id=new_user.id, name=new_user.name, email=new_user.email)
        )
    except HTTPException:
        db.rollback()
        raise
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该邮箱已被注册"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"服务器内部错误: {str(e)}"
        )


@router.post("/login", response_model=AuthResponse)
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    email = str(user_data.email).strip().lower()
    user = db.query(User).filter(func.lower(User.email) == email).first()
    if not user or not verify_password(user_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="邮箱或密码错误"
        )

    return AuthResponse(
        success=True,
        message="登录成功",
        user=UserResponse(id=user.id, name=user.name, email=user.email)
    )
