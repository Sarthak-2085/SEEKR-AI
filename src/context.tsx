import React, { useContext, useEffect, useRef, useState } from "react";
import { api, Dashboard, Library, Session, Saved } from "./model";
const empty = (): Library => ({
  saved: [],
  collections: [],
  follows: [],
  preferences: { pricing: "" },
});
const stored = () => {
  try {
    const v = JSON.parse(localStorage.getItem("seekr-library-v1") || "null");
    return v &&
      Array.isArray(v.saved) &&
      Array.isArray(v.collections) &&
      Array.isArray(v.follows) &&
      v.preferences
      ? (v as Library)
      : empty();
  } catch {
    return empty();
  }
};
type Change = {
  key?: string;
  name?: string;
  id?: string;
  add?: boolean;
  topic?: string;
  pricing?: string;
  title?: string;
};
export function localChange(
  l: Library,
  path: string,
  m: string,
  b: Change,
): Library {
  const next = structuredClone(l);
  if (path === "bookmarks") {
    if (m === "DELETE") {
      next.saved = next.saved.filter((x) => x.key !== b.key);
      next.collections.forEach(
        (c) => (c.keys = c.keys.filter((x) => x !== b.key)),
      );
    } else if (!next.saved.some((x) => x.key === b.key)) {
      next.saved.unshift({
        key: b.key!,
        kind: b.key!.split(":")[0],
        title: b.title!,
        created: new Date().toISOString(),
      });
    }
  }
  if (path === "collections") {
    if (
      b.name &&
      next.collections.some((c) => c.name === b.name && c.id !== b.id)
    )
      throw Error("A collection already uses this name.");
    if (m === "POST")
      next.collections.push({
        id: crypto.randomUUID(),
        name: b.name!,
        keys: [],
      });
    else if (m === "DELETE")
      next.collections = next.collections.filter((c) => c.id !== b.id);
    else {
      const c = next.collections.find((c) => c.id === b.id);
      if (!c) throw Error("Collection not found.");
      if (b.name) c.name = b.name;
      else if (b.key)
        c.keys = b.add
          ? [...new Set([...c.keys, b.key])]
          : c.keys.filter((k) => k !== b.key);
    }
  }
  if (path === "follows")
    next.follows =
      m === "DELETE"
        ? next.follows.filter((x) => x !== b.topic)
        : [...new Set([...next.follows, b.topic!])];
  if (path === "preferences") next.preferences = { pricing: b.pricing || "" };
  return next;
}
type Ctx = {
  d: Dashboard;
  l: Library;
  session: Session;
  notify: (s: string) => void;
  change: (p: string, m: string, b: Change) => Promise<boolean>;
  save: (key: string, title: string) => void;
  isSaved: (key: string) => boolean;
  follow: (topic: string) => void;
  setSearch: (v: boolean) => void;
};
export const Context = React.createContext<Ctx | null>(null);
export const useApp = () => useContext(Context)!;
export function useWorkspace() {
  const [d, setD] = useState<Dashboard | null>(null),
    [l, setL] = useState<Library>(empty),
    [session, setSession] = useState<Session>({
      authenticated: false,
      name: null,
      hosted: false,
    }),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [search, setSearch] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined),
    ref = useRef(l),
    queue = useRef(Promise.resolve());
  const notify = (s: string) => {
    setNotice(s);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotice(""), 3000);
  };
  const boot = async () => {
    setError("");
    try {
      const [dash, me] = await Promise.all([
        api<Dashboard>("dashboard"),
        api<Session>("session"),
      ]);
      const lib = me.authenticated ? await api<Library>("library") : stored();
      ref.current = lib;
      setL(lib);
      setSession(me);
      setD(dash);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  useEffect(() => {
    void boot();
    const refreshOverview = () => {
      if (location.pathname === "/")
        void api<Dashboard>("dashboard")
          .then(setD)
          .catch(() => {});
    };
    addEventListener("seekr:navigate", refreshOverview);
    addEventListener("popstate", refreshOverview);
    return () => {
      clearTimeout(timer.current);
      removeEventListener("seekr:navigate", refreshOverview);
      removeEventListener("popstate", refreshOverview);
    };
  }, []);
  useEffect(() => {
    if (session.authenticated) return;
    const sync = (e: StorageEvent) => {
      if (e.key === "seekr-library-v1") {
        ref.current = stored();
        setL(ref.current);
      }
    };
    addEventListener("storage", sync);
    return () => removeEventListener("storage", sync);
  }, [session.authenticated]);
  const change = (p: string, m: string, b: Change) => {
    const work = queue.current.then(async () => {
      try {
        const v = session.authenticated
          ? await api<Library>(p, m, b)
          : localChange(ref.current, p, m, b);
        if (!session.authenticated)
          localStorage.setItem("seekr-library-v1", JSON.stringify(v));
        ref.current = v;
        setL(v);
        return true;
      } catch (e) {
        notify((e as Error).message);
        return false;
      }
    });
    queue.current = work.then(() => {});
    return work;
  };
  const isSaved = (key: string) => l.saved.some((x: Saved) => x.key === key);
  const save = (key: string, title: string) => {
    const remove = isSaved(key);
    void change("bookmarks", remove ? "DELETE" : "POST", { key, title }).then(
      (ok) =>
        ok &&
        notify(remove ? "Removed from your library" : "Saved to your library"),
    );
  };
  const follow = (topic: string) => {
    const remove = l.follows.includes(topic);
    void change("follows", remove ? "DELETE" : "POST", { topic }).then(
      (ok) =>
        ok &&
        notify(remove ? "Unfollowed" : "Following " + topic.split(": ")[1]),
    );
  };
  return {
    d,
    error,
    boot,
    notice,
    search,
    ctx: d
      ? { d, l, session, notify, change, save, isSaved, follow, setSearch }
      : null,
  };
}
export function useData<T>(path: string | null) {
  const [state, setState] = useState<{
      path: string | null;
      data?: T;
      error?: string;
    }>({ path: null }),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    if (path) {
      setState({ path });
      api<T>(path)
        .then((data) => {
          if (active) setState({ path, data });
        })
        .catch((e) => {
          if (active) setState({ path, error: e.message });
        });
    }
    return () => {
      active = false;
    };
  }, [path, attempt]);
  return {
    ...(state.path === path ? state : {}),
    retry: () => setAttempt((i) => i + 1),
  };
}
