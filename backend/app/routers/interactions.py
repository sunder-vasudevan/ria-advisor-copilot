from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models import Client, ClientInteraction
from ..schemas import InteractionCreate, InteractionOut

router = APIRouter(prefix="/clients", tags=["interactions"])


@router.get("/{client_id}/interactions", response_model=List[InteractionOut])
def list_interactions(client_id: int, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client.interactions


@router.post("/{client_id}/interactions", response_model=InteractionOut, status_code=201)
def create_interaction(client_id: int, payload: InteractionCreate, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    interaction = ClientInteraction(
        client_id=client_id,
        interaction_type=payload.interaction_type,
        interaction_date=payload.interaction_date,
        duration_minutes=payload.duration_minutes,
        subject=payload.subject,
        notes=payload.notes,
        outcome=payload.outcome,
        next_action=payload.next_action,
        next_action_due=payload.next_action_due,
    )
    db.add(interaction)
    db.commit()
    db.refresh(interaction)
    return interaction


@router.delete("/{client_id}/interactions/{interaction_id}")
def delete_interaction(client_id: int, interaction_id: int, db: Session = Depends(get_db)):
    from fastapi.responses import Response
    interaction = db.query(ClientInteraction).filter(
        ClientInteraction.id == interaction_id,
        ClientInteraction.client_id == client_id,
    ).first()
    if not interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")
    db.delete(interaction)
    db.commit()
    return Response(status_code=204)
