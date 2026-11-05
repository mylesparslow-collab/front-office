"""Generates supabase/03_seed.sql: a demo seed whose dates are all relative to today,
so the demo workspace always looks current after a reset."""
import json, random
random.seed(7)

def q(s):
    return "null" if s is None else "'" + str(s).replace("'", "''") + "'"

def day(n):  # date n days from today
    return f"(current_date + {n})"

def ts(n, hour=9.5):  # timestamp n days from today at local-ish business hour
    return f"((current_date + {n})::timestamptz + interval '{int(hour*60)} minutes' + interval '7 hours')"

def ago_minutes(m):
    return f"(now() - interval '{m} minutes')"

C = lambda name: f"(select id from contacts where business_id = b and name = {q(name)})"
Q = lambda num: f"(select id from quotes where business_id = b and number = {q(num)})"
I = lambda num: f"(select id from invoices where business_id = b and number = {q(num)})"
L = lambda title: f"(select id from leads where business_id = b and title = {q(title)})"

contacts = [
 # name, company, email, phone, address
 ("Priya Raman", None, "priya.raman@example.com", "(949) 555-0117", "18 Sandpiper, Irvine"),
 ("Tom Becker", None, "tbecker@example.net", "(949) 555-0123", "402 Rockview, Irvine"),
 ("Alana Ortiz", None, "alana.ortiz@example.com", "(714) 555-0108", "77 Coral Rose, Irvine"),
 ("Martin Holloway", None, "m.holloway@example.org", "(949) 555-0131", "9 Fallbrook, Irvine"),
 ("Grace Liu", None, "grace.liu@example.com", "(949) 555-0146", "210 Tamarisk, Irvine"),
 ("Evan Hendricks", None, "evan.hendricks@example.com", "(949) 555-0152", "5 Marigold, Irvine"),
 ("Claire Moreau", None, "claire.moreau@example.net", "(949) 555-0163", "31 Cartwright, Irvine"),
 ("David Chen", None, "dchen.home@example.com", "(949) 555-0170", "128 Hillgate, Irvine"),
 ("Nadia Farouk", "Quail Hill Townhomes HOA", "board@quailhill-hoa.example", "(949) 555-0184", "Quail Hill Community Center"),
 ("Sam Barrett", None, "sam.barrett@example.com", "(714) 555-0119", "44 Tidewater, Irvine"),
 ("Jordan Lowe", None, "jlowe@example.org", "(949) 555-0191", "12 Cherry Hill, Irvine"),
 ("Anil Patel", None, "anil.patel@example.com", "(949) 555-0102", "61 Pinecrest, Irvine"),
 ("Kate Brennan", None, "kate.brennan@example.net", "(949) 555-0127", "8 Silkwood, Irvine"),
 ("Chidi Okafor", None, "chidi.okafor@example.com", "(949) 555-0138", "300 Turtle Ridge, Irvine"),
 ("Helen Whitfield", None, "h.whitfield@example.com", "(714) 555-0144", "19 Mira Loma, Irvine"),
 ("Marco Gallo", None, "marco.gallo@example.net", "(949) 555-0155", "71 Ashbury, Irvine"),
 ("Rebecca Ash", None, "rebecca.ash@example.com", "(949) 555-0161", "15 Jade Cove, Irvine"),
 ("Luis Marquez", None, "luis.marquez@example.com", "(949) 555-0174", "222 Brookline, Irvine"),
 ("Dana Kessler", "Culver Plaza Management", "ap@culverplaza.example", "(949) 555-0188", "14400 Culver Dr, Irvine"),
 ("Victor Delgado", None, "vdelgado@example.org", "(714) 555-0135", "90 Woodleaf, Irvine"),
 ("Ruth Fairbanks", None, "ruth.fairbanks@example.com", "(949) 555-0193", "4 Gingerwood, Irvine"),
 ("Owen Price", "Coastline Self Storage", "accounts@coastline-storage.example", "(949) 555-0109", "2 Technology Dr, Irvine"),
 ("Mei Sato", None, "mei.sato@example.com", "(949) 555-0114", "50 Overbrook, Irvine"),
 ("Erik Lindqvist", None, "erik.lindqvist@example.net", "(949) 555-0126", "17 Northwood Pl, Irvine"),
 ("Tanya Brooks", "Woodbridge Village Assoc.", "facilities@wbva.example", "(949) 555-0132", "31 Creek Rd, Irvine"),
 ("Hyun Kim", None, "hyun.kim@example.com", "(949) 555-0148", "26 Stonecliffe, Irvine"),
 ("Isabel Ruiz", None, "isabel.ruiz@example.org", "(714) 555-0151", "601 Laurelwood, Irvine"),
 ("Paul Ferreira", "Turtle Rock Dental Group", "office@trdental.example", "(949) 555-0166", "4 Turtle Rock Ct, Irvine"),
 ("Nora Harlow", None, "nora.harlow@example.com", "(949) 555-0179", "13 Canyon Oak, Irvine"),
 ("Ben Alton", "Alton Commons Property Mgmt", "billing@altoncommons.example", "(949) 555-0181", "16 Alton Pkwy, Irvine"),
 ("Thao Nguyen", None, "thao.nguyen@example.com", "(949) 555-0195", "3 Eastshore, Irvine"),
 ("Greg Fenwick", None, "greg.fenwick@example.net", "(949) 555-0105", "88 Springbrook, Irvine"),
]
extra_names = ["Lena Park","Omar Haddad","Sofia Russo","Jack Whelan","Ivy Tran","Caleb Ross","Maya Goldberg","Felix Wagner","Rosa Jimenez","Ken Ito","Amara Diallo","Will Carver"]
for i, n in enumerate(extra_names):
    first, last = n.split()
    contacts.append((n, None, f"{first.lower()}.{last.lower()}@example.com", f"(949) 555-01{i+60:02d}", f"{random.randint(2,400)} {random.choice(['Ridgeline','Meadowood','Sierra Vista','Palmetto','Cypress'])}, Irvine"))

