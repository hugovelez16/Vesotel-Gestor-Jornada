from pydantic import BaseModel
from typing import Optional, List
from datetime import date, time, datetime
from uuid import UUID
from enum import Enum

# Enums (mirroring models for validation)
class WorkLogType(str, Enum):
    particular = "particular"
    tutorial = "tutorial"

class WorkLogBase(BaseModel):
    type: WorkLogType
    date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    duration_hours: Optional[float] = None
    is_gross_calculation: Optional[bool] = None
    has_coordination: bool = False
    has_night: bool = False
    description: Optional[str] = None
    client: Optional[str] = None
    company_id: Optional[UUID] = None

class WorkLogCreate(WorkLogBase):
    user_id: UUID

class WorkLogResponse(WorkLogBase):
    id: UUID
    user_id: UUID
    amount: Optional[float]
    rate_applied: Optional[float]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
