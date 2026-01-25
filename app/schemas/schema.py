from pydantic import BaseModel, EmailStr ,validator

class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: str = "user"  # Default to user

    @validator('password')
    def password_validator(cls, v):
        if not v:
            raise ValueError("Password cannot be empty")

        is_upper = any(val.upper() for val in v)
        have_digit = any(val.isdigit() for val in v)

        if not is_upper and not have_digit and len(v) < 8:
            raise ValueError("Password must contain at least 8 characters")

        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    new_password: str
