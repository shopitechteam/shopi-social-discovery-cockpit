"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@apollo/client/react";
import { toast } from "sonner";
import {
  ADMIN_UPDATE_USER_ROLES,
  ADMIN_SET_USER_VERIFIED,
  ADMIN_SET_USER_SOCIAL_PROOF,
  ADMIN_SET_USER_SUSPENDED,
  ADMIN_CREATE_ACCOUNT,
  ADMIN_DELETE_USER,
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

// ── Verify / unverify ────────────────────────────────────────────────────────

export function VerifyDialog({
  user,
  open,
  onOpenChange,
}: {
  user: AdminUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [setVerified, { loading }] = useMutation(ADMIN_SET_USER_VERIFIED, {
    refetchQueries: REFETCH,
  });

  if (!user) return null;
  const verifying = !user.isVerified;
  const userId = user.id;
  const userLabel = displayName(user);

  async function handleConfirm() {
    try {
      await setVerified({
        variables: {
          userId,
          verified: verifying,
        },
      });
      toast.success(verifying ? "User verified" : "Verification removed");
      onOpenChange(false);
    } catch (err) {
      toast.error(errMessage(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {verifying ? "Verify" : "Remove verification from"} {userLabel}
          </DialogTitle>
          <DialogDescription>
            {verifying
              ? "This will mark the account as trusted and show the verified badge anywhere the user state is rendered."
              : "This removes the trust badge from the user account."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant={verifying ? "success" : "outline"}
            onClick={handleConfirm}
            loading={loading}
          >
            {verifying ? "Verify user" : "Remove badge"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Social proof (homepage featured sellers) ─────────────────────────────────

const HEADLINE_MAX = 80;

/**
 * Feature a seller in the homepage "Selling on Shopi right now" section. The
 * public site reads every featured seller (socialProofSellers) in sort order,
 * so this is the whole control surface: no deploy needed to add or remove one.
 * Listing counts and views on the homepage are live — only the headline is
 * written here.
 */
export function SocialProofDialog({
  user,
  open,
  onOpenChange,
}: {
  user: AdminUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* Mounted only while open and keyed by user, so the form starts from
            the seller's current placement every time without copying props
            into state inside an effect. */}
        {open && <SocialProofForm key={user.id} user={user} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function SocialProofForm({ user, onDone }: { user: AdminUser; onDone: () => void }) {
  const [featured, setFeatured] = useState(Boolean(user.socialProof?.featured));
  const [headline, setHeadline] = useState(user.socialProof?.headline ?? "");
  const [sortOrder, setSortOrder] = useState(String(user.socialProof?.sortOrder ?? 0));
  const [save, { loading }] = useMutation(ADMIN_SET_USER_SOCIAL_PROOF, {
    refetchQueries: REFETCH,
  });

  const blockedReason = user.isSuspended
    ? "Suspended accounts can’t be featured."
    : !user.username
      ? "This account has no @username yet, so there’s no public profile to link to."
      : null;
  const canFeature = !blockedReason;
  const order = Number(sortOrder);
  const orderValid =
    sortOrder.trim() !== "" && Number.isInteger(order) && order >= 0 && order <= 999;

  async function handleSave() {
    if (!orderValid) return;
    try {
      await save({
        variables: {
          userId: user.id,
          featured: featured && canFeature,
          headline: headline.trim(),
          sortOrder: order,
        },
      });
      toast.success(
        featured && canFeature
          ? `${displayName(user)} is featured on the homepage`
          : `${displayName(user)} removed from the homepage`,
      );
      onDone();
    } catch (err) {
      toast.error(errMessage(err));
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Social proof: {displayName(user)}</DialogTitle>
        <DialogDescription>
          Featured sellers appear on the homepage with their name, avatar, location, live listing
          count and newest listings. Sellers with no live listings are hidden automatically.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <label
          className={`flex items-center justify-between gap-4 rounded-lg border p-3 transition-colors ${
            featured && canFeature ? "border-primary/50 bg-primary-soft" : "border-border"
          } ${canFeature ? "cursor-pointer hover:bg-subtle" : "cursor-not-allowed opacity-70"}`}
        >
          <div>
            <p className="text-sm font-semibold text-foreground">Feature on homepage</p>
            <p className="text-xs text-muted">{blockedReason ?? `Links to /@${user.username}`}</p>
          </div>
          <input
            type="checkbox"
            className="size-4 accent-[#d81470]"
            checked={featured && canFeature}
            disabled={!canFeature}
            onChange={(e) => setFeatured(e.target.checked)}
          />
        </label>

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <Label htmlFor="social-proof-headline">Headline (optional)</Label>
            <span className="text-xs text-muted tabular-nums">
              {headline.trim().length}/{HEADLINE_MAX}
            </span>
          </div>
          <Input
            id="social-proof-headline"
            value={headline}
            maxLength={HEADLINE_MAX}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="e.g. Computer & phone accessories"
          />
          <p className="text-xs text-muted">
            What they sell, in a few words. Shown publicly, so no phone numbers.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="social-proof-order">Sort order</Label>
          <Input
            id="social-proof-order"
            type="number"
            inputMode="numeric"
            min={0}
            max={999}
            step={1}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="w-28"
          />
          <p className={`text-xs ${orderValid ? "text-muted" : "text-error"}`}>
            {orderValid ? "Lower numbers show first." : "Use a whole number from 0 to 999."}
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button onClick={handleSave} loading={loading} disabled={!orderValid}>
          Save
        </Button>
      </DialogFooter>
    </>
  );
}

// ── Permanent delete ─────────────────────────────────────────────────────────

/**
 * Hard-delete with cascade. Typing the email is the guard — there is no undo and
 * the API wipes posts, comments, messages, follows, media records and more.
 */
export function DeleteUserDialog({
  user,
  open,
  onOpenChange,
}: {
  user: AdminUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [confirmation, setConfirmation] = useState("");
  const [deleteUser, { loading }] = useMutation(ADMIN_DELETE_USER, {
    refetchQueries: REFETCH,
  });

  useEffect(() => {
    if (!open) setConfirmation("");
  }, [open]);

  if (!user) return null;

  const expected = user.email ?? user.username ?? user.id;
  const confirmed = confirmation.trim().toLowerCase() === expected.toLowerCase();

  async function handleDelete() {
    if (!user || !confirmed) return;
    try {
      const result = await deleteUser({ variables: { userId: user.id } });
      const summary = result.data?.adminDeleteUser;
      toast.success(
        summary
          ? `Deleted ${displayName(user)} — ${summary.deletedPosts} posts, ${summary.deletedComments} comments removed`
          : `Deleted ${displayName(user)}`,
      );
      onOpenChange(false);
    } catch (err) {
      toast.error(errMessage(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {displayName(user)}</DialogTitle>
          <DialogDescription>
            Permanently removes the account and everything linked to it — posts, comments, likes,
            messages, follows, communities they created, drafts, media and notifications. This
            cannot be undone. Suspend instead if you only need to block access.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="delete-confirm">
            Type <span className="font-semibold text-foreground">{expected}</span> to confirm
          </Label>
          <Input
            id="delete-confirm"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            autoComplete="off"
            placeholder={expected}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            loading={loading}
            disabled={!confirmed}
          >
            Delete permanently
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
