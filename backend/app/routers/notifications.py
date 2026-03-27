"""Notifications Router — FEAT-1004 In-App Notifications."""
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import List

from ..database import SessionLocal
from .. import models, schemas


router = APIRouter(prefix="/notifications", tags=["notifications"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/advisor/me", response_model=schemas.NotificationListOut)
def get_advisor_notifications(
    db: Session = Depends(get_db),
    x_advisor_id: int = Header(..., alias="X-Advisor-Id"),
    limit: int = 20,
):
    """
    Get advisor's notifications (unread first, newest first).

    Notifications trigger when:
    1. Advisor submits trade → client approves/rejects → advisor notified
    """
    notifications = db.query(models.Notification).filter(
        models.Notification.advisor_id == x_advisor_id
    ).order_by(
        models.Notification.read.asc(),  # unread first
        models.Notification.created_at.desc()  # newest first
    ).limit(limit).all()

    unread_count = db.query(models.Notification).filter(
        models.Notification.advisor_id == x_advisor_id,
        models.Notification.read == False
    ).count()

    return {
        "notifications": notifications,
        "unread_count": unread_count
    }


@router.get("/personal/me", response_model=schemas.NotificationListOut)
def get_personal_notifications(
    db: Session = Depends(get_db),
    x_personal_user_id: int = Header(..., alias="X-Personal-User-Id"),
    limit: int = 20,
):
    """
    Get client's notifications (unread first, newest first).

    Notifications trigger when:
    1. Advisor submits trade → client notified
    """
    notifications = db.query(models.Notification).filter(
        models.Notification.personal_user_id == x_personal_user_id
    ).order_by(
        models.Notification.read.asc(),  # unread first
        models.Notification.created_at.desc()  # newest first
    ).limit(limit).all()

    unread_count = db.query(models.Notification).filter(
        models.Notification.personal_user_id == x_personal_user_id,
        models.Notification.read == False
    ).count()

    return {
        "notifications": notifications,
        "unread_count": unread_count
    }


@router.put("/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    x_advisor_id: int = Header(None, alias="X-Advisor-Id"),
    x_personal_user_id: int = Header(None, alias="X-Personal-User-Id"),
):
    """
    Mark notification as read (for both advisor and personal users).
    """
    notification = db.query(models.Notification).filter(
        models.Notification.id == notification_id
    ).first()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    # Verify ownership
    if x_advisor_id and notification.advisor_id != x_advisor_id:
        raise HTTPException(status_code=403, detail="Access denied")
    if x_personal_user_id and notification.personal_user_id != x_personal_user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    notification.read = True
    db.commit()

    return {"status": "ok"}


@router.delete("/{notification_id}")
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    x_advisor_id: int = Header(None, alias="X-Advisor-Id"),
    x_personal_user_id: int = Header(None, alias="X-Personal-User-Id"),
):
    """
    Delete notification (for both advisor and personal users).
    """
    notification = db.query(models.Notification).filter(
        models.Notification.id == notification_id
    ).first()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    # Verify ownership
    if x_advisor_id and notification.advisor_id != x_advisor_id:
        raise HTTPException(status_code=403, detail="Access denied")
    if x_personal_user_id and notification.personal_user_id != x_personal_user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    db.delete(notification)
    db.commit()

    return {"status": "ok"}


# ─── Internal Helper (not exposed via API) ──────────────────────────────────

def create_notification(
    db: Session,
    advisor_id: int = None,
    personal_user_id: int = None,
    notification_type: str = None,
    trade_id: int = None,
    message: str = None,
):
    """
    Internal helper to create a notification.
    Used by trades router when:
    1. Advisor submits trade → create notification for client
    2. Client approves/rejects → create notification for advisor
    """
    notification = models.Notification(
        advisor_id=advisor_id,
        personal_user_id=personal_user_id,
        notification_type=notification_type,
        trade_id=trade_id,
        message=message,
        read=False,
    )
    db.add(notification)
    db.flush()  # Flush so ID is available, but don't commit yet (caller will)
    return notification