out = []
w = out.append
w("""create or replace function public.seed_demo(b uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from messages where business_id = b;
  delete from activities where business_id = b;
  delete from invoices where business_id = b;
  delete from quotes where business_id = b;
  delete from leads where business_id = b;
  delete from contacts where business_id = b;
  perform public.default_cadences(b);
""")
w("  insert into contacts(business_id, name, company, email, phone, address, created_at) values\n" + ",\n".join(
    f"  (b, {q(n)}, {q(co)}, {q(e)}, {q(p)}, {q(a)}, {ts(-random.randint(5,200))})" for n, co, e, p, a in contacts) + ";\n")

def items(*rows):
    return q(json.dumps([{"description": d, "qty": qt, "unit": u} for d, qt, u in rows])) + "::jsonb"

# ---------------- leads ----------------
leads = [
 # title, contact, source, stage, value, created(expr), first_response(expr or None), notes, lost_reason
 ("AC blowing warm air", "Priya Raman", "Website", "new", 650, ago_minutes(96), None, "Upstairs unit, 14 yrs old. Has a toddler at home, wants today if possible.", None),
 ("Furnace making a banging noise", "Tom Becker", "Google", "new", 480, ago_minutes(60*26), None, "Noise on startup only.", None),
 ("HVAC for new backyard ADU", "Alana Ortiz", "Referral", "new", 8400, ago_minutes(38), None, "Referred by Kate Brennan. 480 sq ft ADU, permits pulled.", None),
 ("Second story always too hot", "Martin Holloway", "Yelp", "contacted", 5200, ts(-4, 8), ts(-4, 8.2), "Likely zoning or a duct balance issue. Site visit Thursday.", None),
 ("Yearly maintenance plan", "Grace Liu", "Website", "contacted", 349, ts(-6, 13), ts(-6, 13.5), "Two systems. Interested in the 2-visit plan.", None),
 ("4-ton AC replacement", "Evan Hendricks", "Google", "quoted", 12480, ts(-9, 10), ts(-9, 10.1), None, None),
 ("Ductless mini-splits for 3 rooms", "Claire Moreau", "Referral", "quoted", 9860, ts(-12, 15), ts(-12, 15.3), "Wants quiet units for the bedrooms.", None),
 ("Furnace + AC combo replacement", "David Chen", "Website", "quoted", 16250, ts(-16, 9), ts(-16, 9.4), "Comparing us with one other bid.", None),
 ("Annual maintenance, 32 units", "Nadia Farouk", "Referral", "quoted", 8960, ts(-22, 11), ts(-21, 9), "Board votes on vendors monthly.", None),
 ("Whole-home air filtration", "Sam Barrett", "Google", "quoted", 2140, ts(-4, 16), ts(-4, 16.1), "Allergies. Asked about MERV 13 vs HEPA.", None),
 ("Attic ductwork and insulation", "Jordan Lowe", "Phone", "quoted", 4300, ts(-2, 12), ts(-2, 12.05), "Quote drafted, waiting on attic photos.", None),
 ("Heat pump install", "Anil Patel", "Google", "won", 14200, ts(-100, 10), ts(-100, 10.2), None, None),
 ("Mini-split for home office", "Kate Brennan", "Website", "won", 6750, ts(-44, 9), ts(-44, 9.1), None, None),
 ("Whole-home system replacement", "Chidi Okafor", "Referral", "won", 9800, ts(-62, 14), ts(-62, 15), None, None),
 ("Furnace replacement", "Helen Whitfield", "Phone", "won", 4980, ts(-115, 11), ts(-115, 11.1), None, None),
 ("AC replacement", "Marco Gallo", "Google", "lost", 11900, ts(-50, 10), ts(-50, 13), None, "Went with a lower bid"),
 ("Ductless system", "Rebecca Ash", "Yelp", "lost", 7200, ts(-38, 9), ts(-37, 9), None, "Declined quote online"),
 ("AC tune-up and inspection", "Greg Fenwick", "Website", "lost", 189, ts(-30, 18), ts(-29, 10), None, "Never replied"),
]
w("  insert into leads(business_id, contact_id, title, source, stage, value, created_at, first_response_at, last_touch_at, notes, lost_reason) values\n" + ",\n".join(
    f"  (b, {C(c)}, {q(t)}, {q(s)}, {q(st)}, {v}, {cr}, {fr or 'null'}, {fr or cr}, {q(n)}, {q(lr)})" for t, c, s, st, v, cr, fr, n, lr in leads) + ";\n")

