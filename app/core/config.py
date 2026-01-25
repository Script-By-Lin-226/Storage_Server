import os

from dotenv import load_dotenv
from pydantic_settings import BaseSettings

load_dotenv()

class Settings(BaseSettings):
    secret_key: str = os.getenv("SECRET_KEY")
    database_url: str = os.getenv("DATABASE_URL")
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXP"))
    refresh_token_expire_days: int = int(os.getenv("REFRESH_TOKEN_EXP"))
    algorithm: str = os.getenv("ALGORITHM")
    redis_url: str = os.getenv("REDIS_URL")
    redis_host: str = os.getenv("REDIS_HOST")
    redis_port: int = os.getenv("REDIS_PORT")
    # Storage configuration - supports Linux LVM paths
    upload_dir: str = os.getenv("UPLOAD_DIR", "/var/storage/uploads")  # Default Linux path

settings = Settings()