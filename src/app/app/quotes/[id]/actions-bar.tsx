"use client";

import { useState, useTransition } from "react";
import { Check, Copy, ExternalLink, Receipt, Send, X } from "lucide-react";
import { decideQuote, invoiceFromQuote, sendQuote } from "@/app/actions";
import type { QuoteStatus } from "@/lib/types";

export function QuoteActions({ id, status, link, previewLink, hasInvoice }: { id: string; status: QuoteStatus; link: string; previewLink: string; hasInvoice: boolean }) {
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {status !== "draft" && (
        <>
          <button
            className="btn btn-ghost"
            onClick={() => {
              navigator.clipboard?.writeText(link);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            <Copy size={14} /> {copied ? "Copied" : "Copy customer link"}
          </button>
          <a className="btn btn-quiet" href={previewLink} target="_blank" rel="noreferrer">
            <ExternalLink size={14} /> Customer view
          </a>
        </>
      )}
      {status === "draft" && (
        <button className="btn btn-primary" disabled={pending} onClick={() => start(() => sendQuote(id))}>
          <Send size={14} /> Send quote
        </button>
      )}
      {(status === "sent" || status === "viewed") && (
        <>
          <button className="btn btn-ghost" disabled={pending} onClick={() => start(() => decideQuote(id, false))}>
            <X size={14} /> Mark declined
          </button>
          <button className="btn btn-dark" disabled={pending} onClick={() => start(() => decideQuote(id, true))}>
            <Check size={14} /> Mark accepted
          </button>
        </>
      )}
      {status === "accepted" && !hasInvoice && (
        <button className="btn btn-primary" disabled={pending} onClick={() => start(() => invoiceFromQuote(id))}>
          <Receipt size={14} /> Turn into invoice
        </button>
      )}
    </div>
  );
}
