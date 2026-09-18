# Sluice

Non-revenue water intelligence for South African municipalities — minimum night flow
leak detection, the IWA standard water balance, and Infrastructure Leakage Index
benchmarking across a metered distribution network.

Built with React, TypeScript, Vite and Tailwind CSS. No backend: the analysis engine is
pure TypeScript and the network data is generated deterministically, so the project runs
anywhere `npm install` does.

---

## The problem

South Africa loses roughly **47% of its municipal water** before anyone pays for it. The
global average is nearer 30%. That gap is not a drought — it is leaking pipes, faulty
meters, and connections nobody is billing, and it is the reason Gauteng now has water
shedding to go with its load shedding. The country also uses about 218 litres per person
per day against a world average near 173, and a large part of that difference never
reaches a person at all.

The frustrating part is that the water is already paid for. It has been abstracted,
treated, pumped and pressurised, and then it runs into the ground. A kilolitre recovered
from a leak is a kilolitre that does not have to be bought, and it is available now
rather than after a decade of building new supply.

The obstacle is usually not willingness. It is that a municipality cannot act on a number
it does not have: which zone is leaking, how much of that leak is worth chasing, and
whether the crew sent out on Monday will recover more than it costs to send them.

Sluice computes those three things.

## What it does

**Finds the leak without digging.** Between 02:00 and 04:00 almost nobody uses water, so
most of what still moves through a zone's bulk meter is running into the ground.
Subtracting an allowance for genuine night use leaves the leakage rate, which scales to a
daily volume through the Night-Day Factor.

**Compares zones fairly.** Ranking by "percentage of water lost" quietly punishes whoever
serves the poorest area — where people use very little, a modest leak looks catastrophic,
while the same leak hides inside a wealthy suburb's larger denominator. The Infrastructure
Leakage Index compares a zone's losses against what that zone would still lose if it were
run to a technical ideal: a function of pipe length, connection count and pressure, not
of consumption.

**Separates two very different failures.** Apparent losses are water somebody used and
nobody billed — a metering and enforcement problem, lost at retail tariff. Real losses
never reached a customer at all — a pipes problem, valued at what it cost to produce.
A single non-revenue water percentage treats them as the same thing, and sends the wrong
crew.

**Ranks the work by payback, not by volume.** A large zone can leak a great deal and still
sit near its unavoidable minimum, with nothing left to find. A small zone at ILI 12 is
full of leaks a crew could walk onto in a morning, and costs a fraction as much to survey.

**Turns kilolitres into days.** Reservoir drawdown is projected against the level at which
the reservoir can no longer hold up system pressure — not against empty. That distinction
is why a suburb's taps run dry while there is still water in the reservoir, and why the
high-lying streets always go first.

## The methods

Everything is implemented in `src/engine/`, as pure functions with no React in sight.

### Minimum night flow — `nightFlow.ts`

```
net night flow  = minimum night flow − (connections × night-use allowance)
daily leakage   = net night flow × Night-Day Factor
```

The allowance defaults to the IWA domestic figure of 1.7 l/connection/h. The Night-Day
Factor is 21 rather than a round 24, because leakage is pressure-driven and pressure sags
under daytime demand — a leak passes less water at noon than at 03:00. Scaling by a flat
24 hours overstates the day.

The module also models pressure management, `L₁/L₀ = (P₁/P₀)^N1`. Halving pressure does
not halve leakage: rigid mains behave like orifices (N1 ≈ 0.5) while plastic pipe flexes
open under pressure (N1 up to 1.5). This is why pressure management is the cheapest
intervention available — no excavation, and the saving lands across every undetected leak
at once.

**Where the method breaks, it says so.** The 02:00–04:00 convention encodes an assumption
about domestic behaviour that does not hold everywhere. An industrial zone's demand
collapses when the last shift ends, so its true minimum can land in the early evening, and
the night-window reading then contains a full shift's worth of nothing plus leakage at the
highest pressure of the day — which reads as a bigger leak than the zone has. Rather than
silently widening the window or reporting a number that is quietly wrong, the analysis
flags the zone and carries that flag through to the repair queue, where it would otherwise
send a crew to the wrong place.

