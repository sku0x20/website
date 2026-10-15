#!/usr/bin/env python3
"""Job hunter: pull live postings from startup ATS boards + HN "Who is hiring",
keep the ones I can realistically land (India / remote-India, platform/SRE/backend),
score them, and suggest how to approach each one.

    python3 jh/jh.py            # full run, writes jh/out/jobs.md and jobs.csv
    python3 jh/jh.py --check    # only verify every board in companies.toml still resolves
"""
import argparse
import csv
import html
import json
import re
import sys
import time
import tomllib
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).parent
OUT = ROOT / "out"
UA = "jh/0.1 (personal job search)"

BOARD_URLS = {
    "greenhouse": "https://boards-api.greenhouse.io/v1/boards/{}/jobs?content=true",
    "lever": "https://api.lever.co/v0/postings/{}?mode=json",
    "ashby": "https://api.ashbyhq.com/posting-api/job-board/{}",
}

# --- what I'm a fit for -------------------------------------------------------

ROLE_STRONG = re.compile(r"platform|site reliability|\bsre\b|infrastructure|\binfra\b|devops|reliability|"
                         r"production engineer|cloud engineer|kubernetes|observability|systems engineer|"
                         r"networking|distributed systems|developer productivity|build and release", re.I)
ROLE_OK = re.compile(r"backend|back-end|back end|software engineer|\bswe\b|iot|embedded cloud|data infrastructure|"
                     r"golang|\bgo engineer|kotlin|java|database|storage|runtime|systems", re.I)
ROLE_NO = re.compile(r"manager|director|head of|\bvp\b|vice president|chief|intern\b|internship|new grad|"
                     r"sales|account exec|recruit|marketing|designer|support|customer success|solutions engineer|"
                     r"sales engineer|forward deployed|frontend|front-end|ios|android|mobile|ml researcher|"
                     r"research scientist|customer|legal|finance|counsel|people|talent|analyst|writer|advocate|hardware|mechanical|"
                     r"electrical|\brf\b|\bcad\b|test engineer|\bqa\b|\bit\b|partnership|full ?-?stack|"
                     r"vulnerability|trust & safety|geospatial", re.I)

INDIA = re.compile(r"\bindia\b|bengaluru|bangalore|hyderabad|\bpune\b|gurgaon|gurugram|noida|mumbai|chennai|"
                   r"\bdelhi\b|\bncr\b|\bblr\b|\bist\b", re.I)
BENGALURU = re.compile(r"bengaluru|bangalore|\bblr\b", re.I)
GLOBAL = re.compile(r"anywhere|global|worldwide|world-wide|\bapac\b|asia|any time ?zone|all time ?zones|"
                    r"fully distributed|work from anywhere", re.I)
REMOTE = re.compile(r"remote", re.I)
REGION = re.compile(r"\b(?:us|usa|u\.s\.?|united states|north america|americas|canada|eu|europe|uk|emea|latam|"
                    r"cet|cest|est|pst|pt|et|gmt|bst|utc ?-\d|germany|france|spain|nyc|sf|bay area)\b", re.I)
US_ONLY = re.compile(r"(?:us|u\.s\.|usa|united states|north america|americas|us/canada|canada|eu|europe|uk|emea|latam)"
                     r"[\s-]*(?:only|based|residents?)|remote\s*[(\-:,]\s*(?:us|u\.s\.|usa|united states|north america|"
                     r"americas|canada|eu|europe|uk|emea|latam)\b|authori[sz]ed to work in the (?:u\.?s|united states)|"
                     r"must (?:be located|reside|live) in the (?:u\.?s|united states)|us citizen|security clearance",
                     re.I)

# keyword -> weight; overlap with what's on my resume
STACK = {
    r"kubernetes|\bk8s\b": 4, r"\bhelm\b": 2, r"terraform|opentofu|infrastructure as code|\biac\b": 4,
    r"\bgcp\b|google cloud": 4, r"\baws\b|\beks\b": 2, r"docker|container": 2,
    r"\bgo\b|golang": 4, r"kotlin": 3, r"\bjava\b|\bjvm\b|spring": 3, r"\brust\b": 2, r"python": 1,
    r"clickhouse": 5, r"postgres": 2, r"mongodb": 2, r"redis": 2,
    r"grafana|loki|prometheus|victoriametrics|opentelemetry|observability": 4,
    r"ci/cd|github actions|gitops|deploy": 3, r"\blinux\b": 3, r"tcp|udp|networking|iptables|nftables|dns": 3,
    r"mtls|\btls\b|\bpki\b|zero trust": 2, r"incident|on-call|oncall|postmortem|\bslo\b": 3,
    r"grpc|protobuf|protocol buffers": 3, r"iot|devices?|fleet|firmware|telemetry": 4,
    r"high[- ]throughput|low[- ]latency|scale": 2, r"cost optimization|cost optimisation|finops": 2,
}

