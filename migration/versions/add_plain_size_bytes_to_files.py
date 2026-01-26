"""add_plain_size_bytes_to_files

Revision ID: a1b2c3d4e5f6
Revises: fa4f8a9a3687
Create Date: 2026-01-26

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "fa4f8a9a3687"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("files", sa.Column("plain_size_bytes", sa.BigInteger(), nullable=True))


def downgrade() -> None:
    op.drop_column("files", "plain_size_bytes")
