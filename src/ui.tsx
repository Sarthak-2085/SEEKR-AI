import React, { useEffect, useRef, useState } from "react";
import {
  Activity,
  AudioWaveform,
  Bookmark,
  BookOpen,
  Box,
  Braces,
  Check,
  ChevronRight,
  Code2,
  Command,
  Compass,
  Cpu,
  ExternalLink,
  FileSearch,
  Focus,
  GitBranch,
  Image,
  Layers3,
  LoaderCircle,
  Mic,
  Network,
  ScanLine,
  Search,
  SlidersHorizontal,
  Sparkles,
  Terminal,
  Workflow,
  X,
} from "lucide-react";
import { useApp } from "./context";
import { date, go, News, Tech } from "./model";
export function Link({
  href,
  children,
  className = "",
  ...rest
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return (
    <a
      href={href}
      className={className}
      {...rest}
      onClick={(e) => {
        rest.onClick?.(e);
        if (
          href.startsWith("/") &&
          !href.startsWith("//") &&
          !e.defaultPrevented &&
          !e.metaKey &&
          !e.ctrlKey &&
          !e.shiftKey &&
          !e.altKey &&
          e.button === 0
        ) {
          e.preventDefault();
          go(href);
        }
      }}
    >
      {children}
    </a>
  );
}
export function Out({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a className="out" href={href} target="_blank" rel="noreferrer">
      {children} <ExternalLink size={13} />
    </a>
  );
}
export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="SEEKR overview">
      <svg width="39" height="39" viewBox="0 0 40 40" aria-hidden="true">
        <rect x="1" y="1" width="38" height="38" rx="10" fill="#6f4e37" />
        <g fill="none" stroke="#fff9ed" strokeWidth="1.25">
          <circle cx="20" cy="20" r="12" />
          <path d="m26 12-3.9 10.2L14 28l3.6-10.5Z" fill="#fff9ed" />
          <path d="m18 18 8-6-4 10Z" fill="#6f4e37" />
          <path d="M20 5v5m0 20v5M5 20h5m20 0h5" />
        </g>
      </svg>
      <span>
        <b>SEEKR</b>
        <small>Seek. Discover. Build.</small>
      </span>
    </Link>
  );
}
export const categoryIcon = (c: string) =>
  /image|video/i.test(c)
    ? Image
    : /speech|audio/i.test(c)
      ? AudioWaveform
      : /coding|developer/i.test(c)
        ? Code2
        : /model|machine/i.test(c)
          ? Cpu
          : /infrastructure/i.test(c)
            ? Network
            : Layers3;
export const catLink = (c: string) =>
  "/launches?category=" + encodeURIComponent(c);