# which resume bullet to lead with, by what the posting talks about
HOOKS = [
    (r"clickhouse|analytics|data pipeline|telemetry|storage", "Moved device telemetry into ClickHouse, cut storage 95%+ (90 GB -> 3.7 GB), Go ingestion over gRPC."),
    (r"iot|devices?|fleet|firmware|hardware|edge", "Sole owner of cloud infra for 10,000+ IoT hubs / ~1M devices; custom UDP protocol built for 50k pps peaks."),
    (r"udp|tcp|networking|latency|throughput|real-?time|packet", "Maintain a custom UDP hub protocol for 50k pps peaks, tuned from kernel packet handling to allocation-free JVM decoding; in-kernel NAT64 for IPv6-only hubs."),
    (r"ci/cd|deploy|release|github actions|gitops|zero[- ]downtime", "Took a manually-SFTP'd legacy stack to automated CI/CD with blue-green, health-checked, auto-rollback zero-downtime releases."),
    (r"observability|monitoring|grafana|prometheus|loki|opentelemetry|logging", "Replaced log files on prod boxes with Grafana + Loki + VictoriaMetrics; built an mTLS log reader so nobody needs prod SSH."),
    (r"incident|on-call|reliability|sre|outage|postmortem", "Root-caused recurring outages: FD limits blocking threads/SSH, leaking MongoDB connections, stale Redis pub/sub silently dropping messages."),
    (r"terraform|gcp|google cloud|iac|cloud", "Administer GCP end to end; moved the marketing site into its own Terraform-managed project, cut compute with 3-year CUDs."),
    (r"mongodb|postgres|database|migration", "Zero-downtime move of images out of MongoDB into GCS: DB shrank 54x, memory down 89%."),
]

LOCATION_PTS = {"bengaluru": 30, "india": 25, "global": 22, "remote?": 10}
STAGE_PTS = {"seed": 4, "A": 6, "B": 6, "C": 5, "late": 1, "unknown": 2}


# --- fetching -----------------------------------------------------------------

def get_json(url, timeout=20):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.load(r)


def strip_html(s):
    s = html.unescape(s or "")
    s = re.sub(r"<(br|p|li|div|h\d)[^>]*>", "\n", s, flags=re.I)
    s = re.sub(r"<[^>]+>", " ", s)
    return re.sub(r"[ \t]+", " ", html.unescape(s)).strip()


def parse_ts(v):
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return datetime.fromtimestamp(v / 1000, timezone.utc)
    try:
        return datetime.fromisoformat(v.replace("Z", "+00:00"))
    except ValueError:
        return None


def fetch_board(c):
    data = get_json(BOARD_URLS[c["ats"]].format(c["slug"]))
    jobs = []
    if c["ats"] == "greenhouse":
        for j in data["jobs"]:
            locs = [(j.get("location") or {}).get("name", "")] + [o.get("location") or o.get("name", "") for o in j.get("offices", [])]
            jobs.append(dict(title=j["title"], locations=[l for l in locs if l], url=j["absolute_url"],
                             posted=parse_ts(j.get("first_published") or j.get("updated_at")),
                             text=strip_html(j.get("content"))))
    elif c["ats"] == "lever":
        for j in data:
            cat = j.get("categories") or {}
            locs = cat.get("allLocations") or [cat.get("location", "")]
            if j.get("workplaceType") == "remote":
                locs = locs + ["Remote"]
            text = " ".join([j.get("descriptionPlain", ""), j.get("additionalPlain", "")] +
                            [strip_html(x.get("text", "") + " " + x.get("content", "")) for x in j.get("lists", [])])
            jobs.append(dict(title=j["text"], locations=[l for l in locs if l], url=j["hostedUrl"],
                             posted=parse_ts(j.get("createdAt")), text=text))
    else:
        for j in data["jobs"]:
            if j.get("isListed") is False:
                continue
            locs = [j.get("location", "")] + [s.get("location", "") for s in j.get("secondaryLocations") or []]
            if j.get("isRemote") or j.get("workplaceType") == "Remote":
                locs.append("Remote")
            jobs.append(dict(title=j["title"], locations=[l for l in locs if l], url=j["jobUrl"],
                             posted=parse_ts(j.get("publishedAt")), text=j.get("descriptionPlain") or ""))
    for j in jobs:
        j.update(company=c["name"], stage=c.get("stage", "unknown"), source=c["ats"], email=None)
    return jobs


