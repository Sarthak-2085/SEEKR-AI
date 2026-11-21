import React, { useState, useEffect } from "react";
import {
  ArrowUpRight,
  AudioWaveform,
  BookOpen,
  CalendarDays,
  ChevronRight,
  Compass,
  ExternalLink,
  FileText,
  GitCompareArrows,
  Globe2,
  Layers3,
  Library,
  Lightbulb,
  ListFilter,
  Newspaper,
  Orbit,
  Radio,
  Rocket,
  Search,
  SlidersHorizontal,
  Sparkles,
  Telescope,
  TrendingUp,
  Waypoints,
} from "lucide-react";
import { useApp, useData } from "./context";
import {
  Badge,
  categoryIcon,
  catLink,
  Empty,
  Err,
  Follow,
  Head,
  Link,
  Load,
  Mark,
  NewsRow,
  Out,
  Pager,
  Save,
  SearchBox,
  Section,
  TechCard,
  TechRow,
} from "./ui";
import {
  api,
  date,
  go,
  News,
  Page,
  prices,
  statuses,
  Tech,
  yes,
} from "./model";
export function Overview() {
  const { d } = useApp();
  return (
    <>
      <section className="hero">
        <div className="terrain" aria-hidden="true" />
        <div className="heroCopy">
          <div className="heroKicker">
            <span />
            Technology intelligence
          </div>
          <h1>
            Discover what's happening
            <br className="wideBr" /> in technology.
          </h1>
          <p>
            Explore new AI models, emerging tools, and the technologies shaping
            what's next.
          </p>
        </div>
        <div className="heroSearch">
          <SearchBox
            onSearch={(q) => go("/search?q=" + encodeURIComponent(q))}
            placeholder="Search technologies, models, tools or describe what you want to build..."
            hotkey
          />
          <div className="try">
            <span>Try</span>
            {["AI Models", "Coding Agents", "Open-Source AI"].map((s) => (
              <Link href={catLink(s)} key={s}>
                {s}
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="dashSection">
        <Section
          icon={Rocket}
          title="Latest launches"
          link="/launches"
          label="Launch radar"
        />
        <div className="cards">
          {d.launches.slice(0, 3).map((t, i) => (
            <TechCard t={t} i={i} key={t.id} />
          ))}
        </div>
      </section>
      <div className="editorialGrid">
        <section className="panel briefingPanel">
          <Section
            icon={Newspaper}
            title="Daily technology briefing"
            link="/briefings"
          />
          {d.news.slice(0, 3).map((n) => (
            <NewsRow key={n.id} n={n} />
          ))}
        </section>
        <section className="finderPromo">
          <div className="finderConstellation" aria-hidden="true">
            <Orbit size={132} strokeWidth={0.6} />
          </div>
          <span className="finderIcon">
            <Sparkles size={23} />
          </span>
          <h2>AI Tool Finder</h2>
          <p>
            Describe what you want to build. Find tools that fit your task and
            budget.
          </p>
          <Link className="btn primary" href="/finder">
            Find a tool <Search size={14} />
          </Link>
        </section>
      </div>
      <div className="editorialGrid equal">
        <section className="panel">
          <Section icon={TrendingUp} title="Trending technologies" />
          {d.trending.length ? (
            d.trending.map((t) => <TechRow t={t} key={t.id} />)
          ) : (
            <Empty
              title="Trends are taking shape"
              text="Technologies appear here as readers explore their detail pages this week."
            />
          )}
        </section>
        <section className="panel">
          <Section
            icon={Lightbulb}
            title="Recommended tools"
            link="/finder"
            label="Tool finder"
          />
          {d.recommended.slice(0, 3).map((t) => (
            <TechRow t={t} key={t.id} />
          ))}
        </section>
      </div>
      <section className="panel">
        <Section
          icon={CalendarDays}
          title="Upcoming releases"
          link="/upcoming"
        />
        {d.upcoming.map((t) => (
          <TechRow
            key={t.id}
            t={t}
            extra={
              <small>
                Expected{" "}
                {t.expected ? date(t.expected) : "release date not announced"}
              </small>
            }
          />
        ))}
      </section>
      <section className="dashSection">
        <Section icon={Layers3} title="Explore categories" />
        <div className="catGrid">
          {d.categories.map((c) => {
            const I = categoryIcon(c);
            return (
              <Link href={catLink(c)} key={c}>
                <I size={18} />
                {c}
                <ChevronRight size={15} />
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}
export function Listing({
  mode,
  params,
}: {
  mode: string;
  params: URLSearchParams;
}) {
  const { d, l } = useApp();
  const news = mode === "briefings",
    up = mode === "upcoming",
    ex = mode === "explained",
    path = location.pathname;
  const alter = (changes: Record<string, string>) => {
    const s = new URLSearchParams(params);
    s.delete("page");
    Object.entries(changes).forEach(([k, v]) =>
      v || k === "pricing" ? s.set(k, v) : s.delete(k),
    );
    go(path + (s.size ? "?" + s : ""));
  };
  const [show, setShow] = useState(false),
    [q, setQ] = useState(params.get("q") || "");
  useEffect(() => setQ(params.get("q") || ""), [params.toString()]);
  const options = new URLSearchParams(params);
  options.set("limit", "9");
  if (!news && !options.has("pricing") && l.preferences.pricing)
    options.set("pricing", l.preferences.pricing);
  const endpoint = news
      ? "news"
      : up
        ? "upcoming"
        : ex
          ? "technologies"
          : "launches",
    r = useData<Page<Tech | News>>(endpoint + "?" + options);
  const select = (
    name: string,
    label: string,
    opts: string[],
    current?: string,
  ) => (
    <label className="filterLabel">
      {label}
      <select
        aria-label={label}
        value={current ?? params.get(name) ?? ""}
        onChange={(e) => alter({ [name]: e.target.value })}
      >
        <option value="">All {label.toLowerCase()}</option>
        {opts.map((s) => (
          <option key={s}>{s}</option>
        ))}
      </select>
    </label>
  );
  return (
    <>
      <Head
        title={
          news
            ? "Daily Briefing"
            : up
              ? "Upcoming Radar"
              : ex
                ? "Technology Explained"
                : "Launch Radar"
        }
        sub={
          news
            ? "Original announcements, release notes, and why they matter."
            : up
              ? "Confirmed announcements and milestones on the way to general availability."
              : ex
                ? "Understand how each technology works, who it serves, and where it falls short."
                : "Explore technology releases and updates from their original sources."
        }
      />
      <div className="filterPanel">
        <form
          className="filterSearch"
          onSubmit={(e) => {
            e.preventDefault();
            alter({ q: q.trim() });
          }}
        >
          <Search size={18} />
          <input
            aria-label="Search records"
            placeholder={
              news ? "Search briefings…" : "Search technologies or companies…"
            }
            value={q}
            onChange={(e) => setQ(e.target.value)}
            maxLength={400}
          />
          <button>Search</button>
        </form>
        <div className="filters">
          {select("category", "Categories", d.categories)}
          {!news &&
            select("pricing", "Pricing", prices, options.get("pricing") || "")}
          <label className="filterLabel">
            Sort by
            <select
              aria-label="Sort by"
              value={params.get("sort") || "latest"}
              onChange={(e) => alter({ sort: e.target.value })}
            >
              <option value="latest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name">Alphabetical</option>
            </select>
          </label>
          <button
            className="filterToggle"
            aria-expanded={show}
            onClick={() => setShow(!show)}
          >
            <SlidersHorizontal size={16} /> More filters
          </button>
        </div>
        {show && (
          <div className="filters">
            {!news &&
              select(
                "status",
                "Statuses",
                up ? statuses.slice(0, 3) : statuses,
              )}
            {["from", "to"].map((k) => (
              <label className="filterLabel" key={k}>
                {k === "from" ? "From date" : "Through date"}
                <input
                  type="date"
                  value={params.get(k) || ""}
                  onChange={(e) => alter({ [k]: e.target.value })}
                />
              </label>
            ))}
          </div>
        )}
      </div>
      {r.error ? (
        <Err error={r.error} retry={r.retry} />
      ) : !r.data ? (
        <Load />
      ) : (
        <>
          <div className="resultHeader">
            <small>
              {r.data.total} {news ? "briefings" : "technologies"}
            </small>
            {params.size > 0 && <Link href={path}>Clear filters</Link>}
          </div>
          {!r.data.items.length ? (
            <Empty text="Try another keyword, category, or date range." />
          ) : news ? (
            <section className="panel">
              {(r.data.items as News[]).map((n) => (
                <div className="story" key={n.id}>
                  <NewsRow n={n} />
                  <p>{n.summary}</p>
                  <Out href={n.url}>Original source</Out>
                </div>
              ))}
            </section>
          ) : up ? (
            <div className="stack">
              {(r.data.items as Tech[]).map((t) => (
                <article className="panel upcoming" key={t.id}>
                  <Badge>{t.status}</Badge>
                  <TechRow t={t} />
                  <p>{t.summary}</p>
                  <dl>
                    <dt>Announced</dt>
                    <dd>{date(t.announced)}</dd>
                    <dt>Expected stable release</dt>
                    <dd>
                      {t.expected
                        ? date(t.expected)
                        : "Release date not announced"}
                    </dd>
                    <dt>Last verified</dt>
                    <dd>{date(t.verified)}</dd>
                  </dl>
                  {t.changes[0] && <p>{t.changes[0]}</p>}
                  <Out href={t.sources[0].url}>Official announcement</Out>
                </article>
              ))}
            </div>
          ) : (
            <div className="cards">
              {(r.data.items as Tech[]).map((t, i) => (
                <TechCard key={t.id} t={t} i={i} />
              ))}
            </div>
          )}
          <Pager
            page={r.data.page}
            total={r.data.total}
            size={9}
            set={(n) => alter({ page: String(n) })}
          />
        </>
      )}
    </>
  );
}
export function Detail({ id }: { id: string }) {
  const r = useData<{ item: Tech; related: Tech[] }>("technologies/" + id);
  useEffect(() => {
    if (r.data) {
      void api("views", "POST", { id }).catch(() => {});
    }
  }, [r.data, id]);
  if (r.error) return <Err error={r.error} retry={r.retry} />;
  if (!r.data) return <Load />;
  const { item: t, related } = r.data;
  return (
    <>
      <div className="crumb">
        <Link href="/explained">Technology Explained</Link>
        <ChevronRight size={14} />
        {t.name}
      </div>
      <article className="detailHero">
        <span className="heroGlyph">
          <Mark mark={t.mark} />
        </span>
        <div>
          <div className="company">
            {t.company} · {t.category}
          </div>
          <h1>{t.name}</h1>
          <p>{t.summary}</p>
        </div>
        <div className="actionRow">
          <a
            className="btn primary"
            href={t.website}
            target="_blank"
            rel="noreferrer"
          >
            Official website <ExternalLink size={15} />
          </a>
          <Save itemKey={"tech:" + t.id} title={t.name} label />
          <Link className="btn" href={"/compare?ids=" + t.id}>
            <GitCompareArrows size={16} />
            Compare
          </Link>
        </div>
      </article>
      <div className="detailGrid">
        <div className="stack">
          <section className="panel prose">
            <Section icon={BookOpen} title="Technology explained" />
            {[
              ["What is it?", t.description],
              ["Why was it created?", t.why],
              ["How does it work?", t.how],
              ["What makes it different?", t.difference],
              ["Who should use it?", t.audience],
              ["Limitations", t.limitations],
            ].map(([k, v]) => (
              <div key={k}>
                <h3>{k}</h3>
                <p>{v}</p>
              </div>
            ))}
            <h3>Main features</h3>
            <ul>
              {t.features.map((v) => (
                <li key={v}>{v}</li>
              ))}
            </ul>
          </section>
          <section className="panel prose">
            <Section icon={Radio} title="What's changed?" />
            <Badge>{t.version || "Version not verified"}</Badge>
            {t.changes?.length ? (
              <ul>
                {t.changes.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            ) : (
              <p>No verified changes are recorded.</p>
            )}
          </section>
          <section className="panel prose">
            <Section icon={Lightbulb} title="Should I care?" />
            <div className="score">
              <b>{t.score}/10</b> SEEKR editorial assessment
            </div>
            <p>{t.rationale}</p>
          </section>
          <section className="panel">
            <Section icon={FileText} title="Sources and documentation" />
            <div className="sourceList">
              <Out href={t.docs}>Official documentation</Out>
              {t.sources.map((s) => (
                <Out key={s.url} href={s.url}>
                  {s.title}
                </Out>
              ))}
            </div>
          </section>
        </div>
        <aside className="stack">
          <section className="panel facts">
            <h2>At a glance</h2>
            <dl>
              {[
                ["Developer", t.company],
                ["Status", t.status],
                ["Version", t.version || "Not verified"],
                ["Announced", date(t.announced)],
                ["Released", date(t.released)],
                ["Pricing model", t.priceClass],
                ["Free access", yes(t.free)],
                ["API available", yes(t.api)],
                ["Open source", yes(t.open)],
                ["Last verified", date(t.verified)],
              ].map(([k, v]) => (
                <React.Fragment key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </React.Fragment>
              ))}
            </dl>
            <p>{t.pricing}</p>
          </section>
          <section className="panel">
            <h2>Follow updates</h2>
            <div className="chips">
              {[
                "Technology: " + t.name,
                "Company: " + t.company,
                "Category: " + t.category,
              ].map((s) => (
                <Follow topic={s} key={s} />
              ))}
            </div>
          </section>
        </aside>
      </div>
      {related.length > 0 && (
        <section className="panel">
          <Section icon={Waypoints} title="Related technologies" />
          {related.map((t) => (
            <TechRow key={t.id} t={t} />
          ))}
        </section>
      )}
    </>
  );
}
export function Brief({ id }: { id: string }) {
  const r = useData<News>("news/" + id);
  if (r.error) return <Err error={r.error} retry={r.retry} />;
  if (!r.data) return <Load />;
  const n = r.data;
  return (
    <>
      <div className="crumb">
        <Link href="/briefings">Daily Briefing</Link>
        <ChevronRight size={14} />
        Briefing
      </div>
      <article className="panel prose reading">
        <Badge>{n.type}</Badge>
        <h1>{n.title}</h1>
        <div className="meta">
          {n.publisher} · {date(n.date)} · {n.category}
        </div>
        <p>{n.summary}</p>
        <h2>Why it matters</h2>
        <p>{n.why}</p>
        <div className="actionRow">
          <Out href={n.url}>Read original announcement</Out>
          <Save itemKey={"news:" + n.id} title={n.title} label />
        </div>
      </article>
    </>
  );
}
export function GlobalSearch({ params }: { params: URLSearchParams }) {
  const q = params.get("q") || "",
    r = useData<{ technologies: Page<Tech>; news: Page<News> }>(
      q ? "search?q=" + encodeURIComponent(q) + "&limit=60" : null,
    );
  return (
    <>
      <Head
        title="Search"
        sub="Find technologies, companies, capabilities and original announcements."
      />
      <SearchBox
        initial={q}
        placeholder="Search the technology catalog…"
        onSearch={(v) => go("/search?q=" + encodeURIComponent(v))}
      />
      {q && (
        <>
          <Link
            className="taskPrompt"
            href={"/finder?q=" + encodeURIComponent(q)}
          >
            <Sparkles size={18} />
            Find tools for “{q}” <ChevronRight size={16} />
          </Link>
          {r.error ? (
            <Err error={r.error} retry={r.retry} />
          ) : !r.data ? (
            <Load />
          ) : (
            <>
              <section className="panel">
                <Section icon={Layers3} title="Technologies" />
                {r.data.technologies.items.length ? (
                  r.data.technologies.items.map((t) => (
                    <TechRow key={t.id} t={t} />
                  ))
                ) : (
                  <Empty text="Try a company or capability, or describe your task in AI Tool Finder." />
                )}
              </section>
              <section className="panel">
                <Section icon={Newspaper} title="Briefings" />
                {r.data.news.items.length ? (
                  r.data.news.items.map((n) => <NewsRow n={n} key={n.id} />)
                ) : (
                  <p>No matching briefings.</p>
                )}
              </section>
            </>
          )}
        </>
      )}
    </>
  );
}
