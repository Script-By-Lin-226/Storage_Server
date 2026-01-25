from pydantic import EmailStr
from sqlalchemy import Column, Integer, BigInteger, String, ForeignKey, func, DateTime, Boolean
from sqlalchemy.orm import relationship

from app.core.database_utils import Base

class UserTable(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String, index=True, unique=True, nullable=False)
    email = Column(String, index=True, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False, default='user')
    created_at = Column(DateTime(timezone=True), default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    quota = relationship("UserQuotas", back_populates="user")
    files = relationship("FileTable", back_populates="user", cascade="all, delete-orphan")

class FileTable(Base):
    __tablename__ = "files"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    owner_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    filename = Column(String, index=True, nullable=False)
    file_path = Column(String, nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    user = relationship("UserTable", back_populates="files")

class UserQuotas(Base):
    __tablename__ = "user_quotas"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    max_storage_size = Column(BigInteger, nullable=False)  # Changed to BigInteger to support large values (up to 9 exabytes)
    used_storage_size = Column(BigInteger, nullable=False)  # Changed to BigInteger to support large values

    user = relationship("UserTable", back_populates="quota")