ATS_LINK = [
    ("greenhouse", re.compile(r"greenhouse\.io/embed/job_board(?:/js)?\?for=([\w-]+)")),
    ("greenhouse", re.compile(r"(?:boards|job-boards)\.greenhouse\.io/(?!embed)([\w-]+)")),
    ("lever", re.compile(r"jobs\.lever\.co/([\w-]+)")),
    ("ashby", re.compile(r"jobs\.ashbyhq\.com/([\w.-]+)")),
]
EMAIL = re.compile(r"[\w.+-]+(?:@|\s*[\[(]at[\])]\s*)[\w-]+(?:\.|\s*[\[(]dot[\])]\s*)[\w.-]+", re.I)


def fetch_hn():
    """Latest 'Who is hiring?' thread -> (jobs, discovered ATS boards)."""
    hits = get_json("https://hn.algolia.com/api/v1/search_by_date?tags=story,author_whoishiring&hitsPerPage=10")["hits"]
    story = next(h for h in hits if h["title"].startswith("Ask HN: Who is hiring"))
    thread = get_json(f"https://hn.algolia.com/api/v1/items/{story['objectID']}", timeout=60)
    jobs, boards = [], set()
    for c in thread["children"]:
        raw = html.unescape(c.get("text") or "")
        if not raw:
            continue
        for ats, rx in ATS_LINK:
            boards.update((ats, m) for m in rx.findall(raw))
        first, _, rest = raw.partition("<p>")
        first, _, body = strip_html(first).partition("\n")
        text = body + "\n" + strip_html(rest)
        parts = [p.strip() for p in re.split(r"\s+[|\u2014\u2013]\s+|\s*\|\s*", first) if p.strip()]
        company = parts[0][:60] if parts else "?"
        roles = [p for p in parts[1:] if (ROLE_STRONG.search(p) or ROLE_OK.search(p)) and not ROLE_NO.search(p)]
        if not roles:
            continue
        title = " / ".join(roles)
        email = EMAIL.search(text)
        jobs.append(dict(title=title, locations=[first], url=f"https://news.ycombinator.com/item?id={c['id']}",
                         posted=parse_ts(c.get("created_at")), text=first + "\n" + text, company=company,
                         stage="unknown", source="hn", email=email.group(0) if email else None))
    return jobs, boards, story["title"]


# --- scoring ------------------------------------------------------------------

def location_class(job):
    """Best location bucket I qualify for, or None if not eligible.

    A remote flag next to concrete non-India places means remote *within* those places, so it doesn't count.
    """
    locs = job["locations"] or [""]
    if any(BENGALURU.search(l) for l in locs):
        return "bengaluru"
    if any(INDIA.search(l) for l in locs):
        return "india"
    if any(GLOBAL.search(l) for l in locs):
        return "global"
    if job["source"] == "hn":
        remote_parts = [p for p in locs[0].split("|") if REMOTE.search(p)]
        if not any(not re.sub(r"remote|first|friendly|only|full[- ]?time|\W", "", p, flags=re.I) for p in remote_parts):
            return None
    elif any(re.sub(r"remote|first|friendly|only|\W", "", l, flags=re.I) for l in locs):
        return None
    if US_ONLY.search(job["text"][:4000]):
        return None
    return "global" if INDIA.search(job["text"]) or GLOBAL.search(job["text"]) else "remote?"


def role_class(job):
    title = job["title"]
    if ROLE_NO.search(title):
        return None
    if ROLE_STRONG.search(title):
        return "strong"
    if ROLE_OK.search(title):
        return "ok"
    return None


