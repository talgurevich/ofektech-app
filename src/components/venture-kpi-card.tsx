"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Briefcase, ChevronLeft } from "lucide-react";

export function VentureKpiCard({ ventures }: { ventures: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <Card
        className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setOpen(!open)}
      >
        <CardContent className="flex items-center gap-4 pt-0">
          <div className="flex size-10 items-center justify-center rounded-lg bg-[#22c55e]/10">
            <Briefcase className="size-5 text-[#22c55e]" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[#1a2744]">{ventures.length}</p>
            <p className="text-xs text-gray-500">מיזמים</p>
          </div>
        </CardContent>
      </Card>

      {open && (
        <div className="absolute z-50 top-full mt-2 right-0 w-64 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-[#1a2744]">המיזמים שלי</p>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {ventures.map((v) => (
              <Link
                key={v.id}
                href={`/ventures/${v.id}`}
                className="flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 transition-colors"
                onClick={() => setOpen(false)}
              >
                <div className="flex items-center gap-2">
                  <Briefcase className="size-3.5 text-[#22c55e]" />
                  <span className="text-sm text-[#1a2744]">{v.name}</span>
                </div>
                <ChevronLeft className="size-3.5 text-gray-400" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
