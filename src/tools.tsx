import React, { useEffect, useState } from "react";
import {
  Bookmark,
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  GitCompareArrows,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { useApp, useData } from "./context";
import {
  Badge,
  Empty,
  Err,
  Head,
  Link,
  Load,
  Mark,
  Out,
  Save,
  Section,
} from "./ui";
import { date, go, prices, Tech, yes } from "./model";
const examples = [
  "I need an AI coding assistant",
  "Generate AI images for free",
  "Convert handwritten notes into editable text",
  "Find an open-source LLM I can run locally",
  "I need a free tool for video generation",
];
export function Finder({ params }: { params: URLSearchParams }) {
  const { l } = useApp(),
    q = params.get("q") || "",
    [value, setValue] = useState(q),
    p = params.has("pricing")
      ? params.get("pricing") || ""
      : l.preferences.pricing;
  useEffect(() => setValue(q), [q]);
  const send = (s: string, pricing = p) =>
    go("/finder?" + new URLSearchParams({ q: s, pricing }));
  const r = useData<{ items: Tech[] }>(
    q ? "recommendations?" + new URLSearchParams({ q, pricing: p }) : null,
  );
  return (
    <>
      <Head
        title="AI Tool Finder"
        sub="Describe your task to find tools that match your requirements."
      />
      <section className="finderForm panel">
        <div className="finderFormTitle">
          <span className="glyph">
            <Sparkles size={23} />
          </span>
          <h2>What do you want to build?</h2>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (value.trim()) send(value.trim());
          }}
        >
          <textarea
            aria-label="Describe your task"
            placeholder="I need an open-source language model I can run locally…"
            maxLength={400}
            required
            rows={3}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <div className="toolbar">
            <label>
              Pricing{" "}
              <select value={p} onChange={(e) => send(value, e.target.value)}>
                <option value="">All pricing</option>
                {prices.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <button className="primary" disabled={!value.trim()}>
              <Search size={16} />
              Find matches
            </button>
          </div>
        </form>
        <div className="chips">
          {examples.map((s) => (
            <button key={s} className="chip" onClick={() => send(s)}>
              {s}
            </button>
          ))}
        </div>
      </section>
      {q && (
        <section>
          <Section icon={Sparkles} title="Matching technologies" />
          {r.error ? (
            <Err error={r.error} retry={r.retry} />
          ) : !r.data ? (
            <Load />
          ) : r.data.items.length ? (
            <div className="stack">
              {r.data.items.map((t, i) => (
                <article className="panel match" key={t.id}>
                  <div className="matchHead">
                    <span className="glyph">
                      <Mark mark={t.mark} />
                    </span>
                    <div className="grow">
                      <div className="company">{t.company}</div>
                      <h2>
                        <Link href={"/technology/" + t.id}>{t.name}</Link>
                      </h2>
                    </div>
                    {i === 0 && <Badge>Closest catalog match</Badge>}
                    <Save itemKey={"tech:" + t.id} title={t.name} />
                  </div>
                  <p>{t.summary}</p>
                  <div className="reason">
                    <Check size={17} />
                    {t.matchReason}
                  </div>
                  <p>
                    <b>Capabilities</b> · {t.features.join(" · ")}
                  </p>
                  <p>
                    <b>Pricing</b> · {t.pricing}
                  </p>
                  <p>
                    <b>Limitations</b> · {t.limitations}
                  </p>
                  <div className="chips">
                    <Badge>Free access · {yes(t.free)}</Badge>
                    <Badge>API · {yes(t.api)}</Badge>
                    <Badge>Open source · {yes(t.open)}</Badge>
                  </div>
                  <div className="matchFoot">
                    <Out href={t.website}>Official website</Out>
                    <small>Verified {date(t.verified)}</small>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <Empty
              title="No verified match"
              text="Try a broader capability or change the pricing filter."
            />
          )}
        </section>
      )}
    </>
  );
}
export function Compare({ params }: { params: URLSearchParams }) {
  const { d, notify } = useApp(),
    ids = (params.get("ids") || "").split(",").filter(Boolean),
    [three, setThree] = useState(ids.length > 2);
  const count = Math.max(2, three ? 3 : 0, Math.min(3, ids.length));
  const change = (a: string[]) =>
    go(
      "/compare" +
        (a.some(Boolean)
          ? "?ids=" + encodeURIComponent(a.filter(Boolean).join(","))
          : ""),
    );
  const r = useData<{ items: Tech[] }>(
    ids.length >= 2 ? "compare?ids=" + encodeURIComponent(ids.join(",")) : null,
  );
  const fields: [string, (t: Tech) => string][] = [
    ["Developer", (t) => t.company],
    ["Category", (t) => t.category],
    ["Release status", (t) => t.status],
    ["Release date", (t) => date(t.released)],
    ["Version", (t) => t.version || "Not verified"],
    ["Capabilities", (t) => t.features.join(" · ")],
    ["Best use cases", (t) => t.audience],
    ["Pricing", (t) => t.pricing],
    ["Free access", (t) => yes(t.free)],
    ["API availability", (t) => yes(t.api)],
    ["Open source", (t) => yes(t.open)],
    ["Limitations", (t) => t.limitations],
    ["Commercial-use terms", () => "Not verified"],
    ["Last verified", (t) => date(t.verified)],
  ];
  if (r.data?.items.some((t) => /AI Models|Open-Source AI/.test(t.category)))
    fields.splice(
      6,
      0,
      ["Context window", () => "Not verified"],
      ["Comparable benchmarks", () => "Not verified"],
    );
  return (
    <>
      <Head
        title="Compare Technologies"
        sub="Choose two or three technologies to compare their capabilities, pricing, and trade-offs."
      />
      <div className="panel">
        <div className="compareSelects">
          {Array.from({ length: count }, (_, i) => (
            <label key={i} className="filterLabel">
              Technology {i + 1}
              <select
                aria-label={"Technology " + (i + 1)}
                value={ids[i] || ""}
                onChange={(e) => {
                  const a = [...ids];
                  a[i] = e.target.value;
                  change(a);
                }}
              >
                <option value="">Select technology</option>
                {d.choices.map((t) => (
                  <option
                    disabled={ids.includes(t.id) && ids[i] !== t.id}
                    key={t.id}
                    value={t.id}
                  >
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <button
          onClick={() => {
            if (three || count === 3) {
              setThree(false);
              change(ids.slice(0, 2));
            } else setThree(true);
          }}
        >
          {count === 3 ? "Remove third column" : "Add a third technology"}
        </button>
      </div>
      {ids.length < 2 ? (
        <Empty
          title="Choose your technologies"
          text="Select at least two entries above to build a side-by-side comparison."
        />
      ) : r.error ? (
        <Err error={r.error} retry={r.retry} />
      ) : !r.data ? (
        <Load />
      ) : (
        <>
          <div className="toolbar">
            <h2>Side by side</h2>
            <div className="actionRow">
              <Save
                itemKey={"compare:" + ids.join(",")}
                title={r.data.items.map((t) => t.name).join(" vs ")}
                label
              />
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(location.href);
                    notify("Comparison link copied");
                  } catch {
                    notify("Share the comparison URL from your address bar.");
                  }
                }}
              >
                <Copy size={15} />
                Copy link
              </button>
            </div>
          </div>
          <div className="tableWrap" tabIndex={0} aria-label="Comparison table">
            <table>
              <thead>
                <tr>
                  <th>Attribute</th>
                  {r.data.items.map((t) => (
                    <th key={t.id}>
                      <Link href={"/technology/" + t.id}>{t.name}</Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fields.map(([key, read]) => (
                  <tr key={key}>
                    <th>{key}</th>
                    {r.data!.items.map((t) => (
                      <td key={t.id}>{read(t)}</td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <th>Sources</th>
                  {r.data.items.map((t) => (
                    <td key={t.id}>
                      <Out href={t.sources[0].url}>{t.sources[0].title}</Out>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
