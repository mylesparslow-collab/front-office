import { Mail, MapPin, Phone } from "lucide-react";
import { Avatar } from "./ui";

export function CustomerCard({ c }: { c: { name: string; company: string | null; email: string | null; phone: string | null; address: string | null } }) {
  return (
    <section className="card p-5">
      <div className="flex items-center gap-3">
        <Avatar name={c.name} size={38} />
        <div>
          <div className="text-[14.5px] font-semibold">{c.name}</div>
          {c.company && <div className="text-[12.5px] text-muted">{c.company}</div>}
        </div>
      </div>
      <dl className="mt-4 space-y-2 text-[13px] text-ink-2">
        {c.phone && (
          <div className="flex items-center gap-2">
            <Phone size={13} className="text-faint" />
            <a href={`tel:${c.phone}`} className="hover:text-red">{c.phone}</a>
          </div>
        )}
        {c.email && (
          <div className="flex items-center gap-2">
            <Mail size={13} className="text-faint" />
            <span className="truncate">{c.email}</span>
          </div>
        )}
        {c.address && (
          <div className="flex items-center gap-2">
            <MapPin size={13} className="text-faint" />
            {c.address}
          </div>
        )}
      </dl>
    </section>
  );
}
