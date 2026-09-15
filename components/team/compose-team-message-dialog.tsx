"use client";

import { useState } from "react";
import { useMutation } from "@apollo/client/react";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { ADMIN_SEND_TEAM_MESSAGE } from "@/graphql/operations";
import { TeamBroadcastAudience } from "@/graphql/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const MAX_BODY = 4000;

const AUDIENCE_OPTIONS = [
  {
    value: TeamBroadcastAudience.ACTIVE_CREATORS,
    label: "Creators with a live post",
    hint: "Sellers who currently have at least one live listing.",
  },
  {
    value: TeamBroadcastAudience.ALL_CREATORS,
    label: "All creators",
    hint: "Everyone who has ever posted, including sellers with nothing live.",
  },
];

export interface TeamRecipient {
  id: string;
  name: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Send to exactly this member instead of a broadcast audience. */
  recipient?: TeamRecipient | null;
  onSent?: () => void;
}

/**
 * Compose a message members receive from "Shopi team" — a survey link, a
 * performance check-in, an announcement. Members can reply in their thread.
 */
export function ComposeTeamMessageDialog({ open, onOpenChange, recipient, onSent }: Props) {
  const [audience, setAudience] = useState(TeamBroadcastAudience.ACTIVE_CREATORS);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [send, { loading }] = useMutation(ADMIN_SEND_TEAM_MESSAGE, {
    refetchQueries: ["AdminTeamBroadcasts", "AdminTeamThreads"],
  });

  function handleOpenChange(next: boolean) {
    if (!next) {
      setSubject("");
      setBody("");
    }
    onOpenChange(next);
  }

  const audienceHint = AUDIENCE_OPTIONS.find((o) => o.value === audience)?.hint;

  async function handleSend() {
    if (!body.trim()) {
      toast.error("Write a message first");
      return;
    }
    try {
      const { data } = await send({
        variables: {
          input: recipient
            ? {
                audience: TeamBroadcastAudience.SELECTED,
                userIds: [recipient.id],
                subject: subject.trim() || null,
                body: body.trim(),
              }
            : { audience, subject: subject.trim() || null, body: body.trim() },
        },
      });
      const count = data?.adminSendTeamMessage.recipientCount ?? 0;
      toast.success(
        recipient
          ? `Sent to ${recipient.name}`
          : `Sent to ${count} member${count === 1 ? "" : "s"}`,
      );
      handleOpenChange(false);
      onSent?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send message");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{recipient ? `Message ${recipient.name}` : "New Shopi team message"}</DialogTitle>
          <DialogDescription>
            Delivered to their inbox from <strong>Shopi team</strong> with a notification. They can
            reply, and replies show up on the Shopi team page.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!recipient && (
            <div className="space-y-1.5">
              <Label htmlFor="team-audience">Send to</Label>
              <Select
                id="team-audience"
                value={audience}
                onChange={(e) => setAudience(e.target.value as TeamBroadcastAudience)}
              >
                {AUDIENCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              {audienceHint && <p className="text-xs text-muted">{audienceHint}</p>}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="team-subject">Subject (optional)</Label>
            <Input
              id="team-subject"
              value={subject}
              maxLength={160}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. 2-minute seller survey"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="team-body">Message</Label>
            <Textarea
              id="team-body"
              value={body}
              maxLength={MAX_BODY}
              rows={7}
              onChange={(e) => setBody(e.target.value)}
              placeholder={
                "Hi! How has selling on Shopi been this month?\n\nTell us in 2 minutes: https://forms.gle/…"
              }
            />
            <p className="text-right text-xs text-muted">
              {body.length}/{MAX_BODY}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void handleSend()} loading={loading}>
            {!loading && <Send />}
            {loading ? "Sending..." : "Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