# ---------------- quotes ----------------
quotes = [
 # number, title, contact, lead title, status, items, sent, viewed, decided, accepted_by, valid_until
 ("Q-2104", "4-ton AC replacement", "Evan Hendricks", "4-ton AC replacement", "sent",
   [("Carrier 4-ton 16 SEER2 condenser", 1, 6850), ("Matching evaporator coil", 1, 2180), ("Line set, pad and disconnect", 1, 1450), ("Labor, permit and haul-away", 1, 2000)], -3, None, None, None, 27),
 ("Q-2101", "Ductless mini-splits for 3 rooms", "Claire Moreau", "Ductless mini-splits for 3 rooms", "viewed",
   [("3-zone outdoor heat pump", 1, 4200), ("Wall-mounted indoor heads", 3, 980), ("Line sets and condensate pumps", 3, 300), ("Install labor", 1, 1820)], -6, -5, None, None, 24),
 ("Q-2098", "Furnace + AC combo replacement", "David Chen", "Furnace + AC combo replacement", "viewed",
   [("96% AFUE variable-speed furnace", 1, 4650), ("3.5-ton AC condenser + coil", 1, 7400), ("Smart thermostat", 1, 350), ("Ductwork transitions", 1, 1100), ("Labor, permit and haul-away", 1, 2750)], -10, -9, None, None, 20),
 ("Q-2095", "Annual maintenance, 32 units", "Nadia Farouk", "Annual maintenance, 32 units", "sent",
   [("Spring AC tune-up, per unit", 32, 140), ("Fall furnace safety check, per unit", 32, 140)], -15, None, None, None, 15),
 ("Q-2106", "Whole-home air filtration", "Sam Barrett", "Whole-home air filtration", "sent",
   [("Media air cleaner, MERV 13", 1, 1290), ("UV coil light", 1, 550), ("Install labor", 1, 300)], -1, None, None, None, 29),
 ("Q-2107", "Attic ductwork and insulation", "Jordan Lowe", "Attic ductwork and insulation", "draft",
   [("R-8 flex duct replacement, 6 runs", 1, 2600), ("Seal plenum and boots", 1, 650), ("Blown-in insulation top-off", 1, 1050)], None, None, None, None, None),
 ("Q-2071", "Heat pump install", "Anil Patel", "Heat pump install", "accepted",
   [("4-ton heat pump system", 1, 11200), ("Electrical upgrade", 1, 1400), ("Labor and permit", 1, 1600)], -95, -94, -92, "Anil Patel", None),
 ("Q-2088", "Mini-split for home office", "Kate Brennan", "Mini-split for home office", "accepted",
   [("12k BTU mini-split", 1, 3900), ("Install labor", 1, 2350), ("Wall sleeve and trim", 1, 500)], -40, -39, -33, "Kate Brennan", None),
 ("Q-2083", "Whole-home system replacement", "Chidi Okafor", "Whole-home system replacement", "accepted",
   [("3-ton AC + 80k furnace", 1, 7600), ("Labor and permit", 1, 2200)], -58, -57, -50, "Chidi Okafor", None),
 ("Q-2064", "Furnace replacement", "Helen Whitfield", "Furnace replacement", "accepted",
   [("80% AFUE furnace", 1, 3400), ("Labor and permit", 1, 1580)], -110, -109, -104, "Helen Whitfield", None),
 ("Q-2085", "AC replacement", "Marco Gallo", "AC replacement", "declined",
   [("4-ton AC + coil", 1, 9200), ("Labor and permit", 1, 2700)], -45, -44, -30, None, None),
 ("Q-2091", "Ductless system", "Rebecca Ash", "Ductless system", "declined",
   [("2-zone ductless", 1, 5600), ("Install labor", 1, 1600)], -35, -33, -20, None, None),
]
rows = []
for num, title, c, lt, st, its, sent, viewed, decided, by, valid in quotes:
    amt = sum(qt*u for _, qt, u in its)
    vu = day(valid) if valid is not None else (day(sent + 30) if sent is not None else "null")
    rows.append(f"  (b, {L(lt)}, {C(c)}, {q(num)}, {q(title)}, {items(*its)}, {amt}, {q(st)}, {ts(sent, 10) if sent is not None else 'null'}, {ts(viewed, 19) if viewed is not None else 'null'}, {ts(decided, 12) if decided is not None else 'null'}, {q(by)}, {vu}, {ts(sent if sent is not None else -1, 9)})")
