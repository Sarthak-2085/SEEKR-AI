import { Curator } from "./curator";
import React, { useEffect, useState } from "react";
import {
  Bookmark,
  BookOpen,
  ChevronRight,
  Folder,
  FolderPlus,
  Library as LibraryIcon,
  LogIn,
  Pencil,
  Plus,
  Settings2,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useApp } from "./context";
import { address, go, prices, Saved } from "./model";
import { Empty, Follow, Head, Link, Modal, Save, Section } from "./ui";
type Dialog = {
  type: "new" | "rename" | "delete" | "organize";
  id?: string;
  name?: string;
  item?: Saved;
};
export function Personal({
  mode,
  params,
}: {
  mode: string;
  params: URLSearchParams;
}) {
  const { d, l, change, notify } = useApp(),
    [q, setQ] = useState(""),
    [dialog, setDialog] = useState<Dialog | null>(null),
    [name, setName] = useState("");
  const collection = l.collections.find((c) => c.id === params.get("id")),
    curated = d.collections.find((c) => c.id === params.get("curated")),
    collections = mode === "collections";
  const saved = l.saved.filter(
    (i) =>
      (mode !== "saved" || i.kind === "tech") &&
      (!collection || collection.keys.includes(i.key)) &&
      i.title.toLowerCase().includes(q.toLowerCase()),
  );
  const open = (v: Dialog) => {
    setName(v.name || "");
    setDialog(v);
  };
  const commit = async () => {
    if (!dialog) return;
    const action =
      dialog.type === "new"
        ? "POST"
        : dialog.type === "rename"
          ? "PATCH"
          : "DELETE";
    const ok = await change("collections", action, {
      id: dialog.id,
      ...(action !== "DELETE" ? { name: name.trim() } : {}),
    });
    if (ok) {
      if (action === "DELETE") go("/collections");
      setDialog(null);
      notify(action === "DELETE" ? "Collection deleted" : "Collection saved");
    }
  };
  const item = (i: Saved) => (
    <div className="savedRow" key={i.key}>
      <span className="glyph">
        <Bookmark size={19} />
      </span>
      <div className="grow">
        <Link className="rowTitle" href={address(i.key)}>
          {i.title}
        </Link>
        <div className="meta">
          {i.kind === "tech"
            ? "Technology"
            : i.kind === "news"
              ? "Briefing"
              : "Comparison"}
        </div>
      </div>
      <button
        aria-label={"Organize " + i.title}
        title="Organize in collections"
        className="iconBtn"
        onClick={() => open({ type: "organize", item: i })}
      >
        <FolderPlus size={17} />
      </button>
      <Save itemKey={i.key} title={i.title} />
    </div>
  );
  return (
    <>
      {(collection || curated) && (
        <div className="crumb">
          <Link href="/collections">Collections</Link>
          <ChevronRight size={14} />
          {collection?.name || curated?.name}
        </div>
      )}
      <Head
        title={
          collection?.name ||
          curated?.name ||
          (collections
            ? "Collections"
            : mode === "saved"
              ? "Saved Tools"
              : "My Library")
        }
        sub={
          curated?.description ||
          (collection
            ? "Saved items in this collection."
            : collections
              ? "Explore curated technology lists and organize your own discoveries."
              : mode === "saved"
                ? "The technologies you bookmarked, in one place."
                : "Your saved technologies, briefings, comparisons, and followed topics.")
        }
        action={
          collections && !curated && !collection ? (
            <button className="primary" onClick={() => open({ type: "new" })}>
              <Plus size={16} />
              New collection
            </button>
          ) : undefined
        }
      />
      {curated ? (
        <div className="panel">
          {curated.ids.map((id) => {
            const t = d.choices.find((x) => x.id === id)!;
            return (
              <div className="savedRow" key={id}>
                <span className="glyph">
                  <BookOpen size={18} />
                </span>
                <div className="grow">
                  <Link className="rowTitle" href={"/technology/" + id}>
                    {t.name}
                  </Link>
                  <div className="meta">{t.category}</div>
                </div>
                <Save itemKey={"tech:" + id} title={t.name} />
              </div>
            );
          })}
        </div>
      ) : collections && !collection ? (
        <>
          <Section icon={LibraryIcon} title="Curated collections" />
          <div className="collectionGrid">
            {d.collections.map((c) => (
              <Link
                href={"/collections?curated=" + c.id}
                className="collectionCard"
                key={c.id}
              >
                <span className="glyph">
                  <Folder size={23} />
                </span>
                <h3>{c.name}</h3>
                <p>{c.description}</p>
                <small>{c.ids.length} technologies</small>
              </Link>
            ))}
          </div>
          <Section icon={Folder} title="Your collections" />
          {l.collections.length ? (
            <div className="collectionGrid">
              {l.collections.map((c) => (
                <Link
                  className="collectionCard"
                  href={"/collections?id=" + c.id}
                  key={c.id}
                >
                  <Folder />
                  <h3>{c.name}</h3>
                  <small>{c.keys.length} saved items</small>
                </Link>
              ))}
            </div>
          ) : (
            <Empty
              title="Create your first collection"
              text="Group bookmarks by project, use case, or topic."
            >
              <button onClick={() => open({ type: "new" })}>
                Create collection
              </button>
            </Empty>
          )}
        </>
      ) : (
        <>
          {collection && (
            <div className="actionRow">
              <button
                onClick={() =>
                  open({
                    type: "rename",
                    id: collection.id,
                    name: collection.name,
                  })
                }
              >
                <Pencil size={14} />
                Rename
              </button>
              <button
                onClick={() =>
                  open({
                    type: "delete",
                    id: collection.id,
                    name: collection.name,
                  })
                }
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          )}
          <label className="standaloneLabel">
            Search saved items
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search your bookmarks…"
            />
          </label>
          {saved.length ? (
            <div className="panel">{saved.map(item)}</div>
          ) : (
            <Empty
              title={
                q
                  ? "No matching bookmarks"
                  : collection
                    ? "Your collection is empty"
                    : "No bookmarks yet"
              }
              text={
                collection
                  ? "Open My Library and use the folder button beside a bookmark to add it here."
                  : "Save a technology or briefing using its bookmark button."
              }
            >
              <Link
                className="btn"
                href={collection ? "/library" : "/launches"}
              >
                {collection ? "Open My Library" : "Explore launches"}
              </Link>
            </Empty>
          )}
          {mode === "library" && (
            <section className="panel">
              <Section icon={Bookmark} title="Following" />
              {l.follows.length ? (
                <div className="chips">
                  {l.follows.map((t) => (
                    <Follow topic={t} key={t} />
                  ))}
                </div>
              ) : (
                <p>
                  Follow a topic, company or technology from its detail page.
                </p>
              )}
            </section>
          )}
        </>
      )}
      {dialog && (
        <Modal
          title={
            dialog.type === "new"
              ? "New collection"
              : dialog.type === "rename"
                ? "Rename collection"
                : dialog.type === "delete"
                  ? "Delete collection?"
                  : "Organize bookmark"
          }
          close={() => setDialog(null)}
        >
          {dialog.type === "organize" ? (
            <>
              {l.collections.length ? (
                l.collections.map((c) => (
                  <label className="checkRow" key={c.id}>
                    <input
                      type="checkbox"
                      checked={c.keys.includes(dialog.item!.key)}
                      onChange={(e) =>
                        void change("collections", "PATCH", {
                          id: c.id,
                          key: dialog.item!.key,
                          add: e.target.checked,
                        })
                      }
                    />
                    {c.name}
                  </label>
                ))
              ) : (
                <p>Create a collection to organize this bookmark.</p>
              )}
              <button onClick={() => open({ type: "new" })}>
                <Plus size={14} />
                New collection
              </button>
            </>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void commit();
              }}
            >
              {dialog.type === "delete" ? (
                <p>
                  Delete “{dialog.name}”? Its bookmarks will stay in My Library.
                </p>
              ) : (
                <label className="standaloneLabel">
                  Collection name
                  <input
                    required
                    autoFocus
                    maxLength={80}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
              )}
              <div className="actionRow">
                <button type="button" onClick={() => setDialog(null)}>
                  Cancel
                </button>
                <button
                  className="primary"
                  disabled={dialog.type !== "delete" && !name.trim()}
                >
                  {dialog.type === "delete"
                    ? "Delete collection"
                    : "Save collection"}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </>
  );
}
export function Preferences({ profile = false }: { profile?: boolean }) {
  const { session, l, change, notify } = useApp();
  return (
    <>
      <Head
        title={profile ? "Profile" : "Settings"}
        sub={
          profile
            ? "Your workspace identity and saved content."
            : "Manage discovery preferences and workspace storage."
        }
      />
      {!profile && (
        <section className="panel">
          <Section icon={Settings2} title="Discovery preferences" />
          <label className="standaloneLabel">
            Default pricing filter
            <select
              value={l.preferences.pricing}
              onChange={async (e) => {
                if (
                  await change("preferences", "PUT", {
                    pricing: e.target.value,
                  })
                )
                  notify("Preference saved");
              }}
            >
              <option value="">All pricing</option>
              {prices.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <p>
            Applies to Launch Radar, Technology Explained, Upcoming Radar, and
            Tool Finder.
          </p>
        </section>
      )}
      <section className="panel">
        <Section
          icon={UserRound}
          title={session.authenticated ? "Your account" : "Guest workspace"}
        />
        <p>
          {session.authenticated
            ? "Signed in as " +
              session.name +
              ". Your library syncs with your account."
            : "Your bookmarks, collections, and preferences are saved in this browser."}
        </p>
        {session.hosted ? (
          <a
            className="btn"
            target="_top"
            href={
              (session.authenticated
                ? "/signout-with-chatgpt"
                : "/signin-with-chatgpt") + "?return_to=%2Fprofile"
            }
          >
            <LogIn size={16} />
            {session.authenticated ? "Sign out" : "Sign in with ChatGPT"}
          </a>
        ) : (
          <p className="meta">
            Account sign-in is available on the hosted SEEKR site.
          </p>
        )}
        <div className="chips">
          <Link className="btn" href="/library">
            Open My Library
          </Link>
        </div>
      </section>
      {!profile && session.curator && <Curator />}
      {!profile && (
        <section className="panel">
          <h2>Project source</h2>
          <p>
            Download the application, source catalog, tests, and local setup
            instructions.
          </p>
          <a className="btn" href="/assets/seekr-source.tar.gz" download>
            Download source
          </a>
        </section>
      )}
    </>
  );
}
