from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import LifeEvent
from ..personal_models import PersonalUser
from ..auth import get_current_personal_user

router = APIRouter(prefix="/personal/life-events", tags=["personal-life-events"])


class LifeEventIn(BaseModel):
    event_type: str
    event_date: date
    notes: Optional[str] = None


class LifeEventUpdate(BaseModel):
    event_type: Optional[str] = None
    event_date: Optional[date] = None
    notes: Optional[str] = None


def _event_out(e: LifeEvent) -> dict:
    return {
        "id": e.id,
        "event_type": e.event_type,
        "event_date": e.event_date,
        "notes": e.notes,
    }


@router.get("")
def get_life_events(
    current_user: PersonalUser = Depends(get_current_personal_user),
    db: Session = Depends(get_db),
):
    events = (
        db.query(LifeEvent)
        .filter(LifeEvent.personal_user_id == current_user.id)
        .order_by(LifeEvent.event_date.desc())
        .all()
    )
    return [_event_out(e) for e in events]


@router.post("", status_code=201)
def create_life_event(
    payload: LifeEventIn,
    current_user: PersonalUser = Depends(get_current_personal_user),
    db: Session = Depends(get_db),
):
    event = LifeEvent(
        personal_user_id=current_user.id,
        event_type=payload.event_type,
        event_date=payload.event_date,
        notes=payload.notes,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return _event_out(event)


@router.put("/{event_id}")
def update_life_event(
    event_id: int,
    payload: LifeEventUpdate,
    current_user: PersonalUser = Depends(get_current_personal_user),
    db: Session = Depends(get_db),
):
    event = db.query(LifeEvent).filter(
        LifeEvent.id == event_id, LifeEvent.personal_user_id == current_user.id
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(event, field, value)
    db.commit()
    db.refresh(event)
    return _event_out(event)


@router.delete("/{event_id}")
def delete_life_event(
    event_id: int,
    current_user: PersonalUser = Depends(get_current_personal_user),
    db: Session = Depends(get_db),
):
    from fastapi.responses import Response
    event = db.query(LifeEvent).filter(
        LifeEvent.id == event_id, LifeEvent.personal_user_id == current_user.id
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    db.delete(event)
    db.commit()
    return Response(status_code=204)