w("  insert into quotes(business_id, lead_id, contact_id, number, title, items, amount, status, sent_at, viewed_at, decided_at, accepted_by, valid_until, created_at) values\n" + ",\n".join(rows) + ";\n")

# ---------------- invoices ----------------
inv = [
 # number, title, contact, quote, amount, paid, issued, due, paid_on
 ("INV-1180", "Spring AC tune-up, 14 units", "Tanya Brooks", None, 4860, 4860, -96, -66, -58),
 ("INV-1183", "Furnace igniter and flame sensor", "Hyun Kim", None, 685, 685, -88, -73, -75),
 ("INV-1186", "Heat pump install", "Anil Patel", "Q-2071", 14200, 14200, -80, -65, -60),
 ("INV-1190", "Duct cleaning, 12 vents", "Isabel Ruiz", None, 540, 540, -70, -55, -41),
 ("INV-1193", "Rooftop unit service", "Paul Ferreira", None, 1920, 1920, -62, -32, -29),
 ("INV-1196", "Thermostat and 2-zone damper kit", "Nora Harlow", None, 2350, 2350, -55, -40, -38),
 ("INV-1199", "Common-area split system repair", "Ben Alton", None, 3400, 3400, -48, -18, -12),
 ("INV-1204", "Capacitor and contactor replacement", "Thao Nguyen", None, 890, 890, -30, -15, -15),
 ("INV-1207", "Mini-split for home office", "Kate Brennan", "Q-2088", 6750, 6750, -26, -11, -9),
 ("INV-1201", "Whole-home system replacement", "Chidi Okafor", "Q-2083", 9800, 4900, -40, -25, None),
 ("INV-1214", "AC tune-up", "Mei Sato", None, 289, 0, -5, 10, None),
 ("INV-1211", "Attic furnace replacement", "Erik Lindqvist", None, 5400, 0, -12, 2, None),
 ("INV-1205", "Refrigerant leak search and repair", "Luis Marquez", None, 1180, 0, -24, -9, None),
 ("INV-1197", "Rooftop compressor replacement", "Dana Kessler", None, 7450, 0, -52, -22, None),
 ("INV-1191", "Return duct rebuild", "Victor Delgado", None, 3260, 0, -61, -46, None),
 ("INV-1188", "After-hours emergency repair", "Ruth Fairbanks", None, 1640, 0, -73, -58, None),
 ("INV-1176", "Furnace replacement", "Helen Whitfield", "Q-2064", 4980, 0, -96, -81, None),
 ("INV-1162", "Office split-system install", "Owen Price", None, 11300, 0, -140, -110, None),
]
# Background service calls over six months so the collections chart and days-to-pay have real volume.
jobs = ["AC repair", "Furnace tune-up", "Thermostat install", "Condensate line clear", "Blower motor replacement", "Capacitor replacement", "AC tune-up", "Duct sealing", "Refrigerant recharge", "Filter and coil cleaning"]
n = 1100
for i in range(26):
    name = extra_names[i % len(extra_names)]
    issued = -random.randint(8, 175)
    amt = random.choice([189, 249, 289, 365, 420, 485, 560, 640, 780, 920, 1150, 1480, 1890, 2400])
    dtp = max(0, int(random.gauss(11, 8)))
    n += 2 + i % 3
    inv.append((f"INV-{n}", random.choice(jobs), name, None, amt, amt, issued, issued + 15, min(issued + dtp, -1)))
