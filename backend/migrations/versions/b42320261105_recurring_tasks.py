"""Add recurring schedules and idempotent task occurrences.

Revision ID: b42320261105
Revises: cf20261105
Create Date: 2026-11-05
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b42320261105"
down_revision: Union[str, Sequence[str], None] = "cf20261105"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "recurring_schedules",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("local_time", sa.Time(), nullable=False),
        sa.Column("timezone", sa.String(length=64), nullable=False),
        sa.Column("frequency", sa.String(length=20), nullable=False),
        sa.Column("weekdays", sa.JSON(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("duration_minutes", sa.Integer(), nullable=True),
        sa.Column("priority", sa.String(length=10), nullable=False),
        sa.Column("category", sa.String(length=50), nullable=False),
        sa.Column("reminder_offsets", sa.JSON(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_recurring_schedules_user_id", "recurring_schedules", ["user_id"])
    op.create_index("ix_recurring_schedules_is_active", "recurring_schedules", ["is_active"])
    op.add_column("tasks", sa.Column("recurring_schedule_id", sa.Integer(), nullable=True))
    op.add_column("tasks", sa.Column("occurrence_date", sa.Date(), nullable=True))
    op.create_foreign_key(
        "fk_tasks_recurring_schedule_id_recurring_schedules",
        "tasks",
        "recurring_schedules",
        ["recurring_schedule_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_tasks_recurring_schedule_id", "tasks", ["recurring_schedule_id"])
    op.create_unique_constraint(
        "uq_task_recurrence_occurrence", "tasks", ["recurring_schedule_id", "occurrence_date"]
    )


def downgrade() -> None:
    op.drop_constraint("uq_task_recurrence_occurrence", "tasks", type_="unique")
    op.drop_index("ix_tasks_recurring_schedule_id", table_name="tasks")
    op.drop_constraint("fk_tasks_recurring_schedule_id_recurring_schedules", "tasks", type_="foreignkey")
    op.drop_column("tasks", "occurrence_date")
    op.drop_column("tasks", "recurring_schedule_id")
    op.drop_index("ix_recurring_schedules_is_active", table_name="recurring_schedules")
    op.drop_index("ix_recurring_schedules_user_id", table_name="recurring_schedules")
    op.drop_table("recurring_schedules")
