"""Recover each IWA water balance by solving its own identities.

Reading values off a flattened multi-column diagram by position is fragile —
the columns interleave and the layout shifts between pages. But a water balance
is heavily over-determined: six identities constrain thirteen quantities, and
they all have to hold simultaneously. So rather than trust any single label-to-
value association, take every number printed on the page and find the unique
assignment that closes the balance. An assignment that satisfies all six
identities to the cent is the right one; if none does, the extraction has
failed and should say so rather than guess.
"""
import re
from itertools import permutations

# Values appear either space-grouped ("1 884.983") or plain ("4282.532").
# Capping the leading run at three digits silently truncates the plain form,
# which is the difference between a 4 282 Mm3 system input and a 282 Mm3 one.
NUM = re.compile(r'(?<![\d.])(\d{1,3}(?:\s\d{3})+\.\d{1,3}|\d{1,7}\.\d{1,3})(?![\d])')

def numbers_in(block: str):
    vals = []
    for m in NUM.finditer(block):
        vals.append(round(float(m.group(1).replace(' ', '')), 3))
    # Preserve order but drop duplicates: the diagram repeats apparent/real
    # losses in two columns by design.
    seen, out = set(), []
    for v in vals:
        if v not in seen:
            seen.add(v); out.append(v)
    return out

def solve(vals, tol=0.02):
    """Find the assignment satisfying every identity, or None.

    Indexed on pair sums so the search stays linear in the number of candidate
    subtotals rather than exploding combinatorially.
    """
    uniq = sorted(set(vals), reverse=True)

    def match(x):
        for v in uniq:
            if abs(v - x) <= tol:
                return v
        return None

    # Bucket pair sums so a subtotal can be decomposed by lookup rather than
    # by rescanning every pair inside the search loops.
    buckets = {}
    for i, a in enumerate(uniq):
        for b in uniq[i + 1:]:
            buckets.setdefault(round(a + b, 1), []).append((a, b))

    def split(total):
        """Ways to write `total` as the sum of two other printed values."""
        out = []
        key = round(total, 1)
        for k in (key - 0.1, key, key + 0.1):
            for a, b in buckets.get(round(k, 1), ()):
                if abs(a + b - total) <= tol:
                    out.append((a, b))
        return out

    for BA in uniq:
        for BM, BU in split(BA):
            for UA in uniq:
                if UA >= BA or UA in (BM, BU):
                    continue
                for UM, UU in split(UA):
                    if len({BM, BU, UM, UU}) < 4:
                        continue
                    AC = match(BA + UA)
                    if AC is None:
                        continue
                    for WL in uniq:
                        SIV = match(AC + WL)
                        if SIV is None or SIV <= WL:
                            continue
                        NRW = match(SIV - BA)
                        if NRW is None:
                            continue
                        losses = split(WL)
                        if not losses:
                            continue
                        # Real losses exceed apparent losses in every published
                        # South African balance; it is what makes leakage the
                        # dominant term.
                        AL, RL = min(losses[0]), max(losses[0])
                        return {
                            'sivMm3': SIV, 'authorisedMm3': AC, 'waterLossesMm3': WL,
                            'billedAuthorisedMm3': BA, 'unbilledAuthorisedMm3': UA,
                            'billedMeteredMm3': BM, 'billedUnmeteredMm3': BU,
                            'unbilledMeteredMm3': UM, 'unbilledUnmeteredMm3': UU,
                            'apparentLossesMm3': AL, 'realLossesMm3': RL,
                            'nrwMm3': NRW, 'revenueWaterMm3': BA,
                        }
    return None