def seniority_pts(job):
    pts = 0
    t = job["title"].lower()
    if re.search(r"senior|\bsr\.?\b|\bii\b|\biii\b|\bl3\b|\bl4\b", t):
        pts += 6
    if re.search(r"principal|distinguished", t):
        pts -= 8
    elif re.search(r"staff|architect", t):
        pts -= 4
    if re.search(r"junior|associate|\bi\b$|entry", t):
        pts -= 4
    if re.search(r"\blead\b", t):
        pts -= 2
    years = [int(y) for y in re.findall(r"(\d{1,2})\s*\+?\s*(?:-\s*\d+\s*)?years?\s+(?:of\s+)?(?:[\w-]+\s+){0,3}experience",
                                        job["text"], re.I) if int(y) < 20]
    if years:
        y = max(years)
        pts += 6 if y <= 5 else 2 if y <= 7 else -8
    return pts


def freshness_pts(job):
    if not job["posted"]:
        return 0
    days = (datetime.now(timezone.utc) - job["posted"]).days
    job["age_days"] = days
    return 12 if days <= 7 else 7 if days <= 14 else 3 if days <= 30 else -3 if days <= 60 else -10


def score(job):
    loc = location_class(job)
    role = role_class(job)
    if not loc or not role:
        return None
    hay = (job["title"] + " " + job["text"]).lower()
    stack_hits = [k for k in STACK if re.search(k, hay)]
    stack = min(25, sum(STACK[k] for k in stack_hits))
    s = (LOCATION_PTS[loc] + (25 if role == "strong" else 12) + seniority_pts(job) + stack
         + freshness_pts(job) + STAGE_PTS.get(job["stage"], 2) + (4 if job.get("email") else 0))
    job.update(score=max(0, min(100, s)), loc=loc, role=role,
               stack=[re.sub(r"\\b|[()?]", "", re.sub(r"\[[^]]*\]", " ", k)).split("|")[0] for k in stack_hits])
    return job


def approach(job):
    hay = (job["title"] + " " + job["text"]).lower()
    hits, hook = max((len(re.findall(rx, hay)), h) for rx, h in HOOKS)
    if not hits:
        hook = HOOKS[1][1]
    if job.get("email"):
        how = f"Email {job['email']} today. Subject: \"HN Who's Hiring: {job['title'][:50]}\". 4 lines: who I am, the hook, link to sku20.dev, ask for a call."
    elif job["source"] == "hn":
        how = "Reply to the HN comment or use the contact in the poster's HN profile today: who I am, the hook, sku20.dev. Then apply via their link."
    elif job["stage"] in ("seed", "A"):
        how = "Small team: skip the form. Find the founder/CTO (company site, LinkedIn, X) and email them the hook + one line on why their product. Then apply."
    elif job["stage"] in ("B", "C", "unknown"):
        how = "Apply, then within 24h DM the eng manager or a platform/infra engineer there on LinkedIn: 'applied for X, here's the one thing I'd bring' + ask for a referral."
    else:
        how = "Big ATS funnel: a referral is the only thing that beats it. Find a 1st/2nd-degree connection or ex-colleague there before applying."
    if job["loc"] in ("global", "remote?"):
        how += " Say up front: based in Bengaluru, happy to work via EOR/contractor, overlap with their core hours."
    return how, hook


# --- main ---------------------------------------------------------------------

def load_companies():
    return tomllib.loads((ROOT / "companies.toml").read_text())["company"]


def fetch_all(companies):
    jobs, dead = [], []

    def one(c):
        try:
            return c, fetch_board(c), None
        except Exception as e:
            return c, [], e

    with ThreadPoolExecutor(8) as ex:
        for c, js, err in ex.map(one, companies):
            if err:
                dead.append(f"{c['name']} ({c['ats']}/{c['slug']}): {err}")
            jobs += js
    return jobs, dead


def tier(s):
    return "High odds: act today" if s >= 70 else "Worth a shot" if s >= 55 else "Long shot"


