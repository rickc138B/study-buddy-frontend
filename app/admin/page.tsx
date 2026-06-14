"use client";
import { useEffect, useState, useRef } from "react";

const API = "";

// ── Types ────────────────────────────────────────────────────────────────────
interface Course {
  id: string; code: string; title: string; level: number;
  departments?: { name: string };
}
interface Domain {
  id: string; type: string; code: string; title: string; metadata: any;
}
interface Material {
  id: string; filename: string; file_type: string; chunk_count: number;
  status: string; error_message?: string; uploaded_at: string;
}

type Section = "courses" | "domains";
type Selected = { kind: "course"; data: Course } | { kind: "domain"; data: Domain } | null;

export default function AdminPage() {
  const [section, setSection]       = useState<Section>("courses");
  const [courses, setCourses]       = useState<Course[]>([]);
  const [domains, setDomains]       = useState<Domain[]>([]);
  const [selected, setSelected]     = useState<Selected>(null);
  const [materials, setMaterials]   = useState<Material[]>([]);
  const [fileType, setFileType]     = useState("syllabus");
  const [toast, setToast]           = useState<{ msg: string; ok: boolean } | null>(null);
  const [modal, setModal]           = useState<"course" | "domain" | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pollRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchCourses();
    fetchDomains();
  }, []);

  async function fetchCourses() {
    try {
      const res = await fetch(`${API}/api/admin/courses`);
      const data = await res.json();
      setCourses(Array.isArray(data) ? data : data.courses ?? []);
    } catch { showToast("Cannot reach API", false); }
  }

  async function fetchDomains() {
    try {
      const res = await fetch(`${API}/api/admin/domains`);
      if (!res.ok) return;
      const data = await res.json();
      setDomains(Array.isArray(data) ? data : []);
    } catch {}
  }

  // ── Materials ─────────────────────────────────────────────────────────────
  async function loadMaterials(id: string, kind: "course" | "domain") {
    try {
      const url = kind === "domain"
        ? `${API}/api/admin/domains/${id}/materials`
        : `${API}/api/admin/ingest/course/${id}`;
      const res = await fetch(url);
      const data = await res.json();
      setMaterials(Array.isArray(data) ? data : []);
      data.forEach((m: Material) => {
        if (m.status === "pending" || m.status === "processing") startPolling(m.id, kind);
      });
    } catch { setMaterials([]); }
  }

  async function selectItem(item: Selected) {
    setSelected(item);
    setSidebarOpen(false);
    if (item) await loadMaterials(item.data.id, item.kind);
  }

  // ── Upload ────────────────────────────────────────────────────────────────
  async function handleFiles(files: FileList | null) {
    if (!files || !selected) return;
    for (const file of Array.from(files)) await uploadFile(file);
  }

  async function uploadFile(file: File) {
    if (!selected) return;
    const tempId = "temp-" + Date.now();
    setMaterials(prev => [{ id: tempId, filename: file.name, file_type: fileType, chunk_count: 0, status: "pending", uploaded_at: new Date().toISOString() }, ...prev]);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("fileType", fileType);
    const uploadUrl = selected.kind === "domain"
      ? `${API}/api/admin/domains/${selected.data.id}/upload`
      : `${API}/api/admin/ingest/upload`;
    if (selected.kind === "course") fd.append("courseId", selected.data.id);
    try {
      const res = await fetch(uploadUrl, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Upload failed");
      setMaterials(prev => prev.map(m => m.id === tempId
        ? { id: data.materialId, filename: data.filename, file_type: fileType, chunk_count: 0, status: "pending", uploaded_at: new Date().toISOString() }
        : m
      ));
      startPolling(data.materialId, selected.kind);
      showToast(`${file.name} uploaded`, true);
    } catch (e: any) {
      setMaterials(prev => prev.filter(m => m.id !== tempId));
      showToast(e.message, false);
    }
  }

  // ── Polling ───────────────────────────────────────────────────────────────
  function startPolling(materialId: string, kind: "course" | "domain" = "course") {
    if (pollRef.current[materialId]) return;
    pollRef.current[materialId] = setInterval(async () => {
      try {
        const statusUrl = kind === "domain"
          ? `${API}/api/admin/domains/materials/status/${materialId}`
          : `${API}/api/admin/ingest/status/${materialId}`;
        const m = await fetch(statusUrl).then(r => r.json());
        setMaterials(prev => prev.map(mat => mat.id === materialId
          ? { ...mat, status: m.status, chunk_count: m.chunkCount ?? mat.chunk_count, error_message: m.error }
          : mat
        ));
        if (m.status === "completed" || m.status === "failed") {
          clearInterval(pollRef.current[materialId]);
          delete pollRef.current[materialId];
        }
      } catch {}
    }, 2000);
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  async function reprocess(id: string) {
    await fetch(`${API}/api/admin/ingest/reprocess/${id}`, { method: "POST" });
    setMaterials(prev => prev.map(m => m.id === id ? { ...m, status: "processing" } : m));
    startPolling(id);
    showToast("Reprocessing…", true);
  }

  async function deleteMaterial(id: string) {
    if (!confirm("Delete this file and all its chunks?")) return;
    await fetch(`${API}/api/admin/ingest/${id}`, { method: "DELETE" });
    setMaterials(prev => prev.filter(m => m.id !== id));
    showToast("Deleted", true);
  }

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  // ── Drag & drop ───────────────────────────────────────────────────────────
  function onDragOver(e: React.DragEvent) { e.preventDefault(); }
  function onDrop(e: React.DragEvent) { e.preventDefault(); handleFiles(e.dataTransfer.files); }

  const FILE_TYPES = section === "domains"
    ? ["legislation", "manifesto", "inec_guide", "news", "other"]
    : ["syllabus", "slides", "past_exam", "notes", "other"];

  const selectedName = selected
    ? selected.kind === "course"
      ? `${selected.data.code} — ${(selected.data as Course).title}`
      : `${(selected.data as Domain).code} — ${(selected.data as Domain).title}`
    : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--paper)", color: "var(--ink)" }}>

      {/* ── Header ── */}
      <div style={{
        padding: "14px 20px", borderBottom: "1px solid var(--line)",
        background: "var(--paper-raised)", display: "flex", alignItems: "center", gap: 12,
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <button onClick={() => setSidebarOpen(s => !s)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--muted)", display: "none" }} id="hamburger">
          ☰
        </button>
        <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Study Buddy</span>
        <span style={{ fontFamily: "monospace", fontSize: 10, background: "var(--green)", color: "var(--paper)", borderRadius: 100, padding: "2px 8px" }}>Admin</span>
        <div style={{ flex: 1 }} />
        {selectedName && (
          <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--muted)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {selectedName}
          </span>
        )}
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── Sidebar ── */}
        <div style={{
          width: 240, borderRight: "1px solid var(--line)", background: "var(--paper-raised)",
          display: "flex", flexDirection: "column", overflowY: "auto", flexShrink: 0,
        }}>
          {/* Section tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid var(--line)" }}>
            {(["courses", "domains"] as Section[]).map(s => (
              <button key={s} onClick={() => { setSection(s); setSelected(null); setMaterials([]); }} style={{
                flex: 1, padding: "12px 0", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
                fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.08em",
                background: section === s ? "var(--green-soft)" : "transparent",
                color: section === s ? "var(--green)" : "var(--muted)",
                borderBottom: section === s ? "2px solid var(--green)" : "2px solid transparent",
              }}>{s}</button>
            ))}
          </div>

          {/* List */}
          <div style={{ flex: 1, padding: "12px 10px", overflowY: "auto" }}>
            {section === "courses" && (
              <>
                {courses.length === 0 && (
                  <div style={{ fontSize: 12, color: "var(--muted)", padding: "8px 6px" }}>No courses yet</div>
                )}
                {Object.entries(
                  courses.reduce((acc, c) => { (acc[c.level] = acc[c.level] ?? []).push(c); return acc; }, {} as Record<number, Course[]>)
                ).sort().map(([level, cs]) => (
                  <div key={level} style={{ marginBottom: 16 }}>
                    <div style={{ fontFamily: "monospace", fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", padding: "0 6px", marginBottom: 6 }}>{level} Level</div>
                    {cs.map(c => (
                      <div key={c.id} onClick={() => selectItem({ kind: "course", data: c })} style={{
                        padding: "10px 10px", borderRadius: 8, cursor: "pointer", marginBottom: 2,
                        background: selected?.data.id === c.id ? "var(--green-soft)" : "transparent",
                        border: `1px solid ${selected?.data.id === c.id ? "var(--green)" : "transparent"}`,
                      }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "var(--green)" }}>{c.code}</div>
                        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</div>
                      </div>
                    ))}
                  </div>
                ))}
                <button onClick={() => setModal("course")} style={{
                  width: "100%", padding: "8px 0", border: "1px dashed var(--line)", borderRadius: 8,
                  background: "transparent", color: "var(--muted)", cursor: "pointer", fontSize: 12, marginTop: 4,
                }}>+ Add Course</button>
              </>
            )}

            {section === "domains" && (
              <>
                {domains.length === 0 && (
                  <div style={{ fontSize: 12, color: "var(--muted)", padding: "8px 6px" }}>No domains yet</div>
                )}
                {domains.map(d => (
                  <div key={d.id} onClick={() => selectItem({ kind: "domain", data: d })} style={{
                    padding: "10px 10px", borderRadius: 8, cursor: "pointer", marginBottom: 2,
                    background: selected?.data.id === d.id ? "var(--green-soft)" : "transparent",
                    border: `1px solid ${selected?.data.id === d.id ? "var(--green)" : "transparent"}`,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <span style={{
                        fontFamily: "monospace", fontSize: 9, padding: "1px 6px", borderRadius: 100,
                        background: d.type === "civic" ? "#DCE7DE" : d.type === "jamb" ? "#F4E8D0" : "var(--line)",
                        color: d.type === "civic" ? "var(--green)" : d.type === "jamb" ? "var(--ochre)" : "var(--muted)",
                        textTransform: "uppercase",
                      }}>{d.type}</span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "var(--green)" }}>{d.code}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.title}</div>
                  </div>
                ))}
                <button onClick={() => setModal("domain")} style={{
                  width: "100%", padding: "8px 0", border: "1px dashed var(--line)", borderRadius: 8,
                  background: "transparent", color: "var(--muted)", cursor: "pointer", fontSize: 12, marginTop: 4,
                }}>+ Add Domain</button>
              </>
            )}
          </div>
        </div>

        {/* ── Main panel ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          {!selected ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--muted)", gap: 8 }}>
              <div style={{ fontSize: 32 }}>📂</div>
              <div style={{ fontFamily: "monospace", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Select a {section === "courses" ? "course" : "domain"} to manage
              </div>
            </div>
          ) : (
            <>
              {/* Panel header */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ fontFamily: "monospace", fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
                    {selected.kind === "domain" ? (selected.data as Domain).type : `Level ${(selected.data as Course).level}`}
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 22, color: "var(--green)" }}>{selected.data.code}</div>
                  <div style={{ fontSize: 14, color: "var(--muted)", marginTop: 2 }}>
                    {selected.kind === "course" ? (selected.data as Course).title : (selected.data as Domain).title}
                    {" · "}{materials.length} file{materials.length !== 1 ? "s" : ""}
                  </div>
                </div>
                <div style={{ fontFamily: "monospace", fontSize: 10, color: "var(--muted)", padding: "6px 10px", border: "1px solid var(--line)", borderRadius: 6, maxWidth: 200, wordBreak: "break-all" }}>
                  ID: {selected.data.id}
                </div>
              </div>

              {/* Upload zone */}
              <div
                onDragOver={onDragOver} onDrop={onDrop}
                onClick={() => document.getElementById("file-input")?.click()}
                style={{
                  border: "2px dashed var(--line)", borderRadius: 14, padding: "28px 20px",
                  textAlign: "center", cursor: "pointer", marginBottom: 16, transition: "all 0.2s",
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--green)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--line)")}
              >
                <div style={{ fontSize: 24, marginBottom: 8 }}>↑</div>
                <div style={{ fontSize: 14, color: "var(--ink)", fontWeight: 600 }}>Tap to upload</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>PDF, DOCX, PPTX, TXT · drag & drop works too</div>
                <input id="file-input" type="file" multiple accept=".pdf,.docx,.pptx,.txt" style={{ display: "none" }} onChange={e => handleFiles(e.target.files)} />
              </div>

              {/* File type pills */}
              <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
                {FILE_TYPES.map(t => (
                  <button key={t} onClick={() => setFileType(t)} style={{
                    padding: "5px 14px", borderRadius: 100, fontSize: 12, cursor: "pointer",
                    border: `1px solid ${fileType === t ? "var(--green)" : "var(--line)"}`,
                    background: fileType === t ? "var(--green-soft)" : "transparent",
                    color: fileType === t ? "var(--green)" : "var(--muted)",
                    fontWeight: fileType === t ? 600 : 400,
                  }}>{t.replace("_", " ")}</button>
                ))}
              </div>

              {/* Materials list */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {materials.length === 0 && (
                  <div style={{ textAlign: "center", color: "var(--muted)", padding: "32px 0", fontSize: 13, fontFamily: "monospace" }}>
                    No files yet — upload the first document above
                  </div>
                )}
                {materials.map(m => (
                  <div key={m.id} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
                    background: "var(--paper-raised)", border: "1px solid var(--line)", borderRadius: 12, flexWrap: "wrap",
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.filename}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                        {m.file_type} · {m.chunk_count ? `${m.chunk_count} chunks` : "—"} · {new Date(m.uploaded_at).toLocaleDateString()}
                      </div>
                      <div style={{ marginTop: 6 }}><StatusBadge status={m.status} error={m.error_message} /></div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      {m.status === "failed" && (
                        <button onClick={() => reprocess(m.id)} style={actionBtn}>Retry</button>
                      )}
                      <button onClick={() => deleteMaterial(m.id)} style={{ ...actionBtn, color: "#B91C1C" }}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Add Course Modal ── */}
      {modal === "course" && (
        <AddCourseModal
          apiBase={API}
          onClose={() => setModal(null)}
          onCreated={(c: Course) => { setCourses(prev => [...prev, c]); setModal(null); showToast(`${c.code} created`, true); }}
          showToast={showToast}
        />
      )}

      {/* ── Add Domain Modal ── */}
      {modal === "domain" && (
        <AddDomainModal
          apiBase={API}
          onClose={() => setModal(null)}
          onCreated={(d: Domain) => { setDomains(prev => [...prev, d]); setModal(null); showToast(`${d.code} created`, true); }}
          showToast={showToast}
        />
      )}

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: "var(--paper-raised)", border: `1px solid ${toast.ok ? "var(--green)" : "#B91C1C"}`,
          color: toast.ok ? "var(--green)" : "#B91C1C", borderRadius: 10, padding: "10px 20px",
          fontSize: 13, fontWeight: 600, zIndex: 200, whiteSpace: "nowrap",
          fontFamily: "monospace",
        }}>{toast.msg}</div>
      )}
    </div>
  );
}

// ── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status, error }: { status: string; error?: string }) {
  const colors: Record<string, [string, string]> = {
    completed:  ["#052e16", "#4ade80"],
    failed:     ["#fef2f2", "#B91C1C"],
    processing: ["#fefce8", "#92400e"],
    pending:    ["var(--green-soft)", "var(--muted)"],
  };
  const [bg, fg] = colors[status] ?? ["var(--line)", "var(--muted)"];
  return (
    <span title={error} style={{
      display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 10px",
      borderRadius: 100, fontSize: 11, fontWeight: 600, background: bg, color: fg,
      fontFamily: "monospace",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: fg, display: "inline-block" }} />
      {status}
    </span>
  );
}

// ── Add Course Modal ──────────────────────────────────────────────────────────
function AddCourseModal({ apiBase, onClose, onCreated, showToast }: any) {
  const [depts, setDepts]   = useState<any[]>([]);
  const [code, setCode]     = useState("");
  const [title, setTitle]   = useState("");
  const [level, setLevel]   = useState("300");
  const [deptId, setDeptId] = useState("");

  useEffect(() => {
    fetch(`${apiBase}/api/admin/courses/departments`).then(r => r.json()).then(d => {
      setDepts(Array.isArray(d) ? d : []);
      if (d.length) setDeptId(d[0].id);
    });
  }, []);

  async function save() {
    if (!code || !title || !deptId) return showToast("Fill in all fields", false);
    const res = await fetch(`${apiBase}/api/admin/courses`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ departmentId: deptId, code: code.toUpperCase(), title, level: parseInt(level) }),
    });
    const data = await res.json();
    if (!res.ok) return showToast(data.message ?? "Error", false);
    onCreated(data);
  }

  return <Modal title="Add Course" onClose={onClose}>
    <Label>Department</Label>
    <select value={deptId} onChange={e => setDeptId(e.target.value)} style={inputStyle}>
      {depts.map(d => <option key={d.id} value={d.id}>{d.code} — {d.name}</option>)}
    </select>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, margin: "12px 0" }}>
      <div><Label>Code</Label><input value={code} onChange={e => setCode(e.target.value)} placeholder="CS301" style={inputStyle} /></div>
      <div><Label>Level</Label>
        <select value={level} onChange={e => setLevel(e.target.value)} style={inputStyle}>
          {["100","200","300","400","500"].map(l => <option key={l}>{l}</option>)}
        </select>
      </div>
    </div>
    <Label>Title</Label>
    <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Data Structures and Algorithms" style={{ ...inputStyle, marginBottom: 20 }} />
    <ModalActions onClose={onClose} onSave={save} saveLabel="Create Course" />
  </Modal>;
}

