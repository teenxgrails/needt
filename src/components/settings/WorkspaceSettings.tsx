"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { Building2, Loader2, LogOut, Plus, UserMinus } from "lucide-react";

import { useWorkspace } from "@/components/providers/WorkspaceProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NeedtPicker } from "@/components/ui/needt-picker";

import { notify } from "@/lib/notifications";

import { SettingRow, SettingsSection } from "./SettingsSection";

type WorkspaceRole = "OWNER" | "EDITOR" | "VIEWER";

interface WorkspaceMember {
  userId: string;
  role: WorkspaceRole;
  user: { name: string | null; email: string | null };
}

interface WorkspaceInvite {
  id: string;
  email: string;
  role: WorkspaceRole;
  expiresAt: string;
  acceptedAt: string | null;
  declinedAt: string | null;
}

const roleOptions = [
  { value: "VIEWER", label: "Viewer" },
  { value: "EDITOR", label: "Editor" },
  { value: "OWNER", label: "Owner" },
];

function errorMessage(error: string | undefined, fallback: string) {
  if (error === "LAST_OWNER") {
    return "Transfer ownership before removing the final Owner.";
  }
  if (error === "SHARED_WORKSPACE_REQUIRES_PAID") {
    return "Needt Pro or Lifetime is required for shared workspaces.";
  }
  return fallback;
}

