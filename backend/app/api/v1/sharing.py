from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.models import (
    User, Project, ProjectMember, ProjectRole, Invitation, InvitationStatus,
    Notification, ActivityEvent
)
from app.schemas.schemas import (
    InvitationCreate, InvitationOut, MemberUpdate, ProjectMemberOut, UserOut
)
from app.core.deps import get_current_user, get_user_project_role, verify_project_permission
import secrets
from typing import List

router = APIRouter(tags=["Project Sharing & Invitations"])

@router.post("/projects/{project_id}/invitations", response_model=InvitationOut, status_code=status.HTTP_201_CREATED)
async def invite_member(
    project_id: str,
    data: InvitationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    role = await get_user_project_role(project_id, current_user, db)
    if not verify_project_permission(role, ProjectRole.OWNER.value):
        raise HTTPException(status_code=403, detail="Only project owners can invite members")

    # Check if user with that email exists
    u_res = await db.execute(select(User).where(User.email == data.invitee_email))
    invitee_user = u_res.scalar_one_or_none()

    if invitee_user and invitee_user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot invite yourself")

    # Check if already a member
    if invitee_user:
        mem_res = await db.execute(
            select(ProjectMember).where(
                ProjectMember.project_id == project_id,
                ProjectMember.user_id == invitee_user.id
            )
        )
        if mem_res.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="User is already a member of this project")

    token = secrets.token_urlsafe(32)
    invitation = Invitation(
        project_id=project_id,
        inviter_id=current_user.id,
        invitee_email=data.invitee_email,
        role=data.role,
        token=token,
        status=InvitationStatus.PENDING.value
    )
    db.add(invitation)

    # If invitee exists, generate an in-app notification
    if invitee_user:
        notif = Notification(
            user_id=invitee_user.id,
            title=f"Invitation to join '{project.name}'",
            message=f"{current_user.username} invited you to collaborate as {data.role}.",
            type="invite",
            link=f"/invite/{token}"
        )
        db.add(notif)

    activity = ActivityEvent(
        project_id=project_id,
        user_id=current_user.id,
        action="member_invited",
        details=f"Invited {data.invitee_email} as {data.role}"
    )
    db.add(activity)

    await db.commit()
    await db.refresh(invitation)
    return InvitationOut.model_validate(invitation)

@router.get("/projects/{project_id}/members", response_model=List[ProjectMemberOut])
async def list_members(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    role = await get_user_project_role(project_id, current_user, db)
    if not role:
        raise HTTPException(status_code=403, detail="Access denied")

    res = await db.execute(
        select(ProjectMember).where(ProjectMember.project_id == project_id)
    )
    members = res.scalars().all()

    output = []
    for m in members:
        user_obj = await db.get(User, m.user_id)
        output.append(
            ProjectMemberOut(
                id=m.id,
                user_id=m.user_id,
                role=m.role,
                joined_at=m.joined_at,
                user=UserOut.model_validate(user_obj) if user_obj else None
            )
        )
    return output

@router.patch("/projects/{project_id}/members/{member_id}", response_model=ProjectMemberOut)
async def update_member_role(
    project_id: str,
    member_id: str,
    data: MemberUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    role = await get_user_project_role(project_id, current_user, db)
    if not verify_project_permission(role, ProjectRole.OWNER.value):
        raise HTTPException(status_code=403, detail="Only owners can change member roles")

    member = await db.get(ProjectMember, member_id)
    if not member or member.project_id != project_id:
        raise HTTPException(status_code=404, detail="Member record not found")

    member.role = data.role
    await db.commit()
    await db.refresh(member)

    user_obj = await db.get(User, member.user_id)
    return ProjectMemberOut(
        id=member.id,
        user_id=member.user_id,
        role=member.role,
        joined_at=member.joined_at,
        user=UserOut.model_validate(user_obj) if user_obj else None
    )

@router.delete("/projects/{project_id}/members/{member_id}")
async def remove_member(
    project_id: str,
    member_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    role = await get_user_project_role(project_id, current_user, db)
    member = await db.get(ProjectMember, member_id)
    if not member or member.project_id != project_id:
        raise HTTPException(status_code=404, detail="Member record not found")

    # Allowed if current user is owner OR if member is removing themselves
    is_owner = verify_project_permission(role, ProjectRole.OWNER.value)
    is_self = member.user_id == current_user.id
    if not (is_owner or is_self):
        raise HTTPException(status_code=403, detail="Permission denied")

    await db.delete(member)
    await db.commit()
    return {"message": "Member removed"}

@router.post("/invitations/{token}/accept")
async def accept_invitation(
    token: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(Invitation).where(Invitation.token == token))
    invitation = res.scalar_one_or_none()
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found or expired")

    if invitation.status != InvitationStatus.PENDING.value:
        raise HTTPException(status_code=400, detail=f"Invitation already {invitation.status}")

    # Check if user already member
    mem_res = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == invitation.project_id,
            ProjectMember.user_id == current_user.id
        )
    )
    if not mem_res.scalar_one_or_none():
        new_member = ProjectMember(
            project_id=invitation.project_id,
            user_id=current_user.id,
            role=invitation.role
        )
        db.add(new_member)

    invitation.status = InvitationStatus.ACCEPTED.value

    activity = ActivityEvent(
        project_id=invitation.project_id,
        user_id=current_user.id,
        action="member_joined",
        details=f"{current_user.username} accepted invitation and joined as {invitation.role}."
    )
    db.add(activity)

    await db.commit()
    return {"message": "Invitation accepted successfully", "projectId": invitation.project_id}

@router.post("/invitations/{token}/decline")
async def decline_invitation(
    token: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(Invitation).where(Invitation.token == token))
    invitation = res.scalar_one_or_none()
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")

    invitation.status = InvitationStatus.DECLINED.value
    await db.commit()
    return {"message": "Invitation declined"}

@router.get("/invitations/pending", response_model=List[InvitationOut])
async def list_pending_invitations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(Invitation).where(
            Invitation.invitee_email == current_user.email,
            Invitation.status == InvitationStatus.PENDING.value
        )
    )
    invites = res.scalars().all()
    return [InvitationOut.model_validate(inv) for inv in invites]
