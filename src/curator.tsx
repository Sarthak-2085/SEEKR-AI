import React, { useState } from "react";
import { Check, Newspaper, RefreshCw } from "lucide-react";
import { useApp, useData } from "./context";
import { api, News } from "./model";
import { Err, Load, Modal, Out, Section } from "./ui";
interface Queue {
  sources: string[];
  pending: News[];
  logs: {
    id: string;
    time: string;
    source: string;
    status: string;
    detail: string;
  }[];
}
export function Curator() {
  const r = useData<Queue>("admin/ingestion"),
    { notify } = useApp(),
    [selected, setSelected] = useState<News | null>(null),
    [busy, setBusy] = useState(false),
    [why, setWhy] = useState(""),
    [reject, setReject] = useState(false);
  const apply = async (fn: () => Promise<unknown>, message: string) => {
    setBusy(true);
    try {
      await fn();
      r.retry();
      setSelected(null);
      notify(message);
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="panel">
      <Section icon={Newspaper} title="Editorial review" />
      <p>
        Official feeds are checked daily while SEEKR runs. Read the original
        source before publishing a briefing.
      </p>
      {r.error ? (
        <Err error={r.error} retry={r.retry} />
      ) : !r.data ? (
        <Load />
      ) : (
        <>
          <div className="chips">
            {r.data.sources.map((s) => (
              <button
                disabled={busy}
                key={s}
                onClick={() =>
                  void apply(async () => {
                    const v = await api<{ status: string; detail: string }>(
                      "admin/ingestion",
                      "POST",
                      { source: s },
                    );
                    if (v.status !== "ok") throw Error(v.detail);
                  }, "Feed checked")
                }
              >
                <RefreshCw size={14} />
                Fetch {s}
              </button>
            ))}
          </div>
          <h3 className="reviewTitle">
            Pending stories ({r.data.pending.length})
          </h3>
          {r.data.pending.length ? (
            <div className="queue">
              {r.data.pending.map((n) => (
                <div className="savedRow" key={n.id}>
                  <div className="grow">
                    <b>{n.title}</b>
                    <div className="meta">
                      {n.publisher} · {n.date}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelected(n);
                      setWhy("");
                      setReject(false);
                    }}
                  >
                    Review
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p>The review queue is empty.</p>
          )}
          {r.data.logs.length > 0 && (
            <details>
              <summary>Ingestion history</summary>
              {r.data.logs.slice(0, 15).map((log) => (
                <p className="meta" key={log.id}>
                  {log.time.slice(0, 16).replace("T", " ")} UTC · {log.source} ·{" "}
                  {log.detail}
                </p>
              ))}
            </details>
          )}
        </>
      )}
      {selected && (
        <Modal
          title={reject ? "Dismiss this story?" : "Review briefing"}
          close={() => setSelected(null)}
        >
          {reject ? (
            <>
              <p>{selected.title}</p>
              <div className="actionRow">
                <button onClick={() => setReject(false)}>Back</button>
                <button
                  disabled={busy}
                  onClick={() =>
                    void apply(
                      () =>
                        api("admin/review", "PATCH", {
                          id: selected.id,
                          action: "rejected",
                        }),
                      "Story dismissed",
                    )
                  }
                >
                  Dismiss story
                </button>
              </div>
            </>
          ) : (
            <form
              className="stack"
              onSubmit={(e) => {
                e.preventDefault();
                void apply(
                  () =>
                    api("admin/review", "PATCH", {
                      id: selected.id,
                      title: selected.title,
                      summary: selected.summary,
                      why: why.trim(),
                      action: "approved",
                    }),
                  "Briefing published",
                );
              }}
            >
              <Out href={selected.url}>Read publisher source</Out>
              <label className="standaloneLabel">
                Headline
                <input
                  required
                  maxLength={180}
                  value={selected.title}
                  onChange={(e) =>
                    setSelected({ ...selected, title: e.target.value })
                  }
                />
              </label>
              <label className="standaloneLabel">
                Summary
                <textarea
                  required
                  maxLength={800}
                  rows={3}
                  value={selected.summary}
                  onChange={(e) =>
                    setSelected({ ...selected, summary: e.target.value })
                  }
                />
              </label>
              <label className="standaloneLabel">
                Why it matters
                <textarea
                  required
                  maxLength={800}
                  rows={2}
                  value={why}
                  onChange={(e) => setWhy(e.target.value)}
                />
              </label>
              <div className="actionRow">
                <button type="button" onClick={() => setReject(true)}>
                  Dismiss
                </button>
                <button className="primary" disabled={busy || !why.trim()}>
                  <Check size={15} />
                  Publish briefing
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </section>
  );
}
