# Data extraction

The published figures in `src/data/dws/` come from two Department of Water and
Sanitation PDFs. These scripts are kept so the numbers can be traced back and
re-derived, not because the app runs them — the app ships the extracted values.

```bash
curl -O https://ws.dws.gov.za/iris/releases/NDWR.pdf          # No Drop Watch Report
curl -O https://ws.dws.gov.za/iris/releases/ND_2023_Report.pdf # 2023 No Drop Report
pdftotext -layout NDWR.pdf ndwr.txt
python3 extract_dws.py
```

## Why a solver rather than a parser

The water balances are printed as multi-column diagrams. Flattened to text the
columns interleave, so a value sits on the same line as a label it has nothing
to do with, and reading by position produces numbers that look plausible and
are wrong.

A water balance is over-determined, though: six identities constrain thirteen
quantities. So `solve_balance.py` takes every number printed on the page and
searches for the assignment that satisfies all of them.

That alone is not quite enough. Where authorised consumption and water losses
happen to be close in size they can swap without breaking any identity, and
three provinces genuinely admit two valid readings. The report states
non-revenue water in prose for each region, so `extract_dws.py` pins the
solution to that figure, and prefers readings whose terms are actually printed
over ones requiring an unprinted subtotal.

## How the result was checked

- Every balance closes on all six IWA identities.
- The nine provinces sum to the published national totals for system input
  (4 282.5 Mm³) and non-revenue water (1 988.5 Mm³).
- Each page was then read directly to confirm the assignment.
- The 144 WSA records reproduce the report's own province counts and its
  Table 2 of top scorers exactly.

Two identities do not close in the source itself (North West's unbilled
components, Northern Cape's authorised consumption). These are carried through
as `publishedDiscrepancy` rather than corrected.
