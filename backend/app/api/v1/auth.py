from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.db.session import get_db
from app.models.models import User, UserRole, UserQuota
from app.schemas.schemas import UserRegister, UserLogin, Token, UserOut, UserUpdate
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserRegister, db: AsyncSession = Depends(get_db)):
    # Check if username or email exists
    result = await db.execute(
        select(User).where(or_(User.email == user_in.email, User.username == user_in.username))
    )
    existing_user = result.scalar_one_or_none()
    if existing_user:
        if existing_user.email == user_in.email:
            raise HTTPException(status_code=400, detail="A user with this email already exists.")
        raise HTTPException(status_code=400, detail="A user with this username already exists.")

    # Determine role: first user becomes admin, others default to user
    count_res = await db.execute(select(User))
    users_count = len(count_res.scalars().all())
    assigned_role = UserRole.ADMIN.value if users_count == 0 else UserRole.USER.value

    user = User(
        email=user_in.email,
        username=user_in.username,
        full_name=user_in.full_name or user_in.username,
        hashed_password=get_password_hash(user_in.password),
        role=assigned_role,
        is_active=True
    )
    db.add(user)
    await db.flush()

    # Create default user quota
    quota = UserQuota(user_id=user.id)
    db.add(quota)

    await db.commit()
    await db.refresh(user)

    access_token = create_access_token(subject=user.id)
    return Token(access_token=access_token, token_type="bearer", user=UserOut.model_validate(user))

@router.post("/login", response_model=Token)
async def login(credentials: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).where(
            or_(
                User.email == credentials.username_or_email,
                User.username == credentials.username_or_email
            )
        )
    )
    user = result.scalar_one_or_none()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user account.")

    access_token = create_access_token(subject=user.id)
    return Token(access_token=access_token, token_type="bearer", user=UserOut.model_validate(user))

@router.get("/me", response_model=UserOut)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)

@router.patch("/me", response_model=UserOut)
async def update_users_me(
    update_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if update_data.full_name is not None:
        current_user.full_name = update_data.full_name
    if update_data.avatar_url is not None:
        current_user.avatar_url = update_data.avatar_url
    if update_data.password:
        current_user.hashed_password = get_password_hash(update_data.password)

    await db.commit()
    await db.refresh(current_user)
    return UserOut.model_validate(current_user)

@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    return {"message": "Successfully logged out."}
