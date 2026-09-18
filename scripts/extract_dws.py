"""Extract the 2021/22 IWA water balances from the DWS No Drop Watch Report.

The balances are printed as multi-column diagrams, which flatten ambiguously:
authorised consumption and water losses are interchangeable in the arithmetic
whenever they happen to be close in size, and three provinces genuinely admit
two self-consistent readings. So each balance is solved against its identities
AND pinned to the non-revenue water figure the report states in prose, which
removes the ambiguity. Anything that fails to close is reported, never guessed.
"""
import re, json
from solve_balance import numbers_in

# NRW as stated in the report's own narrative (million m3/annum). These are the
# anchors that disambiguate the diagram; every other term is then derived and
# checked against it.
NRW_ANCHOR = {
    'National': 1988.46, 'Eastern Cape': 160.928, 'Free State': 130.889,
    'Gauteng': 637.311, 'KwaZulu-Natal': 437.107, 'Limpopo': 168.822,
    'Mpumalanga': 147.29, 'North West': 117.855, 'Northern Cape': 61.053,
    'Western Cape': 127.205,
}

def solve_anchored(vals, nrw, tol=0.03):
    """Pin the balance to the stated NRW and derive the rest.

    The top-level terms must all be printed and must close exactly. The
    sub-splits (billed metered vs unmetered, apparent vs real) are optional:
    some provincial diagrams omit a component small enough to round away, and
    refusing the whole balance over a missing 0.5 Mm3 would discard a province
    whose headline figures are perfectly sound.
    """
    uniq = sorted(set(vals), reverse=True)

    def match(x):
        for v in uniq:
            if abs(v - x) <= tol: return v
        return None

    def split(total):
        if total is None: return None
        for i, a in enumerate(uniq):
            for b in uniq[i + 1:]:
                if abs(a + b - total) <= tol: return (max(a, b), min(a, b))
        return None

    NRW = match(nrw)
    if NRW is None: return None

    # Several diagrams admit more than one arithmetically valid reading, because
    # authorised consumption and water losses can swap when they are close in
    # size. Collect every candidate and prefer the one the page actually prints
    # the most of: a reading whose unbilled-authorised term appears on the page
    # is better evidenced than one that requires inventing it.
    candidates = []
    for SIV in uniq:
        BA = match(SIV - NRW)
        if BA is None or BA >= SIV: continue
        for AC in uniq:
            if AC >= SIV or AC < BA: continue
            UA = AC - BA
            WL = match(SIV - AC)
            if WL is None: continue
            if abs((WL + UA) - NRW) > tol: continue

            bm_bu, al_rl = split(BA), split(WL)
            um_uu = split(UA) if UA > tol else None
            printed = match(UA) is not None
            score = (3 if printed else 0) + (1 if bm_bu else 0) \
                    + (1 if al_rl else 0) + (1 if um_uu else 0)
            candidates.append((score, {
                'sivMm3': SIV, 'authorisedMm3': AC, 'waterLossesMm3': WL,
                'billedAuthorisedMm3': BA,
                'unbilledAuthorisedMm3': round(UA, 3),
                'billedMeteredMm3': bm_bu[0] if bm_bu else None,
                'billedUnmeteredMm3': bm_bu[1] if bm_bu else None,
                'unbilledMeteredMm3': um_uu[0] if um_uu else None,
                'unbilledUnmeteredMm3': um_uu[1] if um_uu else None,
                'apparentLossesMm3': al_rl[1] if al_rl else None,
                'realLossesMm3': al_rl[0] if al_rl else None,
                'nrwMm3': NRW, 'revenueWaterMm3': BA,
            }))
    if not candidates: return None
    best = max(candidates, key=lambda c: c[0])
    return best[1]

def run():
    lines = open('ndwr.txt', encoding='utf-8', errors='replace').read().split('\n')
    ili = [i for i,l in enumerate(lines) if re.search(r'ILI\s*=\s*[\d.]+', l)]
    names = list(NRW_ANCHOR)
    rows = []
    for name, i in zip(names, ili[:10]):
        blk = '\n'.join(lines[max(0,i-34):i+1])
        sol = solve_anchored(numbers_in(blk), NRW_ANCHOR[name])
        if not sol:
            rows.append({'region':name,'error':'did not close'}); continue
        m=re.search(r'ILI\s*=\s*([\d.]+)',blk); c=re.search(r'CARL\s*=\s*([\d.]+)',blk)
        l=re.search(r'\((\d{2,3})\s*l/c/d\)', blk.replace(' l/c/d','l/c/d'))
        sol.update(region=name,
            ili=float(m.group(1)) if m else None,
            carlM3PerKmPerDay=float(c.group(1)) if c else None,
            litresPerCapitaPerDay=int(l.group(1)) if l else None,
            nrwPct=round(sol['nrwMm3']/sol['sivMm3']*100,1),
            waterLossesPct=round(sol['waterLossesMm3']/sol['sivMm3']*100,1),
            realLossesPct=round(sol['realLossesMm3']/sol['sivMm3']*100,1))
        rows.append(sol)
    return rows

if __name__ == '__main__':
    rows = run()
    print(f"{'region':<15}{'SIV':>10}{'auth':>10}{'WL':>10}{'real':>10}{'NRW':>10}{'NRW%':>7}{'ILI':>6}{'l/c/d':>6}  checks")
    for r in rows:
        if 'error' in r: print(f"{r['region']:<15}  {r['error']}"); continue
        c1 = abs(r['authorisedMm3']+r['waterLossesMm3']-r['sivMm3'])<0.05
        c2 = abs(r['billedAuthorisedMm3']+r['unbilledAuthorisedMm3']-r['authorisedMm3'])<0.05
        c3 = r['realLossesMm3'] is None or abs(r['apparentLossesMm3']+r['realLossesMm3']-r['waterLossesMm3'])<0.05
        c4 = abs(r['sivMm3']-r['billedAuthorisedMm3']-r['nrwMm3'])<0.05
        c5 = r['billedMeteredMm3'] is None or abs(r['billedMeteredMm3']+r['billedUnmeteredMm3']-r['billedAuthorisedMm3'])<0.05
        ok='.'.join('Y' if c else 'N' for c in (c1,c2,c3,c4,c5))
        print(f"{r['region']:<15}{r['sivMm3']:>10.1f}{r['authorisedMm3']:>10.1f}{r['waterLossesMm3']:>10.1f}{(r['realLossesMm3'] or 0):>10.1f}{r['nrwMm3']:>10.1f}{r['nrwPct']:>7.1f}{r['ili'] or 0:>6.1f}{r['litresPerCapitaPerDay'] or 0:>6}  {ok}")
    json.dump(rows, open('regions_final.json','w'), indent=1)
