"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";

export function VentureNamePrompt({
  currentName,
}: {
  currentName: string;
}) {
  const router = useRouter();
  // Only render open if we're actually being asked to prompt.
  const [open, setOpen] = useState(true);
  const [name, setName] = useState(currentName ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError("שם המיזם קצר מדי");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/venture/set-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "שמירת שם המיזם נכשלה");
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={() => { /* forced — no dismiss */ }}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <div className="flex items-center gap-2 text-[#1a2744]">
              <Sparkles className="size-5" />
              <DialogTitle>אשרו את שם המיזם</DialogTitle>
            </div>
            <DialogDescription>
              {currentName
                ? `השם הנוכחי של המיזם הוא "${currentName}". אשרו אותו או הזינו שם חדש שיוצג בפורטל ובמשוב יום ההדגמה. ניתן לשנות בהמשך.`
                : "בחרו שם למיזם שיוצג בפורטל ובמשוב יום ההדגמה. ניתן לשנות בהמשך."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-4">
            <Label htmlFor="venture_name">שם המיזם</Label>
            <Input
              id="venture_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="שם המיזם"
              autoFocus
              maxLength={120}
              required
            />
            {error ? (
              <p className="text-xs text-red-600">{error}</p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={submitting || name.trim().length < 2}
              className="min-w-28"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  שומר...
                </>
              ) : (
                "שמור"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