export function Kicker({ children }: { children: React.ReactNode }) {
  return <div className="kicker">{children}</div>;
}
export function Head({
  title,
  sub,
  action,
}: {
  title: string;
  sub?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="pageHead">
      <div>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {action}
    </div>
  );
}
export function Section({
  icon: Icon,
  title,
  link,
  label,
  children,
}: {
  icon: typeof Cpu;
  title: string;
  link?: string;
  label?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="sectionHead">
      <h2>
        <Icon size={21} strokeWidth={1.65} />
        {title}
      </h2>
      {link && (
        <Link href={link} className="textLink">
          {label || "View all"}
          <ChevronRight size={15} />
        </Link>
      )}
      {children}
    </div>
  );
}
export function Empty({
  title = "No results found",
  text,
  children,
}: {
  title?: string;
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <FileSearch size={27} />
      <h3>{title}</h3>
      <p>{text}</p>
      {children}
    </div>
  );
}
export function Load() {
  return (
    <div className="loading" role="status">
      <LoaderCircle size={20} /> Loading records…
    </div>
  );
}
export function Err({ error, retry }: { error: string; retry: () => void }) {
  return (
    <div className="empty" role="alert">
      <p>{error}</p>
      <button onClick={retry}>Try again</button>
    </div>
  );
}
export function Save({
  itemKey,
  title,
  label = false,
}: {
  itemKey: string;
  title: string;
  label?: boolean;
}) {
  const a = useApp(),
    on = a.isSaved(itemKey);
  return (
    <button
      className={label ? "btn" : "iconBtn"}
      aria-label={(on ? "Unsave " : "Save ") + title}
      aria-pressed={on}
      title={on ? "Remove bookmark" : "Save to library"}
      onClick={() => a.save(itemKey, title)}
    >
      <Bookmark size={16} fill={on ? "currentColor" : "none"} />
      {label && (on ? "Saved" : "Save")}
    </button>
  );
}
export function Badge({ children }: { children: React.ReactNode }) {
  return <span className="badge">{children}</span>;
}
export function Mark({ mark }: { mark: string }) {
  const I =
    (
      {
        huggingface: Layers3,
        openai: Command,
        google: Sparkles,
        comfy: Workflow,
        astral: Activity,
        vllm: Layers3,
        llama: Box,
        ollama: Braces,
        gradio: Layers3,
        anthropic: Braces,
        wan: Image,
        flux: Focus,
        microsoft: ScanLine,
        aider: Terminal,
        python: Code2,
        node: GitBranch,
      } as Record<string, typeof Cpu>
    )[mark] || Cpu;
  return <I size={25} strokeWidth={1.6} />;
}
export function TechCard({ t, i = 0 }: { t: Tech; i?: number }) {
  const art = ["graphite", "lavender", "copper"][i % 3];
  return (
    <article className="techCard">
      <Link
        href={"/technology/" + t.id}
        className={"cover " + art}
        aria-label={"Explore " + t.name}
      >
        <img src={"/assets/" + art + ".webp"} alt="" />
        <span className="coverTag">{t.category}</span>
      </Link>
      <div className="cardBody">
        <div className="company">{t.company}</div>
        <h3>
          <Link href={"/technology/" + t.id}>{t.name}</Link>
        </h3>
        <p>{t.summary}</p>
        <div className="cardFoot">
          <span>
            <span className="statusDot" />
            {t.status}
          </span>
          <span className="sep">·</span>
          <time>{date(t.released || t.announced, true)}</time>
          <Save itemKey={"tech:" + t.id} title={t.name} />
        </div>
      </div>
    </article>
  );
}
export function TechRow({ t, extra }: { t: Tech; extra?: React.ReactNode }) {
  return (
    <article className="techRow">
      <span className="glyph">
        <Mark mark={t.mark} />
      </span>
      <div className="grow">
        <Link className="rowTitle" href={"/technology/" + t.id}>
          {t.name}
        </Link>
        <div className="meta">
          {t.company} · {t.category}
        </div>
        {extra}
      </div>
      <Save itemKey={"tech:" + t.id} title={t.name} />
    </article>
  );
}
export function NewsRow({ n }: { n: News }) {
  return (
    <article className="newsRow">
      <div className="newsMeta">
        {n.publisher} <span>·</span> {date(n.date, true)}
      </div>
      <div className="newsLine">
        <Link href={"/briefing/" + n.id}>{n.title}</Link>
        <Save itemKey={"news:" + n.id} title={n.title} />
      </div>
    </article>
  );
}
export function SearchBox({
  initial = "",
  onSearch,
  placeholder = "Search the catalog…",
  hotkey = false,
  autoFocus = false,
}: {
  initial?: string;
  onSearch: (q: string) => void;
  placeholder?: string;
  hotkey?: boolean;
  autoFocus?: boolean;
}) {
  const [q, setQ] = useState(initial);
  useEffect(() => setQ(initial), [initial]);
  return (
    <form
      className="searchBox"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) onSearch(q.trim());
      }}
    >
      <Search size={19} />
      <input
        autoFocus={autoFocus}
        aria-label={placeholder}
        placeholder={placeholder}
        maxLength={400}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {q.trim() ? (
        <button type="submit" className="searchGo">
          Search
        </button>
      ) : (
        hotkey && <kbd>⌘ K</kbd>
      )}
    </form>
  );
}
export function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => {
      d?.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={close}
      onClick={(e) => {
        if (e.target === ref.current) close();
      }}
    >
      <div className="modalHead">
        <h2>{title}</h2>
        <button className="iconBtn" aria-label="Close dialog" onClick={close}>
          <X size={19} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Follow({ topic }: { topic: string }) {
  const a = useApp(),
    on = a.l.follows.includes(topic);
  return (
    <button
      className={"chip " + (on ? "selected" : "")}
      aria-pressed={on}
      onClick={() => a.follow(topic)}
    >
      {on ? <Check size={14} /> : <Compass size={14} />}{" "}
      {on ? "Following" : "Follow"} {topic.split(": ")[1]}
    </button>
  );
}
export function Pager({
  page,
  total,
  size,
  set,
}: {
  page: number;
  total: number;
  size: number;
  set: (n: number) => void;
}) {
  const pages = Math.ceil(total / size);
  return pages > 1 ? (
    <nav className="pager" aria-label="Pagination">
      <button disabled={page === 1} onClick={() => set(page - 1)}>
        Previous
      </button>
      <span>
        Page {page} of {pages}
      </span>
      <button disabled={page >= pages} onClick={() => set(page + 1)}>
        Next
      </button>
    </nav>
  ) : null;
}
export { SlidersHorizontal, BookOpen };
