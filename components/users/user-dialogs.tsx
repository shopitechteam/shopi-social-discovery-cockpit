"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@apollo/client/react";
import { toast } from "sonner";
import {
  ADMIN_UPDATE_USER_ROLES,
  ADMIN_SET_USER_SUSPENDED,
  ADMIN_CREATE_ACCOUNT,
} from "@/graphql/operations";
import { UserRole, type AdminUser } from "@/graphql/types";
import { displayName } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const REFETCH = ["AdminUsers", "AdminDashboardStats"];

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong";
}

function resolvedRoles(user: Pick<AdminUser, "roles" | "role"> | null): UserRole[] {
  if (!user) return [];
  const set = new Set<UserRole>(user.roles ?? []);
  if (user.role) set.add(user.role);
  return [UserRole.USER, UserRole.CREATOR, UserRole.ADMIN].filter((role) => set.has(role));
}

// ── Roles ────────────────────────────────────────────────────────────────────

export function RolesDialog({
  user,
  open,
  onOpenChange,
}: {
  user: AdminUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [updateRoles, { loading }] = useMutation(ADMIN_UPDATE_USER_ROLES, {
    refetchQueries: REFETCH,
  });

  useEffect(() => {
    if (!open || !user) return;
    setRoles(resolvedRoles(user));
  }, [open, user]);

  function toggleRole(role: UserRole) {
    setRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  }

  async function handleSave() {
    if (!user) return;
    try {
      await updateRoles({ variables: { userId: user.id, roles } });
      toast.success("Roles updated");
      onOpenChange(false);
    } catch (err) {
      toast.error(errMessage(err));
    }
  }

  if (!user) return null;

  const OPTIONS: { role: UserRole; label: string; hint: string; locked?: boolean }[] = [
    { role: UserRole.USER, label: "User", hint: "Base role — always kept", locked: true },
    { role: UserRole.CREATOR, label: "Creator", hint: "Can be featured as a seller" },
    { role: UserRole.ADMIN, label: "Admin", hint: "Full access to this dashboard" },
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setRoles([]);
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Roles for {displayName(user)}</DialogTitle>
          <DialogDescription>
            Changes apply on the user’s next token refresh (within minutes).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {OPTIONS.map(({ role, label, hint, locked }) => {
            const checked = locked || roles.includes(role);
            return (
              <label
                key={role}
                className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors ${
                  checked ? "border-primary/50 bg-primary-soft" : "border-border hover:bg-subtle"
                } ${locked ? "cursor-not-allowed opacity-70" : ""}`}
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">{label}</p>
                  <p className="text-xs text-muted">{hint}</p>
                </div>
                <input
                  type="checkbox"
                  className="size-4 accent-[#d81470]"
                  checked={checked}
                  disabled={locked}
                  onChange={() => toggleRole(role)}
                />
              </label>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={loading}>
            Save roles
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Suspend / reinstate ──────────────────────────────────────────────────────

export function SuspendDialog({
  user,
  open,
  onOpenChange,
}: {
  user: AdminUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [reason, setReason] = useState("");
  const [setSuspended, { loading }] = useMutation(ADMIN_SET_USER_SUSPENDED, {
    refetchQueries: REFETCH,
  });

  if (!user) return null;
  const suspending = !user.isSuspended;

  async function handleConfirm() {
    if (!user) return;
    try {
      await setSuspended({
        variables: {
          userId: user.id,
          suspended: suspending,
          reason: suspending ? reason.trim() || null : null,
        },
      });
      toast.success(suspending ? "Account suspended" : "Account reinstated");
      onOpenChange(false);
      setReason("");
    } catch (err) {
      toast.error(errMessage(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {suspending ? "Suspend" : "Reinstate"} {displayName(user)}
          </DialogTitle>
          <DialogDescription>
            {suspending
              ? "Blocks sign-in and revokes all sessions. Their content stays as-is."
              : "Restores the account — they can sign in again immediately."}
          </DialogDescription>
        </DialogHeader>
        {suspending && (
          <div className="space-y-1.5">
            <Label htmlFor="suspend-reason">Reason (optional)</Label>
            <Textarea
              id="suspend-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Shown to the user if they try to sign in"
              rows={2}
            />
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant={suspending ? "destructive" : "success"}
            onClick={handleConfirm}
            loading={loading}
          >
            {suspending ? "Suspend account" : "Reinstate account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Create staff account ─────────────────────────────────────────────────────

export function CreateStaffDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [createAccount, { loading }] = useMutation(ADMIN_CREATE_ACCOUNT, {
    refetchQueries: REFETCH,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 12) {
      toast.error("Admin passwords must be at least 12 characters");
      return;
    }
    try {
      await createAccount({
        variables: {
          input: {
            email,
            password,
            roles: [UserRole.ADMIN],
            firstName: firstName || undefined,
            lastName: lastName || undefined,
          },
        },
      });
      toast.success(`Admin account created for ${email}`);
      onOpenChange(false);
      setEmail("");
      setPassword("");
      setFirstName("");
      setLastName("");
    } catch (err) {
      toast.error(errMessage(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New staff account</DialogTitle>
          <DialogDescription>
            Creates a password-only admin account. Share the credentials securely — they can change
            the password after signing in.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="staff-first">First name</Label>
              <Input
                id="staff-first"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="staff-last">Last name</Label>
              <Input id="staff-last" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="staff-email">Email</Label>
            <Input
              id="staff-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="staff-password">Password (min 12 characters)</Label>
            <Input
              id="staff-password"
              type="password"
              required
              minLength={12}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Create account
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