// ── Add Domain Modal ──────────────────────────────────────────────────────────
function AddDomainModal({ apiBase, onClose, onCreated, showToast }: any) {
  const [type, setType]   = useState("civic");
  const [code, setCode]   = useState("");
  const [title, setTitle] = useState("");

  async function save() {
    if (!code || !title) return showToast("Fill in all fields", false);
    const res = await fetch(`${apiBase}/api/admin/domains`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, code: code.toUpperCase(), title }),
    });
    const data = await res.json();
    if (!res.ok) return showToast(data.message ?? "Error", false);
    onCreated(data);
  }

  return <Modal title="Add Domain" onClose={onClose}>
    <Label>Type</Label>
    <select value={type} onChange={e => setType(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }}>
      <option value="civic">civic</option>
      <option value="jamb">jamb</option>
      <option value="academic">academic</option>
    </select>
    <Label>Code</Label>
    <input value={code} onChange={e => setCode(e.target.value)} placeholder="ELECTIONS_2027" style={{ ...inputStyle, marginBottom: 12 }} />
    <Label>Title</Label>
    <input value={title} onChange={e => setTitle(e.target.value)} placeholder="2027 Nigerian Elections" style={{ ...inputStyle, marginBottom: 20 }} />
    <ModalActions onClose={onClose} onSave={save} saveLabel="Create Domain" />
  </Modal>;
}

// ── Shared modal shell ────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
      <div style={{ background: "var(--paper-raised)", border: "1px solid var(--line)", borderRadius: 16, padding: 24, width: "100%", maxWidth: 400 }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: "var(--green)", marginBottom: 16 }}>{title}</div>
        {children}
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: "monospace", fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>{children}</div>;
}

function ModalActions({ onClose, onSave, saveLabel }: { onClose: () => void; onSave: () => void; saveLabel: string }) {
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
      <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--line)", background: "transparent", color: "var(--muted)", cursor: "pointer", fontSize: 13 }}>Cancel</button>
      <button onClick={onSave} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--green)", color: "var(--paper)", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>{saveLabel}</button>
    </div>
  );
}

const actionBtn: React.CSSProperties = {
  padding: "5px 12px", borderRadius: 6, border: "1px solid var(--line)",
  background: "transparent", color: "var(--muted)", cursor: "pointer", fontSize: 12,
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--line)",
  background: "var(--paper)", color: "var(--ink)", fontSize: 14, outline: "none",
  fontFamily: "inherit", boxSizing: "border-box",
};
