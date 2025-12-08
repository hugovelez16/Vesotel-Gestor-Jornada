from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Numeric, Date, Time, Text, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
import enum
from .database import Base

class UserRole(str, enum.Enum):
    admin = "admin"
    user = "user"

class CompanyRole(str, enum.Enum):
    admin = "admin"
    worker = "worker"

class WorkLogType(str, enum.Enum):
    particular = "particular"
    tutorial = "tutorial"

class RequestStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False)
    first_name = Column(String)
    last_name = Column(String)
    role = Column(Enum(UserRole), default=UserRole.user)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    settings = relationship("UserSettings", back_populates="user", uselist=False)
    work_logs = relationship("WorkLog", back_populates="user")
    company_memberships = relationship("CompanyMember", back_populates="user")

class Company(Base):
    __tablename__ = "companies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    fiscal_id = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    members = relationship("CompanyMember", back_populates="members")
    work_logs = relationship("WorkLog", back_populates="company")

class CompanyMember(Base):
    __tablename__ = "company_members"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"), primary_key=True)
    role = Column(Enum(CompanyRole), default=CompanyRole.worker)
    joined_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="company_memberships")
    members = relationship("Company", back_populates="members")

class UserSettings(Base):
    __tablename__ = "user_settings"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True)
    hourly_rate = Column(Numeric(10, 2), default=0.00)
    daily_rate = Column(Numeric(10, 2), default=0.00)
    coordination_rate = Column(Numeric(10, 2), default=0.00)
    night_rate = Column(Numeric(10, 2), default=0.00)
    is_gross = Column(Boolean, default=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="settings")

class WorkLog(Base):
    __tablename__ = "work_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=True)
    
    type = Column(Enum(WorkLogType), nullable=False)
    
    date = Column(Date, nullable=True)
    start_time = Column(Time, nullable=True)
    end_time = Column(Time, nullable=True)
    
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    
    duration_hours = Column(Numeric(5, 2), nullable=True)
    
    amount = Column(Numeric(10, 2), nullable=True)
    rate_applied = Column(Numeric(10, 2), nullable=True)
    
    is_gross_calculation = Column(Boolean, nullable=True)
    has_coordination = Column(Boolean, default=False)
    has_night = Column(Boolean, default=False)
    
    description = Column(Text, nullable=True)
    client = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="work_logs")
    company = relationship("Company", back_populates="work_logs")

class AccessRequest(Base):
    __tablename__ = "access_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, nullable=False)
    first_name = Column(String)
    last_name = Column(String)
    status = Column(Enum(RequestStatus), default=RequestStatus.pending)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
