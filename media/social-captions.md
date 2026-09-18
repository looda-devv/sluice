# Sluice — social captions

Live: https://sluice-five.vercel.app
Code: https://github.com/looda-devv/sluice

---

## LinkedIn (long form)

South Africa loses **46.4% of its municipal water** before anyone pays for it.

Not to drought. To leaking pipes, faulty meters, and connections nobody is
billing. That's 1 988 million cubic metres a year — roughly **R20 billion** of
water we abstracted, treated, pumped and pressurised, and then lost into the
ground. The global average is nearer 30%.

So I built Sluice: a tool that takes the Department of Water and Sanitation's
own published figures and analyses them with the methods the water sector
actually uses — the IWA water balance, the Infrastructure Leakage Index, and
minimum night flow leak detection.

**The finding that changed how I think about this**

We usually rank municipalities by "percentage of water lost". That metric is
quietly unfair, and it sends money to the wrong places.

Limpopo loses a larger share of its water than Gauteng — 56.7% against 41.9% —
so on that number it looks like the worse-run province. It isn't. Limpopo's
Infrastructure Leakage Index is 5.7 against Gauteng's 7.9. Relative to the
network it actually has to keep watertight, Limpopo leaks materially less.

The difference is consumption. Gauteng uses 253 litres per person per day,
Limpopo 210. The same leak hides inside a bigger denominator on the Highveld.

A percentage measures loss against demand. The ILI measures it against pipe
length, connection count and pressure — the things that actually determine how
much a network leaks. Rank by percentage and the provinces serving the poorest,
most sparsely connected populations look worst and attract the intervention.
Rank by index and the money follows the leaks.

**The part that took the longest**

The data is public, but it is not usable. The water balances are printed as
multi-column diagrams inside a PDF. Flatten them to text and the columns
interleave, so a value lands on the same line as a label it has nothing to do
with. Read it by position and you get numbers that look completely plausible
and are wrong.

A water balance is over-determined, though — six identities constrain thirteen
quantities. So instead of parsing, I take every number printed on the page and
solve for the assignment that satisfies all of them.

That still wasn't enough. Where authorised consumption and water losses are
close in size, they can swap places without breaking a single identity. Three
provinces genuinely admit two valid readings, and my first run had Limpopo,
Mpumalanga and North West inverted. It looked perfect. I only caught it by
checking the output against the report's own narrative.

Two things now prove the extraction: every balance closes on all six identities,
and the nine provinces independently reconstitute the published national totals
to within a thousandth of a percent.

**On being honest about data**

Three inconsistencies exist in the source itself. I surface them rather than
quietly fixing them — the Northern Cape's balance doesn't close by 0.59 Mm³, and
the app says so in a banner on that page.

Thirty of the 144 authorities submitted nothing at all. Their score is null, not
zero, and they're excluded from averages. Failing to report is not the same as
performing badly, and charting it as a zero would assert something the data
does not support.

And where the public data runs out, I say so. Hourly bulk-meter telemetry —
what minimum night flow analysis actually needs — lives in each municipality's
SCADA system and is published by nobody. So that section is clearly marked as a
worked example on a modelled network, in its own part of the navigation. It
earns its place because a modelled network is the only way to test the method
against a known answer: the generator hides a leak of known size in a realistic
demand curve, and the test suite asserts the analysis finds it again within 12%.

Built with React, TypeScript, Vite and Tailwind. The analysis engine is pure
TypeScript with no backend, the charts are hand-rolled SVG, and the extraction
is Python. 67 tests, including ones that assert the extracted figures match the
counts and tables the reports publish.

Live: https://sluice-five.vercel.app
Code: https://github.com/looda-devv/sluice

Sources: DWS No Drop Watch Report (2021/22 balances) and the 2023 No Drop Report
(assessment of all 144 water services authorities).

#SouthAfrica #WaterCrisis #NonRevenueWater #CivicTech #DataEngineering
#TypeScript #React #OpenData #WaterSecurity

---

## X / Twitter (thread)

**1/**
South Africa loses 46.4% of its municipal water before anyone pays for it.

Not drought — leaking pipes, faulty meters, unbilled connections.

~R20 billion a year, treated and pumped and lost into the ground.

So I built a tool to analyse it 🧵

**2/**
Sluice takes the Dept of Water & Sanitation's published data — all 144 water
services authorities, all 9 provinces — and runs it through the methods the
sector actually uses: IWA water balance, Infrastructure Leakage Index, minimum
night flow.

**3/**
The finding that surprised me:

Limpopo loses a bigger % of its water than Gauteng (56.7% vs 41.9%).

But Limpopo's leakage index is 5.7 vs Gauteng's 7.9 — relative to the network
it has to maintain, Limpopo leaks LESS.

**4/**
Why? Consumption.

Gauteng uses 253 l/person/day, Limpopo 210. The same leak hides inside a bigger
denominator.

Rank by % and the provinces serving the poorest populations look worst and
attract the intervention. Rank by index and the money follows the leaks.

**5/**
The data is public but unusable. Water balances are printed as multi-column
diagrams in a PDF. Flatten to text and columns interleave — read by position
and you get numbers that look right and are wrong.

**6/**
A water balance is over-determined: 6 identities, 13 quantities.

So I stopped parsing and started solving — take every number on the page, find
the assignment satisfying all six.

**7/**
That wasn't enough either. Authorised consumption and water losses can swap
without breaking any identity.

My first run had 3 provinces inverted. It looked perfect. Caught it only by
checking against the report's own prose.

**8/**
Proof it's right: every balance closes, and the 9 provinces independently
reconstitute the published national totals to within 0.001%.

**9/**
On honesty: 3 inconsistencies exist in the source. I surface them instead of
fixing them quietly.

30 authorities submitted nothing — their score is null, not 0. Failing to
report ≠ performing badly.

**10/**
And where public data runs out, I say so. Hourly meter telemetry isn't
published by anyone, so that section is explicitly a worked example on a
modelled network — which is also the only way to test the method against a
known answer.

**11/**
React + TypeScript + Vite + Tailwind. Pure-TS analysis engine, hand-rolled SVG
charts, Python extraction. 67 tests.

Live: https://sluice-five.vercel.app
Code: https://github.com/looda-devv/sluice

---

## Short version (Instagram / general)

South Africa loses 46.4% of its municipal water before anyone pays for it —
about R20 billion a year, lost to leaking pipes and faulty meters rather than
drought.

I built Sluice to analyse the Department of Water and Sanitation's published
data for all 144 water services authorities, using the methods the water sector
actually uses.

The thing I didn't expect: ranking municipalities by "percentage of water lost"
quietly punishes the ones serving the poorest areas. Limpopo loses a bigger
share than Gauteng but runs a measurably better network — the same leak just
hides inside a bigger denominator where people use more water.

Getting the data out was harder than analysing it. The figures are printed as
multi-column diagrams in a PDF, so I had to solve each water balance against
its own identities rather than read it off the page.

Live: https://sluice-five.vercel.app
Code: https://github.com/looda-devv/sluice

#SouthAfrica #WaterCrisis #CivicTech #OpenData

---

## Notes on posting

- The video is a silent screen recording — add captions if posting to a feed
  that autoplays muted.
- Best single stat to lead with: **46.4%**, or **R20 billion a year**.
- The Limpopo/Gauteng comparison is the most discussion-worthy point; it's the
  one likely to draw replies from people in the sector.
- Every figure quoted is from the DWS reports and is reproduced in the app with
  a link to the source PDF, so the claims are defensible if challenged.
