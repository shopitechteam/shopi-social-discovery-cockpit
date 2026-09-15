"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { toast } from "sonner";
import { Filter, MessageSquarePlus, Search, Send, X } from "lucide-react";
import {
  ADMIN_MARK_TEAM_THREAD_READ,
  ADMIN_REPLY_TEAM_THREAD,
  ADMIN_TEAM_BROADCASTS,
  ADMIN_TEAM_THREADS,
  ADMIN_TEAM_THREAD_MESSAGES,
} from "@/graphql/operations";
import {
  TeamBroadcastAudience,
  TeamMessageSender,
  type TeamBroadcast,
  type TeamThread,
} from "@/graphql/types";
import { displayName, formatDate, formatNumber, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination } from "@/components/shared/pagination";
import { ComposeTeamMessageDialog } from "@/components/team/compose-team-message-dialog";

type View = "replies" | "threads" | "sent";

const PAGE_SIZE = 20;
const POLL_MS = 30_000;
const SEARCH_DEBOUNCE_MS = 350;

const AUDIENCE_LABEL: Record<TeamBroadcastAudience, string> = {
  [TeamBroadcastAudience.SELECTED]: "Selected",
  [TeamBroadcastAudience.ALL_CREATORS]: "All creators",
  [TeamBroadcastAudience.ACTIVE_CREATORS]: "Live creators",
};

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong";
}

