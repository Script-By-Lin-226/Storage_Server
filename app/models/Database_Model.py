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
    premium_purchases = relationship(
        "PremiumPurchase",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    messages = relationship(
        "UserMessage",
        back_populates="user",
        cascade="all, delete-orphan",
    )


class FileTable(Base):
    __tablename__ = "files"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    owner_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    filename = Column(String, index=True, nullable=False)
    file_path = Column(String, nullable=False)
    # When encryption is used, original file size (for quota and display). None = use disk size.
    plain_size_bytes = Column(BigInteger, nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    download_count = Column(Integer, nullable=False, default=0)

    user = relationship("UserTable", back_populates="files")


class UserQuotas(Base):
    __tablename__ = "user_quotas"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    max_storage_size = Column(BigInteger, nullable=False)  # Changed to BigInteger to support large values (up to 9 exabytes)
    used_storage_size = Column(BigInteger, nullable=False)  # Changed to BigInteger to support large values

    user = relationship("UserTable", back_populates="quota")


class PremiumPurchase(Base):
    """
    Record of a user's premium plan purchase and optional payment transcript.
    """

    __tablename__ = "premium_purchases"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Plan info
    plan_name = Column(String, nullable=False)  # e.g. "Free", "Premium 200GB", "Pro 1TB"
    storage_gb = Column(Integer, nullable=False)
    price_ks = Column(Integer, nullable=False)

    # Payment info
    phone_msisdn = Column(String, nullable=False)  # Myanmar phone number, including +95
    payment_method = Column(String, nullable=False)  # "KBZ_PAY" or "WAVE_PAY"
    transcript_path = Column(String, nullable=True)  # path to uploaded proof file

    # Approval status for admins: "pending", "approved", "rejected"
    status = Column(String, nullable=False, default="pending")
    # When an approved plan will expire (e.g. 30 days from approval)
    expires_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), default=func.now())

    user = relationship("UserTable", back_populates="premium_purchases")


class UserMessage(Base):
    """
    In-app messages between a user and admin, plus system reminders.

    - user_id: the "customer" this conversation belongs to
    - sender: "user" | "admin" | "system"
    - message_type: "general" | "expiry_reminder"
    - related_expires_at: used for deduping expiry reminders
    """

    __tablename__ = "user_messages"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    sender = Column(String, nullable=False, default="user")
    message_type = Column(String, nullable=False, default="general")
    content = Column(String, nullable=False)

    related_expires_at = Column(DateTime(timezone=True), nullable=True)

    read_by_user = Column(Boolean, nullable=False, default=False)
    read_by_admin = Column(Boolean, nullable=False, default=False)

    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)

    user = relationship("UserTable", back_populates="messages")