### IWA water balance — `waterBalance.ts`

```
System Input
├── Authorised Consumption
│   ├── Billed Authorised      → Revenue Water
│   └── Unbilled Authorised    ┐
└── Water Losses               ├─→ Non-Revenue Water
    ├── Apparent Losses        │
    └── Real Losses            ┘
```

Real losses are the residual — the term nobody measures directly. That is both correct
(the balance has to close) and a warning: every measurement error upstream accumulates
there, so a real-losses figure is only ever as good as the bulk meter that produced the
system input volume.

### Infrastructure Leakage Index — `ili.ts`

```
UARL = (18·Lm + 0.8·Nc + 25·Lp) × P        litres/day
ILI  = current real losses ÷ UARL
```

`Lm` mains length (km), `Nc` service connections, `Lp` private pipe length (km), `P`
average pressure (m). Banded to the World Bank Institute scale for developing countries,
which is deliberately more forgiving than the developed-country one.

### Drawdown and prioritisation — `drawdown.ts`, `prioritise.ts`

Reservoir projection counts down to the pressure-failure level, and models what recovering
a share of the leak buys. The repair queue prices a survey campaign per zone, computes the
volume sitting above a realistic target ILI, and sorts by payback period.

## The data is synthetic, and that is deliberate

**Thuso Metropolitan Municipality does not exist.** Every meter reading, billing figure
and reservoir level is generated from a fixed seed, so the network is identical on every
load.

What is not invented is the shape of it. The ten zones span the range a real South African
metro contains — 1960s cast iron under a CBD at 72 m of head, post-2010 subsidised
housing, an informal settlement on standpipes, an industrial park — and the losses are
scaled so the municipality lands where the metros actually report, against a national
figure near 47%.

The generator injects a leak of a **known size** into each zone and hides it inside a
realistic demand curve, with pressure that sags under daytime load. The test suite then
asserts that the night flow analysis finds it again, within 12%:

```
TC-01   estimated 1 402 kL/d   true 1 392   error  +0.8%
KG-04   estimated 1 746 kL/d   true 1 776   error  −1.7%
NF-01   estimated   627 kL/d   true   624   error  +0.5%
```

That check is only possible because the data is synthetic. On a real network nobody knows
the true leakage — which is precisely why the method exists.

One consequence worth stating: building the demand curve from a published *inflow* profile
would double-count the leak, because a metered inflow trace never falls as far at 03:00 as
consumption alone does — leakage is holding it up. The generator models consumption and
leakage separately for exactly this reason.

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 41 tests across the engine and the pipeline
npm run build      # typecheck + production bundle
```

## Layout

```
src/
├── engine/          the analysis, as pure functions
│   ├── nightFlow.ts     minimum night flow, pressure-leakage response
│   ├── waterBalance.ts  IWA standard balance
│   ├── ili.ts           UARL, ILI, recoverable losses
│   ├── drawdown.ts      reservoir projection
│   └── prioritise.ts    repair queue ranking
├── data/            the fictional network and its telemetry generator
├── state/           derived model, computed once and shared
├── components/      charts and UI primitives (SVG, no chart library)
├── pages/           control room, zone detail, balance, queue, reservoirs, method
└── lib/             en-ZA number and unit formatting
```

## Notes on the interface

Assumptions are editable on the Method page rather than buried, because the outputs are
less certain than a dashboard usually admits — the leakage estimate alone swings by a
fifth across the accepted range of the Night-Day Factor. Changing one moves the whole
dashboard.

Logged repairs are credited against the zone's night flow, which is how the work is
verified in the field: re-run the step test after the job and measure how far the MNF
dropped. Log one and the zone's leakage, ILI, band and cost figures all move to match.
Repairs and assumptions persist in `localStorage`.

Charts are hand-rolled SVG. The flow profile needed the night window marked and the
leakage band drawn underneath the demand curve, which is the one thing that makes the
argument visually, and no chart library does it off the shelf.

## Licence

MIT.
