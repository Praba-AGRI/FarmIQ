from fastapi import APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse
import os
import uuid
import shutil
from pathlib import Path

from models.schemas import UserResponse, UserUpdate
from routes.auth import get_current_user
from services.storage import load_json, save_json

router = APIRouter()
security = HTTPBearer()


@router.get("/me", response_model=UserResponse)
async def get_farmer_profile(current_user: dict = Depends(get_current_user)):
    """
    Get current farmer's profile information
    """
    return UserResponse(
        user_id=current_user["user_id"],
        name=current_user["name"],
        mobile=current_user.get("mobile"),
        email=current_user.get("email"),
        location=current_user["location"],
        farming_type=current_user["farming_type"],
        preferred_language=current_user["preferred_language"],
        profile_picture_url=current_user.get("profile_picture_url")
    )


@router.put("/me", response_model=UserResponse)
async def update_farmer_profile(
    user_update: UserUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update current farmer's profile information
    
    - Only provided fields will be updated
    - All fields are optional
    """
    users_data = load_json("users.json")
    users = users_data.get("users", [])
    
    # Find and update user
    user_index = None
    for i, user in enumerate(users):
        if user.get("user_id") == current_user["user_id"]:
            user_index = i
            break
    
    if user_index is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update fields if provided
    update_data = user_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        if value is not None:
            if key == "farming_type":
                users[user_index][key] = value.value if hasattr(value, 'value') else value
            elif key == "preferred_language":
                users[user_index][key] = value.value if hasattr(value, 'value') else value
            else:
                users[user_index][key] = value
    
    users_data["users"] = users
    save_json("users.json", users_data)
    
    # Return updated user
    updated_user = users[user_index]
    return UserResponse(
        user_id=updated_user["user_id"],
        name=updated_user["name"],
        mobile=updated_user.get("mobile"),
        email=updated_user.get("email"),
        location=updated_user["location"],
        farming_type=updated_user["farming_type"],
        preferred_language=updated_user["preferred_language"],
        profile_picture_url=updated_user.get("profile_picture_url")
    )


@router.post("/me/profile-picture", response_model=UserResponse)
async def upload_profile_picture(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload profile picture for current farmer
    
    - Accepts image files (jpg, png, webp)
    - Maximum file size: 5MB
    - Returns updated user with profile_picture_url
    """
    # Validate file type
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only JPG, PNG, and WEBP are allowed."
        )
    
    # Validate file size (5MB max)
    file_content = await file.read()
    if len(file_content) > 5 * 1024 * 1024:  # 5MB
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File too large. Maximum size is 5MB."
        )
    
    # Create uploads directory if it doesn't exist
    upload_dir = Path("data/uploads/profile_pictures")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate unique filename
    file_extension = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    unique_filename = f"{current_user['user_id']}_{uuid.uuid4().hex[:8]}.{file_extension}"
    file_path = upload_dir / unique_filename
    
    # Save file
    with open(file_path, "wb") as buffer:
        buffer.write(file_content)
    
    # Update user record
    users_data = load_json("users.json")
    users = users_data.get("users", [])
    
    user_index = None
    for i, user in enumerate(users):
        if user.get("user_id") == current_user["user_id"]:
            user_index = i
            break
    
    if user_index is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Remove old profile picture if exists
    old_picture_url = users[user_index].get("profile_picture_url")
    if old_picture_url and os.path.exists(old_picture_url.replace("/api/", "")):
        try:
            os.remove(old_picture_url.replace("/api/", ""))
        except Exception:
            pass  # Ignore errors when removing old file
    
    # Update profile picture URL
    profile_picture_url = f"/api/farmers/me/profile-picture?user_id={current_user['user_id']}"
    users[user_index]["profile_picture_url"] = profile_picture_url
    
    users_data["users"] = users
    save_json("users.json", users_data)
    
    # Return updated user
    updated_user = users[user_index]
    return UserResponse(
        user_id=updated_user["user_id"],
        name=updated_user["name"],
        mobile=updated_user.get("mobile"),
        email=updated_user.get("email"),
        location=updated_user["location"],
        farming_type=updated_user["farming_type"],
        preferred_language=updated_user["preferred_language"],
        profile_picture_url=updated_user.get("profile_picture_url")
    )


@router.get("/me/profile-picture")
async def get_profile_picture(
    current_user: dict = Depends(get_current_user)
):
    """
    Get profile picture for current farmer
    """
    users_data = load_json("users.json")
    users = users_data.get("users", [])
    
    user = next(
        (u for u in users if u.get("user_id") == current_user["user_id"]),
        None
    )
    
    if not user or not user.get("profile_picture_url"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile picture not found"
        )
    
    # Extract file path from URL
    profile_picture_url = user.get("profile_picture_url")
    # Find the actual file
    upload_dir = Path("data/uploads/profile_pictures")
    user_files = list(upload_dir.glob(f"{current_user['user_id']}_*"))
    
    if not user_files:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile picture file not found"
        )
    
    # Return the most recent file
    latest_file = max(user_files, key=os.path.getctime)
    
    return FileResponse(
        str(latest_file),
        media_type="image/jpeg"
    )


@router.delete("/me/profile-picture", response_model=UserResponse)
async def remove_profile_picture(
    current_user: dict = Depends(get_current_user)
):
    """
    Remove profile picture for current farmer
    """
    users_data = load_json("users.json")
    users = users_data.get("users", [])
    
    user_index = None
    for i, user in enumerate(users):
        if user.get("user_id") == current_user["user_id"]:
            user_index = i
            break
    
    if user_index is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Remove old profile picture file if exists
    old_picture_url = users[user_index].get("profile_picture_url")
    if old_picture_url:
        upload_dir = Path("data/uploads/profile_pictures")
        user_files = list(upload_dir.glob(f"{current_user['user_id']}_*"))
        for file_path in user_files:
            try:
                os.remove(file_path)
            except Exception:
                pass  # Ignore errors
    
    # Update user record
    users[user_index]["profile_picture_url"] = None
    
    users_data["users"] = users
    save_json("users.json", users_data)
    
    # Return updated user
    updated_user = users[user_index]
    return UserResponse(
        user_id=updated_user["user_id"],
        name=updated_user["name"],
        mobile=updated_user.get("mobile"),
        email=updated_user.get("email"),
        location=updated_user["location"],
        farming_type=updated_user["farming_type"],
        preferred_language=updated_user["preferred_language"],
        profile_picture_url=None
    )