function ThreadPanel({ thread, onChanged }: { thread: TeamThread; onChanged: () => void }) {
  const [reply, setReply] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const name = displayName(thread.user);

  const { data, loading, refetch } = useQuery(ADMIN_TEAM_THREAD_MESSAGES, {
    variables: { userId: thread.userId, limit: 100 },
    pollInterval: POLL_MS,
    fetchPolicy: "cache-and-network",
  });
  const [markRead] = useMutation(ADMIN_MARK_TEAM_THREAD_READ);
  const [sendReply, { loading: sending }] = useMutation(ADMIN_REPLY_TEAM_THREAD);

  const messages = useMemo(() => data?.adminTeamThreadMessages.items ?? [], [data]);

  // Opening a thread with unread replies marks them read for the whole team.
  useEffect(() => {
    if (thread.teamUnreadCount === 0) return;
    void markRead({ variables: { userId: thread.userId } }).then(onChanged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread.userId, thread.teamUnreadCount]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function handleReply() {
    if (!reply.trim()) return;
    try {
      await sendReply({ variables: { userId: thread.userId, body: reply.trim() } });
      setReply("");
      await refetch();
      onChanged();
    } catch (err) {
      toast.error(errMessage(err));
    }
  }

  return (
    <Card className="flex h-[calc(100vh-11rem)] min-h-[480px] flex-col">
      <div className="flex items-center gap-3 border-b border-border px-5 py-4">
        <Avatar src={thread.user?.profile?.avatar} name={name} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{name}</p>
          <p className="truncate text-xs text-muted">
            {thread.user?.email ?? (thread.user?.username ? `@${thread.user.username}` : thread.userId)}
          </p>
        </div>
        {thread.user?.isSuspended && (
          <Badge variant="destructive" className="ml-auto">
            Suspended
          </Badge>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {loading && messages.length === 0 ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className={cn("h-16 w-2/3", i % 2 ? "ml-auto" : "")} />
          ))
        ) : (
          messages.map((message) => {
            const fromTeam = message.sender === TeamMessageSender.TEAM;
            return (
              <div key={message.id} className={cn("flex", fromTeam ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                    fromTeam ? "bg-primary text-on-brand" : "bg-subtle text-foreground",
                  )}
                >
                  {message.subject && <p className="mb-1 font-semibold">{message.subject}</p>}
                  <p className="whitespace-pre-wrap break-words">{message.body}</p>
                  <p
                    className={cn(
                      "mt-1 text-[11px]",
                      fromTeam ? "text-on-brand/75" : "text-muted",
                    )}
                    title={formatDate(message.createdAt)}
                  >
                    {fromTeam ? "Shopi team" : name} · {formatRelative(message.createdAt)}
                    {fromTeam && message.readAt ? " · Seen" : ""}
                    {fromTeam && message.broadcastId ? " · broadcast" : ""}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-end gap-2 border-t border-border px-4 py-3">
        <Textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void handleReply();
          }}
          placeholder={`Reply to ${name} as Shopi team… (⌘/Ctrl + Enter to send)`}
          rows={2}
          maxLength={4000}
          className="min-h-0 flex-1 resize-none"
        />
        <Button onClick={() => void handleReply()} loading={sending} disabled={!reply.trim()}>
          {!sending && <Send />}
          Send
        </Button>
      </div>
    </Card>
  );
}

function SentTable({ onViewReplies }: { onViewReplies: (broadcast: TeamBroadcast) => void }) {
  const [page, setPage] = useState(1);
  const { data, loading } = useQuery(ADMIN_TEAM_BROADCASTS, {
    variables: { page, limit: PAGE_SIZE },
    pollInterval: POLL_MS,
    fetchPolicy: "cache-and-network",
  });
  const broadcasts = data?.adminTeamBroadcasts.data ?? [];
  const meta = data?.adminTeamBroadcasts.meta;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-0">
          {loading && broadcasts.length === 0 ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : broadcasts.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted">No messages sent yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Message</TableHead>
                  <TableHead>Audience</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Replied</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead className="text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {broadcasts.map((broadcast) => {
                  const rate = broadcast.recipientCount
                    ? Math.round((broadcast.respondentCount / broadcast.recipientCount) * 100)
                    : 0;
                  return (
                    <TableRow key={broadcast.id}>
                      <TableCell>
                        <div className="max-w-[360px]">
                          {broadcast.subject && (
                            <p className="truncate text-sm font-medium text-foreground">
                              {broadcast.subject}
                            </p>
                          )}
                          <p className="truncate text-xs text-muted">{broadcast.body}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{AUDIENCE_LABEL[broadcast.audience]}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{formatNumber(broadcast.recipientCount)}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatNumber(broadcast.respondentCount)}
                        <span className="ml-1 text-xs text-muted">({rate}%)</span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted" title={formatDate(broadcast.createdAt)}>
                        {formatRelative(broadcast.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={broadcast.respondentCount === 0}
                          onClick={() => onViewReplies(broadcast)}
                        >
                          View replies
                        </Button>
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
    </div>
  );
}

export default function TeamMessagesPage() {
  const [view, setView] = useState<View>("replies");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [broadcastFilter, setBroadcastFilter] = useState<TeamBroadcast | null>(null);
  // Snapshot, not just an id: in the unread view a thread drops out of the list
  // as soon as it's marked read, and the open panel must survive that.
  const [selectedThread, setSelectedThread] = useState<TeamThread | null>(null);
  const selectedUserId = selectedThread?.userId ?? null;
  const [composeOpen, setComposeOpen] = useState(false);

  const { data, loading, refetch } = useQuery(ADMIN_TEAM_THREADS, {
    variables: {
      page,
      limit: PAGE_SIZE,
      unreadOnly: view === "replies" && !broadcastFilter ? true : null,
      broadcastId: broadcastFilter?.id ?? null,
      search: submittedSearch || null,
    },
    skip: view === "sent",
    pollInterval: POLL_MS,
    fetchPolicy: "cache-and-network",
  });

  const threads = useMemo(() => data?.adminTeamThreads.data ?? [], [data]);
  const meta = data?.adminTeamThreads.meta;
  const unreadThreads = data?.adminTeamThreads.unreadThreads ?? 0;
  const selected = threads.find((t) => t.userId === selectedUserId) ?? selectedThread;

  useEffect(() => {
    const next = search.trim();
    const handle = window.setTimeout(() => {
      setSubmittedSearch((current) => {
        if (current === next) return current;
        setPage(1);
        return next;
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [search]);

  function switchView(next: View) {
    setView(next);
    setPage(1);
    setBroadcastFilter(null);
  }

  const tabs: { key: View; label: string; badge?: number }[] = [
    { key: "replies", label: "Unread replies", badge: unreadThreads },
    { key: "threads", label: "All threads" },
    { key: "sent", label: "Sent" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {tabs.map(({ key, label, badge }) => (
            <button
              key={key}
              onClick={() => switchView(key)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors cursor-pointer",
                view === key ? "bg-primary text-on-brand" : "bg-subtle text-muted hover:text-foreground",
              )}
            >
              {label}
              {badge ? (
                <span
                  className={cn(
                    "rounded-full px-1.5 text-xs font-bold",
                    view === key ? "bg-white/25" : "bg-primary text-on-brand",
                  )}
                >
                  {badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        <div className="flex w-full items-center gap-2 lg:w-auto">
          {view !== "sent" && (
            <div className="relative flex-1 lg:w-72 lg:flex-none">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email, username…"
                className="pl-9"
              />
            </div>
          )}
          <Button onClick={() => setComposeOpen(true)}>
            <MessageSquarePlus />
            New message
          </Button>
        </div>
      </div>

      {view === "sent" ? (
        <SentTable
          onViewReplies={(broadcast) => {
            setView("threads");
            setPage(1);
            setBroadcastFilter(broadcast);
            setSelectedThread(null);
          }}
        />
      ) : (
        <>
          {broadcastFilter && (
            <div className="flex items-center gap-2 rounded-2xl border border-border bg-elevated px-4 py-2.5 text-sm">
              <Filter className="size-4 text-muted" />
              <span className="min-w-0 truncate">
                Replies to <strong>{broadcastFilter.subject || broadcastFilter.body.slice(0, 60)}</strong>
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="ml-auto size-7"
                onClick={() => setBroadcastFilter(null)}
                aria-label="Clear filter"
              >
                <X />
              </Button>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-[minmax(280px,380px)_minmax(0,1fr)]">
            <div className="space-y-3">
              <Card>
                <CardContent className="p-0">
                  {loading && threads.length === 0 ? (
                    <div className="space-y-2 p-4">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-14 w-full" />
                      ))}
                    </div>
                  ) : threads.length === 0 ? (
                    <p className="px-6 py-16 text-center text-sm text-muted">
                      {view === "replies" && !broadcastFilter
                        ? "No unread replies — all caught up"
                        : "No threads yet. Send a message to start one."}
                    </p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {threads.map((thread) => {
                        const name = displayName(thread.user);
                        const active = thread.userId === selectedUserId;
                        return (
                          <li key={thread.id}>
                            <button
                              type="button"
                              onClick={() => setSelectedThread(thread)}
                              className={cn(
                                "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors cursor-pointer",
                                active ? "bg-primary-soft" : "hover:bg-subtle",
                              )}
                            >
                              <Avatar src={thread.user?.profile?.avatar} name={name} />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <p
                                    className={cn(
                                      "truncate text-sm text-foreground",
                                      thread.teamUnreadCount > 0 && "font-semibold",
                                    )}
                                  >
                                    {name}
                                  </p>
                                  <span className="shrink-0 text-xs text-muted">
                                    {formatRelative(thread.lastMessageAt)}
                                  </span>
                                </div>
                                <p className="truncate text-xs text-muted">
                                  {thread.lastMessageSender === TeamMessageSender.TEAM ? "You: " : ""}
                                  {thread.lastMessagePreview}
                                </p>
                              </div>
                              {thread.teamUnreadCount > 0 && (
                                <span className="mt-1 rounded-full bg-primary px-1.5 text-xs font-bold text-on-brand">
                                  {thread.teamUnreadCount}
                                </span>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>
              {meta && meta.totalPages > 1 && <Pagination meta={meta} onPageChange={setPage} />}
            </div>

            {selected ? (
              <ThreadPanel key={selected.userId} thread={selected} onChanged={() => void refetch()} />
            ) : (
              <Card className="hidden min-h-[480px] items-center justify-center lg:flex">
                <p className="text-sm text-muted">Select a thread to read and reply</p>
              </Card>
            )}
          </div>
        </>
      )}

      <ComposeTeamMessageDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        onSent={() => {
          if (view !== "sent") void refetch();
        }}
      />
    </div>
  );
}
