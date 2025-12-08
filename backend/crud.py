from sqlalchemy.orm import Session
from . import models, schemas
from datetime import date, datetime

def get_user_settings(db: Session, user_id: str):
    return db.query(models.UserSettings).filter(models.UserSettings.user_id == user_id).first()

def create_work_log(db: Session, work_log: schemas.WorkLogCreate):
    # 1. Get User Settings
    user_settings = get_user_settings(db, str(work_log.user_id))
    
    # Default values if settings exist
    hourly_rate = user_settings.hourly_rate if user_settings else 0
    daily_rate = user_settings.daily_rate if user_settings else 0
    coordination_rate = user_settings.coordination_rate if user_settings else 0
    night_rate = user_settings.night_rate if user_settings else 0
    default_is_gross = user_settings.is_gross if user_settings else True

    # 2. Logic: is_gross_calculation
    if work_log.is_gross_calculation is None:
        work_log.is_gross_calculation = default_is_gross

    # 3. Logic: Calculate Amount
    amount = 0.0
    rate_applied = 0.0

    if work_log.type == models.WorkLogType.particular:
        rate_applied = hourly_rate
        # If duration is provided, use it. 
        if work_log.duration_hours:
            amount = float(work_log.duration_hours) * float(hourly_rate)
            
    elif work_log.type == models.WorkLogType.tutorial:
        rate_applied = daily_rate
        if work_log.start_date and work_log.end_date:
            # Calculate days inclusive
            delta = work_log.end_date - work_log.start_date
            days = delta.days + 1
            amount = days * float(daily_rate)

    # Add extras
    if work_log.has_coordination:
        amount += float(coordination_rate)
    
    if work_log.has_night:
        amount += float(night_rate)

    # Create DB Object
    db_work_log = models.WorkLog(
        **work_log.model_dump(),
        amount=amount,
        rate_applied=rate_applied
    )
    
    db.add(db_work_log)
    db.commit()
    db.refresh(db_work_log)
    return db_work_log

def get_work_logs(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.WorkLog).offset(skip).limit(limit).all()
