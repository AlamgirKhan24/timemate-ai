"""Add token revocation, WhatsApp verification state, and reminder claims.

Revision ID: cf20261105
Revises: 914aa539cf03
Create Date: 2026-11-05
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "cf20261105"
down_revision: Union[str, Sequence[str], None] = "914aa539cf03"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("token_version", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "user_notification_settings",
        sa.Column("verification_code_hash", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "user_notification_settings",
        sa.Column(
            "verification_attempts", sa.Integer(), nullable=False, server_default="0"
        ),
    )
    op.add_column(
        "user_notification_settings",
        sa.Column("verification_expires_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "reminders", sa.Column("claimed_at", sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column(
        "notification_logs",
        sa.Column("retry_safe", sa.Boolean(), nullable=False, server_default="false"),
    )


def downgrade() -> None:
    op.drop_column("reminders", "claimed_at")
    op.drop_column("notification_logs", "retry_safe")
    op.drop_column("user_notification_settings", "verification_expires_at")
    op.drop_column("user_notification_settings", "verification_attempts")
    op.drop_column("user_notification_settings", "verification_code_hash")
    op.drop_column("users", "token_version")