rows = []
for num, title, c, qn, amt, paid, iss, due, pon in inv:
    rows.append(f"  (b, {C(c)}, {Q(qn) if qn else 'null'}, {q(num)}, {q(title)}, {amt}, {paid}, {day(iss)}, {day(due)}, {day(pon) if pon is not None else 'null'}, {ts(iss, 8)})")
w("  insert into invoices(business_id, contact_id, quote_id, number, title, amount, paid, issued_on, due_on, paid_on, created_at) values\n" + ",\n".join(rows) + ";\n")

# ---------------- message history (what the chase engine already did) ----------------
msgs = []
def out_msg(kind, ref, contact, step, channel, subject, body, when):
    msgs.append(f"  (b, {C(contact)}, {q(kind)}, {ref}, {step}, 'out', {q(channel)}, 'sent', {q(subject)}, {q(body)}, {when}, {when})")
def in_msg(kind, ref, contact, channel, body, when):
    msgs.append(f"  (b, {C(contact)}, {q(kind)}, {ref}, null, 'in', {q(channel)}, 'received', null, {q(body)}, {when}, {when})")

inv_steps = [(-3, "email", "Heads-up before due"), (1, "email", "Gentle reminder"), (7, "sms", "Text reminder"), (14, "email", "Firm reminder"), (30, "email", "Final notice")]
def chase_inv(num, contact, due, upto):
    for idx, (d, ch, label) in enumerate(inv_steps):
        if due + d <= upto:
            out_msg("invoice", I(num), contact, idx, ch, None if ch == "sms" else f"{label}: invoice {num}", f"{label} for invoice {num}.", ts(due + d, 9))
chase_inv("INV-1205", "Luis Marquez", -9, 0)
chase_inv("INV-1197", "Dana Kessler", -22, 0)
chase_inv("INV-1191", "Victor Delgado", -46, 0)
chase_inv("INV-1188", "Ruth Fairbanks", -58, 0)
chase_inv("INV-1176", "Helen Whitfield", -81, 0)
chase_inv("INV-1162", "Owen Price", -110, 0)
chase_inv("INV-1201", "Chidi Okafor", -25, 0)
for num, title, c, qn, amt, paid, iss, due, pon in inv:
    if pon is not None and pon > due - 3 and paid == amt:
        chase_inv(num, c, due, pon)
