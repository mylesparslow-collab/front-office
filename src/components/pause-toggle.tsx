"use client";

import { useTransition } from "react";
import { Pause, Play } from "lucide-react";
import { setPaused } from "@/app/actions";

export function PauseToggle({ kind, id, paused }: { kind: "quote" | "invoice"; id: string; paused: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button className="btn btn-quiet btn-sm -ml-2" disabled={pending} onClick={() => start(() => setPaused(kind, id, !paused))}>
      {paused ? <Play size={13} /> : <Pause size={13} />}
      {paused ? "Resume follow-ups" : "Pause follow-ups"}
    </button>
  );
}
