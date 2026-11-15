from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.security import verify_password
from app.core.database import get_db
from app.models.user import User
from app.schemas.user import AccountDelete, UserOut, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserOut)
def read_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserOut)
def update_me(
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = db.merge(current_user)
    for field, value in data.model_dump(exclude_unset=True).items():
        if value is None:
            continue
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_me(
    data: AccountDelete,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(data.password, current_user.password_hash):
        raise HTTPException(status_code=401, detail="Password is incorrect")
    db.delete(current_user)
    db.commit()
