"""Change resume id and candidate_id to GUID type

Revision ID: 96c1f4777c60
Revises: 158db1be7cd0
Create Date: 2026-04-11 22:07:31.659303

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '96c1f4777c60'
down_revision = '158db1be7cd0'
branch_labels = None
depends_on = None


def upgrade():
    # Drop foreign key constraints first
    op.drop_constraint('resumes_candidate_id_fkey', 'resumes', type_='foreignkey')
    op.drop_constraint('reports_candidate_id_fkey', 'reports', type_='foreignkey')
    op.drop_constraint('reports_resume_id_fkey', 'reports', type_='foreignkey')
    
    # Change all columns to UUID
    op.alter_column('users', 'id', type_=postgresql.UUID(as_uuid=True), postgresql_using='id::uuid')
    op.alter_column('resumes', 'id', type_=postgresql.UUID(as_uuid=True), postgresql_using='id::uuid')
    op.alter_column('resumes', 'candidate_id', type_=postgresql.UUID(as_uuid=True), postgresql_using='candidate_id::uuid')
    op.alter_column('reports', 'id', type_=postgresql.UUID(as_uuid=True), postgresql_using='id::uuid')
    op.alter_column('reports', 'interview_id', type_=postgresql.UUID(as_uuid=True), postgresql_using='interview_id::uuid')
    op.alter_column('reports', 'candidate_id', type_=postgresql.UUID(as_uuid=True), postgresql_using='candidate_id::uuid')
    op.alter_column('reports', 'resume_id', type_=postgresql.UUID(as_uuid=True), postgresql_using='resume_id::uuid')
    
    # Recreate foreign key constraints
    op.create_foreign_key('resumes_candidate_id_fkey', 'resumes', 'users', ['candidate_id'], ['id'], ondelete='CASCADE')
    op.create_foreign_key('reports_candidate_id_fkey', 'reports', 'users', ['candidate_id'], ['id'], ondelete='CASCADE')
    op.create_foreign_key('reports_resume_id_fkey', 'reports', 'resumes', ['resume_id'], ['id'], ondelete='CASCADE')


def downgrade():
    # Drop foreign key constraints
    op.drop_constraint('resumes_candidate_id_fkey', 'resumes', type_='foreignkey')
    op.drop_constraint('reports_candidate_id_fkey', 'reports', type_='foreignkey')
    op.drop_constraint('reports_resume_id_fkey', 'reports', type_='foreignkey')
    
    # Revert back to VARCHAR
    op.alter_column('users', 'id', type_=sa.String(36))
    op.alter_column('resumes', 'id', type_=sa.String(36))
    op.alter_column('resumes', 'candidate_id', type_=sa.String(36))
    op.alter_column('reports', 'id', type_=sa.String(36))
    op.alter_column('reports', 'interview_id', type_=sa.String(36))
    op.alter_column('reports', 'candidate_id', type_=sa.String(36))
    op.alter_column('reports', 'resume_id', type_=sa.String(36))
    
    # Recreate foreign key constraints
    op.create_foreign_key('resumes_candidate_id_fkey', 'resumes', 'users', ['candidate_id'], ['id'], ondelete='CASCADE')
    op.create_foreign_key('reports_candidate_id_fkey', 'reports', 'users', ['candidate_id'], ['id'], ondelete='CASCADE')
    op.create_foreign_key('reports_resume_id_fkey', 'reports', 'resumes', ['resume_id'], ['id'], ondelete='CASCADE')
