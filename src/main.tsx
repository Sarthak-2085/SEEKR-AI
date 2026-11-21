import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Bell,
  BookMarked,
  BookOpen,
  Bookmark,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  CircleUserRound,
  Compass,
  FolderOpen,
  GitCompareArrows,
  Grid2X2,
  House,
  Layers,
  LayoutDashboard,
  LibraryBig,
  Menu,
  Newspaper,
  PanelLeft,
  Radio,
  Rocket,
  Search,
  Settings2,
  Shapes,
  Sparkles,
  Telescope,
  UserRound,
  X,
} from "lucide-react";
import { Context, useWorkspace } from "./context";
import { Brief, Detail, GlobalSearch, Listing, Overview } from "./discover";
import { Compare, Finder } from "./tools";
import { Personal, Preferences } from "./personal";
import { Brand, Empty, Err, Link, Load, Modal, SearchBox } from "./ui";
import { go } from "./model";
import "./style.css";
const sections = [
  {
    name: "Main",
    items: [
      ["Overview", "/", LayoutDashboard],
      ["Launch Radar", "/launches", Rocket],
      ["AI Tool Finder", "/finder", Sparkles],
      ["Compare", "/compare", GitCompareArrows],
    ],
  },
  {
    name: "Discover",
    items: [
      ["Technology Explained", "/explained", BookOpen],
      ["Daily Briefing", "/briefings", Newspaper],
      ["Upcoming Radar", "/upcoming", Telescope],
      ["Collections", "/collections", FolderOpen],
    ],
  },
  {
    name: "Personal",
    items: [
      ["My Library", "/library", LibraryBig],
      ["Saved Tools", "/saved", Bookmark],
    ],
  },
] as const;
function App() {
  const app = useWorkspace(),
    [url, setUrl] = useState(location.pathname + location.search),
    [menu, setMenu] = useState(false),
    menuButton = useRef<HTMLButtonElement>(null),
    side = useRef<HTMLElement>(null);
  useEffect(() => {
    const changed = () => {
      setUrl(location.pathname + location.search);
      setMenu(false);
      window.scrollTo(0, 0);
    };
    addEventListener("popstate", changed);
    addEventListener("seekr:navigate", changed);
    return () => {
      removeEventListener("popstate", changed);
      removeEventListener("seekr:navigate", changed);
    };
  }, []);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        app.ctx?.setSearch(!app.search);
      }
      if (e.key === "Escape" && menu) {
        setMenu(false);
        menuButton.current?.focus();
      }
    };
    addEventListener("keydown", h);
    return () => removeEventListener("keydown", h);
  }, [app.ctx, app.search, menu]);
  useEffect(() => {
    if (!menu) return;
    const items = side.current?.querySelectorAll<HTMLElement>("a,button");
    items?.[0]?.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !items?.length) return;
      const first = items[0],
        last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => document.removeEventListener("keydown", trap);
  }, [menu]);
  const [pathname, query = ""] = url.split("?"),
    params = new URLSearchParams(query),
    parts = pathname.split("/").filter(Boolean),
    route = parts[0] || "overview",
    section = sections
      .flatMap((s) => [...s.items])
      .find(([, p]) => p === pathname);
  const title =
    section?.[0] ||
    (
      {
        technology: "Technology Explained",
        briefing: "Daily Briefing",
        profile: "Profile",
        settings: "Settings",
        search: "Search",
      } as Record<string, string>
    )[route] ||
    "Page not found";
  useEffect(() => {
    document.title = title + " · SEEKR";
  }, [title]);
  const render = () => {
    if (route === "overview") return <Overview />;
    if (["launches", "briefings", "upcoming", "explained"].includes(route))
      return <Listing mode={route} params={params} />;
    if (route === "technology") return <Detail id={parts[1]} />;
    if (route === "briefing") return <Brief id={parts[1]} />;
    if (route === "finder") return <Finder params={params} />;
    if (route === "compare") return <Compare params={params} />;
    if (route === "search") return <GlobalSearch params={params} />;
    if (["library", "saved", "collections"].includes(route))
      return <Personal mode={route} params={params} />;
    if (["settings", "profile"].includes(route))
      return <Preferences profile={route === "profile"} />;
    return (
      <Empty
        title="Page not found"
        text="Return to the overview to continue exploring."
      >
        <Link className="btn" href="/">
          Overview
        </Link>
      </Empty>
    );
  };
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      {menu && (
        <button
          className="scrim"
          aria-label="Close navigation"
          onClick={() => {
            setMenu(false);
            menuButton.current?.focus();
          }}
        />
      )}
      <aside
        ref={side}
        className={"sidebar " + (menu ? "open" : "")}
        aria-label="Workspace navigation"
      >
        <div className="brandWrap">
          <Brand />
          <button
            className="mobileClose iconBtn"
            aria-label="Close navigation"
            onClick={() => {
              setMenu(false);
              menuButton.current?.focus();
            }}
          >
            <X size={18} />
          </button>
        </div>
        <nav>
          {sections.map((s) => (
            <div className="navGroup" key={s.name}>
              <div className="navLabel">{s.name}</div>
              {s.items.map(([label, path, I]) => {
                const active =
                  path === pathname ||
                  (route === "technology" && path === "/explained") ||
                  (route === "briefing" && path === "/briefings");
                return (
                  <Link
                    href={path}
                    key={path}
                    className={"navItem " + (active ? "active" : "")}
                    aria-current={active ? "page" : undefined}
                  >
                    <I size={18} strokeWidth={1.65} />
                    {label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="sideBottom">
          <Link
            className={"navItem " + (route === "settings" ? "active" : "")}
            href="/settings"
          >
            <Settings2 size={18} />
            Settings
          </Link>
          <Link href="/profile" className="profileLink">
            <span className="avatar">
              <UserRound size={18} />
            </span>
            <span>
              <b>
                {app.ctx?.session.authenticated
                  ? "My profile"
                  : "Guest workspace"}
              </b>
              <small>
                {app.ctx?.session.authenticated
                  ? "Account settings"
                  : "Local library"}
              </small>
            </span>
            <ChevronsUpDown size={14} />
          </Link>
        </div>
      </aside>
      <div className="shell">
        <header className="top">
          <div className="breadcrumbs">
            <button
              ref={menuButton}
              className="mobileMenu iconBtn"
              aria-label="Open navigation"
              aria-expanded={menu}
              onClick={() => setMenu(true)}
            >
              <Menu size={21} />
            </button>
            <PanelLeft className="desktopIcon" size={17} />
            <span>Workspace</span>
            <ChevronRight size={13} />
            <b>{title}</b>
          </div>
          <div className="headerRight">
            <span className="calendar">
              <CalendarDays size={15} />
              {new Intl.DateTimeFormat("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              }).format(new Date())}
            </span>
            <i />
            <button
              className="iconBtn"
              aria-label="Open global search"
              onClick={() => app.ctx?.setSearch(true)}
            >
              <Search size={18} />
            </button>
          </div>
        </header>
        <main id="main" key={pathname} tabIndex={-1}>
          {app.error ? (
            <Err error={app.error} retry={app.boot} />
          ) : !app.ctx ? (
            <Load />
          ) : (
            <Context.Provider value={app.ctx}>
              {render()}
              {app.search && (
                <Modal
                  title="Search SEEKR"
                  close={() => app.ctx?.setSearch(false)}
                >
                  <SearchBox
                    autoFocus
                    onSearch={(q) => {
                      app.ctx?.setSearch(false);
                      go("/search?q=" + encodeURIComponent(q));
                    }}
                    placeholder="Search technologies, models, or companies…"
                  />
                </Modal>
              )}
            </Context.Provider>
          )}
        </main>
      </div>
      {app.notice && (
        <div role="status" className="toast">
          <Check size={17} />
          {app.notice}
        </div>
      )}
    </>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
