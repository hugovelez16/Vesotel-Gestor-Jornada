from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from . import crud, models, schemas
from .database import SessionLocal, engine, get_db

# Create tables if they don't exist (optional, but good for dev)
# models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Vesotel Gestor Jornada API")

@app.post("/work-logs/", response_model=schemas.WorkLogResponse)
def create_work_log(work_log: schemas.WorkLogCreate, db: Session = Depends(get_db)):
    return crud.create_work_log(db=db, work_log=work_log)

@app.get("/work-logs/", response_model=List[schemas.WorkLogResponse])
def read_work_logs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    work_logs = crud.get_work_logs(db, skip=skip, limit=limit)
    return work_logs

@app.get("/")
def read_root():
    return {"message": "Welcome to Vesotel Gestor Jornada API"}
