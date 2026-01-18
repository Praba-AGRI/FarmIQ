from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import timedelta
import uuid

from models.schemas import UserCreate, UserLogin, UserResponse, Token, UserUpdate
from services.auth_service import hash_password, verify_password, create_access_token, verify_token
from services.storage import load_json, save_json

router = APIRouter()
security = HTTPBearer()


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    Dependency to get current authenticated user from JWT token
    """
    token = credentials.credentials
    payload = verify_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )
    
    # Load user from storage
    users_data = load_json("users.json")
    users = users_data.get("users", [])
    
    user = next((u for u in users if u.get("user_id") == user_id), None)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    
    return user


@router.post("/signup", response_model=Token, status_code=status.HTTP_201_CREATED)
async def signup(user_data: UserCreate):
    """
    Create a new user account
    
    - **name**: User's full name
    - **mobile**: Mobile number (optional if email provided)
    - **email**: Email address (optional if mobile provided)
    - **password**: User password
    - **location**: User's location
    - **farming_type**: organic or conventional
    - **preferred_language**: en or ta
    """
    # Validate that at least email or mobile is provided
    if not user_data.email and not user_data.mobile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either email or mobile number must be provided"
        )
    
    # Load existing users
    users_data = load_json("users.json")
    users = users_data.get("users", [])
    
    # Check if user already exists
    for user in users:
        if user_data.email and user.get("email") == user_data.email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        if user_data.mobile and user.get("mobile") == user_data.mobile:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mobile number already registered"
            )
    
    # Create new user
    user_id = str(uuid.uuid4())
    hashed_password = hash_password(user_data.password)
    
    new_user = {
        "user_id": user_id,
        "name": user_data.name,
        "mobile": user_data.mobile,
        "email": user_data.email,
        "password_hash": hashed_password,
        "location": user_data.location,
        "farming_type": user_data.farming_type.value,
        "preferred_language": user_data.preferred_language.value
    }
    
    users.append(new_user)
    users_data["users"] = users
    save_json("users.json", users_data)
    
    # Create access token
    access_token = create_access_token(data={"sub": user_id})
    
    # Return user response (without password)
    user_response = UserResponse(
        user_id=new_user["user_id"],
        name=new_user["name"],
        mobile=new_user["mobile"],
        email=new_user["email"],
        location=new_user["location"],
        farming_type=new_user["farming_type"],
        preferred_language=new_user["preferred_language"]
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=user_response
    )


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin):
    """
    Authenticate user and return JWT token
    
    - **email_or_mobile**: Email address or mobile number
    - **password**: User password
    """
    users_data = load_json("users.json")
    users = users_data.get("users", [])
    
    # Find user by email or mobile
    user = None
    for u in users:
        if credentials.email_or_mobile == u.get("email") or credentials.email_or_mobile == u.get("mobile"):
            user = u
            break
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email/mobile or password"
        )
    
    # Verify password
    if not verify_password(credentials.password, user.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email/mobile or password"
        )
    
    # Create access token
    access_token = create_access_token(data={"sub": user["user_id"]})
    
    # Return user response (without password)
    user_response = UserResponse(
        user_id=user["user_id"],
        name=user["name"],
        mobile=user.get("mobile"),
        email=user.get("email"),
        location=user["location"],
        farming_type=user["farming_type"],
        preferred_language=user["preferred_language"]
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=user_response
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """
    Get current authenticated user information
    """
    return UserResponse(
        user_id=current_user["user_id"],
        name=current_user["name"],
        mobile=current_user.get("mobile"),
        email=current_user.get("email"),
        location=current_user["location"],
        farming_type=current_user["farming_type"],
        preferred_language=current_user["preferred_language"]
    )



