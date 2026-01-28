"""Add user messages

Revision ID: c9d1e2a3b4c5
Revises: b1d07baf989f
Create Date: 2026-01-29

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c9d1e2a3b4c5"
down_revision: Union[str, Sequence[str], None] = "b1d07baf989f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_messages",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("sender", sa.String(), nullable=False, server_default="user"),
        sa.Column("message_type", sa.String(), nullable=False, server_default="general"),
        sa.Column("content", sa.String(), nullable=False),
        sa.Column("related_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("read_by_user", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("read_by_admin", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_user_messages_id"), "user_messages", ["id"], unique=False)
    op.create_index(op.f("ix_user_messages_user_id"), "user_messages", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_user_messages_user_id"), table_name="user_messages")
    op.drop_index(op.f("ix_user_messages_id"), table_name="user_messages")
    op.drop_table("user_messages")

