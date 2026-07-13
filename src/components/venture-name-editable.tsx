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
import { Loader2, Pencil } from "lucide-react";

export function VentureNameEditable({ currentName }: { currentName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(currentName);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setName(currentName);
      setError("");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError("שם המיזם קצר מדי");
      return;
    }
    if (trimmed === currentName) {
      setOpen(false);
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
    <>
      <button
        type="button"
        onClick={() => handleOpenChange(true)}
        className="group inline-flex items-center gap-1.5 text-xl font-bold text-[#1a2744] leading-tight hover:text-[#22c55e] transition-colors"
        title="שינוי שם המיזם"
      >
        <span>{currentName}</span>
        <Pencil className="size-3.5 opacity-0 group-hover:opacity-70 transition-opacity" />
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>שינוי שם המיזם</DialogTitle>
              <DialogDescription>
                השם יתעדכן בכל מקום בפורטל, כולל משוב יום ההדגמה.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-4">
              <Label htmlFor="venture_name_edit">שם המיזם</Label>
              <Input
                id="venture_name_edit"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="שם המיזם"
                autoFocus
                maxLength={120}
                required
              />
              {error ? <p className="text-xs text-red-600">{error}</p> : null}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={submitting}
              >
                ביטול
              </Button>
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
    </>
  );
}
