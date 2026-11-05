// The six automations every small business gets, and the rules each one runs under.
// "Approval rules" is the plain-English charter: what each automation may do by itself,
// what always waits for the owner, and what it will never do.

export type AutomationId = "lead" | "quote" | "invoice" | "review" | "missed" | "brief";

export interface Automation {
  id: AutomationId;
  name: string;
  trigger: string;
  steps: string[];
  sample: { channel: "sms" | "email"; to: string; body: string };
  /** What the owner decides; the rest is automatic. */
  ownerStep: string;
  rules: { alone: string; waits: string; never: string };
  /** Where an existing screen already runs it. */
  href?: string;
}

export const AUTOMATIONS: Automation[] = [
  {
    id: "lead",
    name: "Speed-to-lead reply",
    trigger: "A form, call or message arrives",
    steps: ["Say thanks within a minute", "Ask two qualifying questions", "Offer a booking link", "Alert you if it looks hot"],
    sample: { channel: "sms", to: "New lead", body: "Hi, thanks for reaching out to {business}. What's the address, and is the system running at all right now? I can have someone call you within the hour or you can pick a time: {booking_link}" },
    ownerStep: "You approve the first reply template once; hot leads always ping you.",
    rules: {
      alone: "Acknowledge and ask the two questions you approved.",
      waits: "Anything with a price, a time promise or an emergency.",
      never: "Quote a price or promise a start date.",
    },
    href: "/app/pipeline",
  },
  {
    id: "quote",
    name: "Quote follow-up",
    trigger: "A quote is sent",
    steps: ["Day 2 friendly nudge", "Day 5 “any questions?”", "Day 10 close-the-loop", "Stops the moment they reply"],
    sample: { channel: "email", to: "Quote customer", body: "Hi {first_name}, just checking that quote {number} came through okay. Happy to adjust the scope if anything doesn't fit. {quote_link}" },
    ownerStep: "You read and approve each message before it goes.",
    rules: {
      alone: "Queue the next check-in on schedule.",
      waits: "Every message to a customer, until you switch a step to automatic.",
      never: "Offer a discount or change a price.",
    },
    href: "/app/chasers",
  },
  {
    id: "invoice",
    name: "Late-invoice chase",
    trigger: "An invoice passes its due date",
    steps: ["Friendly reminder with a pay link", "Firmer reminder", "Alert you at 14 days", "Marks itself paid when money lands"],
    sample: { channel: "email", to: "Invoice customer", body: "Hi {first_name}, invoice {number} for {amount} was due on {due_date}. Here's the link to pay: {pay_link}. If it crossed with your payment, thank you." },
    ownerStep: "You set the tone and approve each reminder; the 14-day call is yours.",
    rules: {
      alone: "Stop chasing the instant a payment or reply is recorded.",
      waits: "Every reminder, until you trust the wording.",
      never: "Mention late fees, collections or legal action.",
    },
    href: "/app/invoices",
  },
  {
    id: "review",
    name: "Review request",
    trigger: "A job is finished and paid",
    steps: ["Wait one day", "Text the review link", "Unhappy replies come to you first, privately", "One reminder at most"],
    sample: { channel: "sms", to: "Customer after the job", body: "Hi {first_name}, thanks for choosing {business}. If {tech} took good care of you, a quick review helps a lot: {review_link}. If anything wasn't right, just reply and I'll fix it." },
    ownerStep: "You see any reply under four stars before anyone else does.",
    rules: {
      alone: "Send one request a day after payment clears.",
      waits: "Any customer who has complained or has an open issue.",
      never: "Offer anything in exchange for a review or ask twice.",
    },
  },
  {
    id: "missed",
    name: "Missed-call text-back",
    trigger: "A call goes unanswered",
    steps: ["Text back within a minute", "Ask what's going on and the address", "Offer a callback time or booking link", "Logged as a lead"],
    sample: { channel: "sms", to: "Caller", body: "Sorry we missed your call, this is {business}. What do you need help with, and what's the best time for a callback? Or pick a slot: {booking_link}" },
    ownerStep: "You approve the wording once; every missed call lands on Today.",
    rules: {
      alone: "Send the approved text during business hours.",
      waits: "Calls after 8pm or before 8am wait until morning for you.",
      never: "Text a number marked do-not-contact.",
    },
    href: "/app/pipeline",
  },
  {
    id: "brief",
    name: "Monday owner brief",
    trigger: "Monday, 7:00 am",
    steps: ["Pull new leads, open quotes and unpaid invoices", "Write one short message", "Name the one thing to do first", "Sent to you only"],
    sample: { channel: "email", to: "You", body: "Preview below, built from this workspace right now." },
    ownerStep: "Read-only. It never contacts a customer.",
    rules: {
      alone: "Read your numbers and write you a summary.",
      waits: "Nothing; it only talks to you.",
      never: "Contact anyone else or change a record.",
    },
    href: "/app/numbers",
  },
];

export const CHARTER = [
  "Every message to a customer waits for your approval until you decide otherwise, step by step.",
  "No automation ever changes a price, offers a discount, or makes a promise you haven't approved.",
  "A customer's reply stops everything and puts it in front of you.",
  "Quiet hours: nothing goes out before 8am or after 8pm.",
  "Every message and every approval is logged with who approved it and when.",
  "You can pause any single automation, or all of them, in one click.",
];
