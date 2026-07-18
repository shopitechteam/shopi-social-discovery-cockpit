"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@apollo/client/react";
import { Search, UserPlus, ShieldCheck, UserCog, Ban, Undo2, BadgeCheck } from "lucide-react";
import { ADMIN_USERS } from "@/graphql/operations";
import { UserRole, type AdminUser } from "@/graphql/types";
import { formatDate, formatRelative, displayName } from "@/lib/format";
import { useAuthStore } from "@/stores/auth";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination } from "@/components/shared/pagination";
import {
  RolesDialog,
  SuspendDialog,
  VerifyDialog,
  CreateStaffDialog,
} from "@/components/users/user-dialogs";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 350;

function providerList(user: AdminUser): string {
  const providers: string[] = [];
  if (user.authProviders?.local) providers.push("password");
  if (user.authProviders?.google) providers.push("google");
  if (user.authProviders?.facebook) providers.push("facebook");
  if (user.authProviders?.apple) providers.push("apple");
  if (user.authProviders?.tiktok) providers.push("tiktok");
  return providers.join(", ") || "—";
}

function resolvedRoles(user: Pick<AdminUser, "roles" | "role">): UserRole[] {
  const set = new Set<UserRole>(user.roles ?? []);
  if (user.role) set.add(user.role);
  return [UserRole.USER, UserRole.CREATOR, UserRole.ADMIN].filter((role) => set.has(role));
}

export default function UsersPage() {
  const searchParams = useSearchParams();
  const presetSearch = searchParams.get("search") ?? "";
  const me = useAuthStore((s) => s.user);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(presetSearch);
  const [submittedSearch, setSubmittedSearch] = useState(presetSearch);
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [suspendedFilter, setSuspendedFilter] = useState<string>("");

  const [rolesUser, setRolesUser] = useState<AdminUser | null>(null);
  const [rolesOpen, setRolesOpen] = useState(false);
  const [verifyUser, setVerifyUser] = useState<AdminUser | null>(null);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [suspendUser, setSuspendUser] = useState<AdminUser | null>(null);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, loading } = useQuery(ADMIN_USERS, {
    variables: {
      page,
      limit: PAGE_SIZE,
      search: submittedSearch || null,
      role: (roleFilter as UserRole) || null,
      suspended: suspendedFilter === "" ? null : suspendedFilter === "true",
    },
  });

  const users = data?.adminUsers.data ?? [];
  const meta = data?.adminUsers.meta;
  const rolesUserFresh = useMemo(
    () => (rolesUser ? (users.find((user) => user.id === rolesUser.id) ?? rolesUser) : null),
    [rolesUser, users],
  );
  const suspendUserFresh = useMemo(
    () =>
      suspendUser ? (users.find((user) => user.id === suspendUser.id) ?? suspendUser) : null,
    [suspendUser, users],
  );
  const verifyUserFresh = useMemo(
    () => (verifyUser ? (users.find((user) => user.id === verifyUser.id) ?? verifyUser) : null),
    [verifyUser, users],
  );

  useEffect(() => {
    const nextSearch = search.trim();
    const handle = window.setTimeout(() => {
      setSubmittedSearch((current) => {
        if (current === nextSearch) return current;
        setPage(1);
        return nextSearch;
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(handle);
  }, [search]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search email, username, name…"
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="w-36"
            >
              <option value="">All roles</option>
              <option value={UserRole.ADMIN}>Admins</option>
              <option value={UserRole.CREATOR}>Creators</option>
              <option value={UserRole.USER}>Users</option>
            </Select>
            <Select
              value={suspendedFilter}
              onChange={(e) => {
                setSuspendedFilter(e.target.value);
                setPage(1);
              }}
              className="w-36"
            >
              <option value="">Any status</option>
              <option value="false">Active</option>
              <option value="true">Suspended</option>
            </Select>
          </div>
        </div>

        <Button onClick={() => setCreateOpen(true)}>
          <UserPlus />
          New staff account
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading && users.length === 0 ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted">No users match your filters</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Sign-in</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const isMe = user.id === me?.id;
                  const roles = resolvedRoles(user);
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar src={user.profile?.avatar} name={displayName(user)} />
                          <div className="min-w-0 max-w-[220px]">
                            <p className="truncate text-sm font-medium text-foreground">
                              {displayName(user)}
                              {isMe && <span className="ml-1 text-xs text-muted">(you)</span>}
                            </p>
                            <p className="truncate text-xs text-muted">
                              {user.email ?? (user.username ? `@${user.username}` : user.id)}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {roles.includes(UserRole.USER) && (
                            <Badge variant="secondary">User</Badge>
                          )}
                          {roles.includes(UserRole.CREATOR) && (
                            <Badge variant="accent">Creator</Badge>
                          )}
                          {roles.includes(UserRole.ADMIN) && (
                            <Badge>
                              <ShieldCheck className="mr-1 size-3" />
                              Admin
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted">
                        {providerList(user)}
                      </TableCell>
                      <TableCell>
                        {user.isSuspended ? (
                          <Badge
                            variant="destructive"
                            title={user.suspensionReason ?? undefined}
                          >
                            Suspended {formatRelative(user.suspendedAt)}
                          </Badge>
                        ) : user.isVerified ? (
                          <Badge variant="success">Verified</Badge>
                        ) : (
                          <Badge variant="secondary">Unverified</Badge>
                        )}
                      </TableCell>
                      <TableCell
                        className="whitespace-nowrap text-sm text-muted"
                        title={formatDate(user.createdAt)}
                      >
                        {formatRelative(user.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setRolesUser(user);
                              setRolesOpen(true);
                            }}
                          >
                            <UserCog />
                            Roles
                          </Button>
                          <Button
                            size="sm"
                            variant={user.isVerified ? "success" : "outline"}
                            onClick={() => {
                              setVerifyUser(user);
                              setVerifyOpen(true);
                            }}
                          >
                            <BadgeCheck />
                            {user.isVerified ? "Verified" : "Verify"}
                          </Button>
                          <Button
                            size="sm"
                            variant={user.isSuspended ? "success" : "ghost"}
                            className={
                              user.isSuspended ? undefined : "text-error hover:bg-error-soft"
                            }
                            disabled={isMe && !user.isSuspended}
                            title={
                              isMe && !user.isSuspended
                                ? "You cannot suspend your own account"
                                : undefined
                            }
                            onClick={() => {
                              setSuspendUser(user);
                              setSuspendOpen(true);
                            }}
                          >
                            {user.isSuspended ? (
                              <>
                                <Undo2 />
                                Reinstate
                              </>
                            ) : (
                              <>
                                <Ban />
                                Suspend
                              </>
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {meta && <Pagination meta={meta} onPageChange={setPage} />}

      <RolesDialog user={rolesUserFresh} open={rolesOpen} onOpenChange={setRolesOpen} />
      <VerifyDialog user={verifyUserFresh} open={verifyOpen} onOpenChange={setVerifyOpen} />
      <SuspendDialog user={suspendUserFresh} open={suspendOpen} onOpenChange={setSuspendOpen} />
      <CreateStaffDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