in_msg("invoice", I("INV-1205"), "Luis Marquez", "sms", "Sorry about that! Paycheck hits Friday, I'll pay the full amount then.", ts(-1, 18.5))
in_msg("invoice", I("INV-1201"), "Chidi Okafor", "email", "Hi Renata, we sent the first half. Can we split the remaining $4,900 over two months?", ts(-5, 20))

q_steps = [(2, "email", "Friendly check-in"), (5, "sms", "Short text nudge"), (9, "email", "Hold the price"), (14, "email", "Close the loop")]
def chase_q(num, contact, sent, upto):
    for idx, (d, ch, label) in enumerate(q_steps):
        if sent + d <= upto:
            out_msg("quote", Q(num), contact, idx, ch, None if ch == "sms" else f"{label}: {num}", f"{label} for quote {num}.", ts(sent + d, 10))
chase_q("Q-2101", "Claire Moreau", -6, -1)
chase_q("Q-2098", "David Chen", -10, -2)
chase_q("Q-2095", "Nadia Farouk", -15, -2)
chase_q("Q-2085", "Marco Gallo", -45, -31)
chase_q("Q-2088", "Kate Brennan", -40, -34)
in_msg("quote", Q("Q-2101"), "Claire Moreau", "sms", "Thanks! Could you do $9,000 if we book for next week?", ts(-1, 12.2))
in_msg("quote", Q("Q-2085"), "Marco Gallo", "email", "Appreciate it, but we went with a lower bid this time.", ts(-30, 11))

w("  insert into messages(business_id, contact_id, subject_type, subject_id, step, direction, channel, status, subject, body, due_at, sent_at) values\n" + ",\n".join(msgs) + ";\n")

acts = [
 ("quote", Q("Q-2101"), "viewed", "Customer opened the quote (3 times)", ts(-1, 21)),
 ("quote", Q("Q-2098"), "viewed", "Customer opened the quote", ts(-9, 19)),
 ("quote", Q("Q-2071"), "accepted", "Accepted online by Anil Patel", ts(-92, 12)),
 ("quote", Q("Q-2088"), "accepted", "Accepted online by Kate Brennan", ts(-33, 12)),
 ("quote", Q("Q-2083"), "accepted", "Accepted online by Chidi Okafor", ts(-50, 12)),
 ("quote", Q("Q-2064"), "accepted", "Accepted online by Helen Whitfield", ts(-104, 12)),
 ("quote", Q("Q-2091"), "declined", "Declined online", ts(-20, 12)),
 ("invoice", I("INV-1201"), "payment", "Payment received: $4,900.00", ts(-23, 15)),
 ("lead", L("Second story always too hot"), "note", "Called back, site visit booked for Thursday 10am", ts(-4, 8.2)),
 ("lead", L("Yearly maintenance plan"), "note", "Sent plan options by email", ts(-6, 13.5)),
]
w("  insert into activities(business_id, subject_type, subject_id, kind, body, created_at) values\n" + ",\n".join(
    f"  (b, {q(t)}, {r}, {q(k)}, {q(bd)}, {when})" for t, r, k, bd, when in acts) + ";\n")
w("end $$;\nrevoke all on function public.seed_demo(uuid) from public, anon, authenticated;\n")

# Members of a demo workspace can reset it; a nightly job resets all demos.
w("""
create or replace function public.reset_demo(b uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from businesses where id = b and is_demo) then raise exception 'not a demo workspace'; end if;
  if not public.is_member(b) then raise exception 'not a member'; end if;
  perform public.seed_demo(b);
  update businesses set sending_enabled = false where id = b;
end $$;
revoke all on function public.reset_demo(uuid) from public, anon;
grant execute on function public.reset_demo(uuid) to authenticated;

create or replace function public.reset_all_demos() returns void
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in select id from businesses where is_demo loop
    perform public.seed_demo(r.id);
  end loop;
end $$;
revoke all on function public.reset_all_demos() from public, anon, authenticated;
""")
open("supabase/03_seed.sql", "w").write("".join(out))
print("written", sum(len(x) for x in out))
