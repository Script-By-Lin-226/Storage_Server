"""change_quota_columns_to_bigint

Revision ID: fa4f8a9a3687
Revises: 52fe4d1819d5
Create Date: 2026-01-26 00:05:46.834992

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fa4f8a9a3687'
down_revision: Union[str, Sequence[str], None] = '52fe4d1819d5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - change Integer to BigInteger for quota columns."""
    # Change max_storage_size from INTEGER to BIGINT
    op.alter_column('user_quotas', 'max_storage_size',
                    existing_type=sa.Integer(),
                    type_=sa.BigInteger(),
                    existing_nullable=False)
    
    # Change used_storage_size from INTEGER to BIGINT
    op.alter_column('user_quotas', 'used_storage_size',
                    existing_type=sa.Integer(),
                    type_=sa.BigInteger(),
                    existing_nullable=False)


def downgrade() -> None:
    """Downgrade schema - change BigInteger back to Integer."""
    # Note: This may fail if there are values larger than INTEGER max
    op.alter_column('user_quotas', 'max_storage_size',
                    existing_type=sa.BigInteger(),
                    type_=sa.Integer(),
                    existing_nullable=False)
    
    op.alter_column('user_quotas', 'used_storage_size',
                    existing_type=sa.BigInteger(),
                    type_=sa.Integer(),
                    existing_nullable=False)