export function WorkspaceSettings() {
  const {
    activeWorkspace,
    isLoading,
    refreshWorkspaces,
    selectWorkspace,
    workspaces,
  } = useWorkspace();
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invites, setInvites] = useState<WorkspaceInvite[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>("EDITOR");
  const [inviteToken, setInviteToken] = useState("");
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const options = useMemo(
    () =>
      workspaces.map((membership) => ({
        value: membership.workspace.id,
        label: membership.workspace.name,
        description:
          membership.workspace.kind === "PERSONAL"
            ? "Personal workspace"
            : `${membership.role[0]}${membership.role.slice(1).toLowerCase()} · Shared workspace`,
      })),
    [workspaces]
  );

  const activeWorkspaceId = activeWorkspace?.workspace.id;
  const canManageMembers = activeWorkspace?.role === "OWNER";

  const loadSharedWorkspace = useCallback(async () => {
    if (!activeWorkspaceId || activeWorkspace?.workspace.kind !== "SHARED") {
      setMembers([]);
      setInvites([]);
      return;
    }
    try {
      setIsLoadingMembers(true);
      const [membersResponse, invitesResponse] = await Promise.all([
        fetch(`/api/workspaces/${activeWorkspaceId}/members`),
        canManageMembers
          ? fetch(`/api/workspaces/${activeWorkspaceId}/invites`)
          : Promise.resolve(null),
      ]);
      if (!membersResponse.ok)
        throw new Error("Could not load workspace members.");
      const membersData = (await membersResponse.json()) as {
        members?: WorkspaceMember[];
      };
      setMembers(membersData.members ?? []);
      if (invitesResponse) {
        if (!invitesResponse.ok) throw new Error("Could not load invitations.");
        const invitesData = (await invitesResponse.json()) as {
          invites?: WorkspaceInvite[];
        };
        setInvites(invitesData.invites ?? []);
      }
    } catch (error) {
      notify.error(
        error instanceof Error
          ? error.message
          : "Could not load workspace members."
      );
    } finally {
      setIsLoadingMembers(false);
    }
  }, [activeWorkspace?.workspace.kind, activeWorkspaceId, canManageMembers]);

  useEffect(() => {
    void loadSharedWorkspace();
  }, [loadSharedWorkspace]);

  const createWorkspace = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    try {
      setIsCreating(true);
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName }),
      });
      const data = (await response.json()) as {
        workspace?: { id: string };
        error?: string;
      };
      if (!response.ok || !data.workspace) {
        throw new Error(
          errorMessage(data.error, "Could not create workspace.")
        );
      }
      await refreshWorkspaces();
      await selectWorkspace(data.workspace.id);
      setName("");
      notify.success("Workspace created");
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : "Could not create workspace."
      );
    } finally {
      setIsCreating(false);
    }
  };

  const leaveWorkspace = async () => {
    if (!activeWorkspace || activeWorkspace.workspace.kind !== "SHARED") return;
    try {
      setIsLeaving(true);
      const response = await fetch(
        `/api/workspaces/${activeWorkspace.workspace.id}/leave`,
        { method: "POST" }
      );
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(errorMessage(data.error, "Could not leave workspace."));
      }
      await refreshWorkspaces();
      notify.success("You left the workspace");
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : "Could not leave workspace."
      );
    } finally {
      setIsLeaving(false);
    }
  };

  const inviteMember = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeWorkspaceId || !inviteEmail.trim()) return;
    try {
      setPendingAction("invite");
      const response = await fetch(
        `/api/workspaces/${activeWorkspaceId}/invites`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
        }
      );
      const data = (await response.json()) as {
        error?: string;
        invite?: { token?: string };
      };
      if (!response.ok) {
        throw new Error(errorMessage(data.error, "Could not invite member."));
      }
      setInviteEmail("");
      await loadSharedWorkspace();
      if (data.invite?.token && navigator.clipboard) {
        await navigator.clipboard.writeText(data.invite.token);
        notify.success("Invitation created; token copied to clipboard");
      } else {
        notify.success("Invitation created");
      }
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : "Could not invite member."
      );
    } finally {
      setPendingAction(null);
    }
  };

  const respondToInvite = async (action: "accept" | "decline") => {
    const token = inviteToken.trim();
    if (!token) return;
    try {
      setPendingAction(action);
      const response = await fetch(`/api/workspace-invites/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = (response.status === 204 ? {} : await response.json()) as {
        error?: string;
        membership?: { workspaceId: string };
      };
      if (!response.ok) {
        throw new Error(
          errorMessage(data.error, `Could not ${action} invitation.`)
        );
      }
      setInviteToken("");
      await refreshWorkspaces();
      if (action === "accept" && data.membership?.workspaceId) {
        await selectWorkspace(data.membership.workspaceId);
      }
      notify.success(
        action === "accept"
          ? "Workspace invitation accepted"
          : "Workspace invitation declined"
      );
    } catch (error) {
      notify.error(
        error instanceof Error
          ? error.message
          : `Could not ${action} invitation.`
      );
    } finally {
      setPendingAction(null);
    }
  };

  const updateMemberRole = async (
    memberUserId: string,
    role: WorkspaceRole
  ) => {
    if (!activeWorkspaceId) return;
    try {
      setPendingAction(`role:${memberUserId}`);
      const response = await fetch(
        `/api/workspaces/${activeWorkspaceId}/members/${memberUserId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role }),
        }
      );
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(
          errorMessage(data.error, "Could not update member role.")
        );
      }
      await Promise.all([loadSharedWorkspace(), refreshWorkspaces()]);
      notify.success("Member role updated");
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : "Could not update member role."
      );
    } finally {
      setPendingAction(null);
    }
  };

  const removeMember = async (memberUserId: string) => {
    if (!activeWorkspaceId) return;
    try {
      setPendingAction(`remove:${memberUserId}`);
      const response = await fetch(
        `/api/workspaces/${activeWorkspaceId}/members/${memberUserId}`,
        { method: "DELETE" }
      );
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(errorMessage(data.error, "Could not remove member."));
      }
      await loadSharedWorkspace();
      notify.success("Member removed");
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : "Could not remove member."
      );
    } finally {
      setPendingAction(null);
    }
  };

  const revokeInvite = async (inviteId: string) => {
    if (!activeWorkspaceId) return;
    try {
      setPendingAction(`invite:${inviteId}`);
      const response = await fetch(
        `/api/workspaces/${activeWorkspaceId}/invites/${inviteId}`,
        { method: "DELETE" }
      );
      if (!response.ok) throw new Error("Could not revoke invitation.");
      await loadSharedWorkspace();
      notify.success("Invitation revoked");
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : "Could not revoke invitation."
      );
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <SettingsSection
      title="Workspace"
      description="Choose where shared tasks, projects, Pages and Boards are shown."
      showDescription
    >
      <SettingRow label="Current workspace">
        <NeedtPicker
          ariaLabel="Current workspace"
          disabled={isLoading || options.length === 0}
          onValueChange={(workspaceId) => void selectWorkspace(workspaceId)}
          options={options}
          triggerVariant="field"
          value={activeWorkspace?.workspace.id}
        />
      </SettingRow>
      <SettingRow label="Create shared workspace">
        <form className="flex gap-2" onSubmit={createWorkspace}>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            placeholder="Workspace name"
            aria-label="New workspace name"
          />
          <Button type="submit" disabled={isCreating || !name.trim()}>
            {isCreating ? <Loader2 className="animate-spin" /> : <Plus />}
            Create
          </Button>
        </form>
      </SettingRow>
      <SettingRow label="Workspace invitation">
        <div className="space-y-2">
          <Input
            value={inviteToken}
            onChange={(event) => setInviteToken(event.target.value)}
            placeholder="Paste invitation token"
            aria-label="Workspace invitation token"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={pendingAction !== null || !inviteToken.trim()}
              onClick={() => void respondToInvite("accept")}
            >
              {pendingAction === "accept" && (
                <Loader2 className="animate-spin" />
              )}
              Accept invitation
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pendingAction !== null || !inviteToken.trim()}
              onClick={() => void respondToInvite("decline")}
            >
              {pendingAction === "decline" && (
                <Loader2 className="animate-spin" />
              )}
              Decline
            </Button>
          </div>
        </div>
      </SettingRow>
      {activeWorkspace?.workspace.kind === "SHARED" && (
        <>
          <SettingRow label="Membership">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
                <Building2 className="h-4 w-4" />
                {activeWorkspace.role[0]}
                {activeWorkspace.role.slice(1).toLowerCase()}
              </span>
              <Button
                type="button"
                variant="outline"
                onClick={leaveWorkspace}
                disabled={isLeaving}
              >
                {isLeaving ? <Loader2 className="animate-spin" /> : <LogOut />}
                Leave workspace
              </Button>
            </div>
          </SettingRow>
          {canManageMembers && (
            <SettingRow label="Invite member">
              <form
                className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_150px_auto]"
                onSubmit={inviteMember}
              >
                <Input
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  type="email"
                  maxLength={320}
                  placeholder="member@example.com"
                  aria-label="Member email"
                />
                <NeedtPicker
                  ariaLabel="Invitation role"
                  options={roleOptions}
                  value={inviteRole}
                  onValueChange={(role) => setInviteRole(role as WorkspaceRole)}
                  triggerVariant="field"
                />
                <Button
                  type="submit"
                  disabled={pendingAction === "invite" || !inviteEmail.trim()}
                >
                  {pendingAction === "invite" ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Plus />
                  )}
                  Invite
                </Button>
              </form>
            </SettingRow>
          )}
          <SettingRow label="Members">
            {isLoadingMembers ? (
              <span className="text-sm text-[var(--text-secondary)]">
                Loading members…
              </span>
            ) : (
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.userId}
                    className="flex flex-wrap items-center gap-2 rounded-[var(--control-radius)] border border-[var(--border-subtle)] px-2 py-2"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {member.user.name || member.user.email || member.userId}
                    </span>
                    {canManageMembers ? (
                      <>
                        <NeedtPicker
                          ariaLabel={`Role for ${member.user.email || member.userId}`}
                          className="min-w-[120px]"
                          disabled={pendingAction === `role:${member.userId}`}
                          onValueChange={(role) =>
                            void updateMemberRole(
                              member.userId,
                              role as WorkspaceRole
                            )
                          }
                          options={roleOptions}
                          triggerVariant="field"
                          value={member.role}
                        />
                        <Button
                          aria-label={`Remove ${member.user.email || member.userId}`}
                          disabled={pendingAction === `remove:${member.userId}`}
                          onClick={() => void removeMember(member.userId)}
                          size="icon"
                          type="button"
                          variant="outline"
                        >
                          {pendingAction === `remove:${member.userId}` ? (
                            <Loader2 className="animate-spin" />
                          ) : (
                            <UserMinus />
                          )}
                        </Button>
                      </>
                    ) : (
                      <span className="text-sm text-[var(--text-secondary)]">
                        {member.role[0]}
                        {member.role.slice(1).toLowerCase()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SettingRow>
          {canManageMembers && invites.length > 0 && (
            <SettingRow label="Pending invitations">
              <div className="space-y-2">
                {invites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex flex-wrap items-center gap-2 rounded-[var(--control-radius)] border border-[var(--border-subtle)] px-2 py-2"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {invite.email}
                    </span>
                    <span className="text-sm text-[var(--text-secondary)]">
                      {invite.role[0]}
                      {invite.role.slice(1).toLowerCase()}
                    </span>
                    <Button
                      disabled={pendingAction === `invite:${invite.id}`}
                      onClick={() => void revokeInvite(invite.id)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Revoke
                    </Button>
                  </div>
                ))}
              </div>
            </SettingRow>
          )}
        </>
      )}
    </SettingsSection>
  );
}