def write_outputs(jobs, seen, hn_title, dead):
    OUT.mkdir(exist_ok=True)
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    lines = [f"# Jobs: {now}", "", f"{len(jobs)} matches. Sources: {len(set(j['company'] for j in jobs if j['source'] != 'hn'))} ATS boards + {hn_title}.",
             "Score = fit heuristic (location, role, seniority, stack overlap, freshness, stage), not a real probability.", ""]
    current = None
    for j in jobs:
        t = tier(j["score"])
        if t != current:
            lines += [f"## {t}", ""]
            current = t
        age = f"{j['age_days']}d ago" if "age_days" in j else "date ?"
        new = " **NEW**" if j["new"] else ""
        lines += [f"### {j['score']} · {j['title']} at {j['company']}{new}",
                  f"- {', '.join(j['locations'])[:120]} · {age} · stage {j['stage']} · {j['source']}",
                  f"- Matched: {j['loc']} location, {j['role']} role; stack: {', '.join(j['stack']) or '-'}",
                  f"- **Approach:** {j['how']}",
                  f"- **Lead with:** {j['hook']}",
                  f"- {j['url']}", ""]
    if dead:
        lines += ["## Dead boards (fix or remove in companies.toml)", ""] + [f"- {d}" for d in dead]
    (OUT / "jobs.md").write_text("\n".join(lines))

    with open(OUT / "jobs.csv", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["score", "new", "company", "stage", "title", "location", "age_days", "source", "email", "url", "approach", "hook"])
        for j in jobs:
            w.writerow([j["score"], j["new"], j["company"], j["stage"], j["title"], "; ".join(j["locations"]),
                        j.get("age_days", ""), j["source"], j.get("email") or "", j["url"], j["how"], j["hook"]])
    (OUT / "seen.json").write_text(json.dumps(seen, indent=1, sort_keys=True))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="only verify boards in companies.toml")
    ap.add_argument("--no-hn", action="store_true", help="skip HN Who is hiring + discovery")
    ap.add_argument("--max-age", type=int, default=60, help="drop postings older than N days")
    ap.add_argument("--min-score", type=int, default=40)
    ap.add_argument("--stages", default="seed,A,B,C,late,unknown", help="e.g. A,B,C to drop late-stage and HN/unknown")
    args = ap.parse_args()

    companies = load_companies()
    if args.check:
        _, dead = fetch_all(companies)
        print("\n".join(dead) or f"all {len(companies)} boards OK")
        return

    t0 = time.time()
    jobs, dead = fetch_all(companies)
    hn_title = "no HN"
    if not args.no_hn:
        try:
            hn_jobs, boards, hn_title = fetch_hn()
            jobs += hn_jobs
            known = {(c["ats"], c["slug"].lower()) for c in companies}
            extra = [dict(name=f"{slug} (via HN)", ats=ats, slug=slug, stage="unknown")
                     for ats, slug in sorted(boards) if (ats, slug.lower()) not in known]
            more, _ = fetch_all(extra)
            jobs += more
            print(f"HN: {len(hn_jobs)} posts, {len(extra)} extra boards discovered", file=sys.stderr)
        except Exception as e:
            dead.append(f"HN: {e}")

    seen = {}
    if (OUT / "seen.json").exists():
        seen = json.loads((OUT / "seen.json").read_text())
    today = datetime.now().strftime("%Y-%m-%d")

    by_url = {}
    for j in jobs:
        if j["url"] in by_url or not score(j):
            continue
        if j.get("age_days", 0) > args.max_age or j["score"] < args.min_score or j["stage"] not in args.stages.split(","):
            continue
        j["how"], j["hook"] = approach(j)
        j["new"] = j["url"] not in seen
        seen.setdefault(j["url"], today)
        by_url[j["url"]] = j

    ranked = sorted(by_url.values(), key=lambda j: (-j["score"], j.get("age_days", 999)))
    write_outputs(ranked, seen, hn_title, dead)

    print(f"{len(jobs)} postings scanned -> {len(ranked)} matches "
          f"({sum(j['new'] for j in ranked)} new) in {time.time() - t0:.0f}s", file=sys.stderr)
    for j in ranked[:15]:
        print(f"{j['score']:>3}  {'NEW ' if j['new'] else '    '}{j['company'][:22]:<22} {j['title'][:55]:<55} {j['loc']}")
    if dead:
        print(f"\n{len(dead)} dead boards, see out/jobs.md", file=sys.stderr)
    print(f"\n-> {OUT / 'jobs.md'}", file=sys.stderr)


if __name__ == "__main__":
    main()
