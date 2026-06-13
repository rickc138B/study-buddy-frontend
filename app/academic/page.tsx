"use client";
import { useEffect, useState } from "react";
import ModeToggle from "../components/ModeToggle";

interface Course {
  id: string;
  code: string;
  title: string;
  level: number;
}

export default function AcademicPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [error, setError] = useState<string>("");
  const [selected, setSelected] = useState<Course | null>(null);
  const [messages, setMessages] = useState<{role: string; content: string}[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/courses")
      .then(r => {
        console.log("status", r.status);
        return r.json();
      })
      .then(data => {
        console.log("data", data);
        setCourses(Array.isArray(data) ? data : data.courses ?? []);
      })
      .catch(e => {
        console.error(e);
        setError(e.message);
      });
  }, []);

  async function sendMessage() {
    if (!input.trim() || !selected) return;
    const userMsg = { role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: selected.id,
          message: input,
          mode: "study",
          history: messages,
        }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let botContent = "";
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        botContent += decoder.decode(value);
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: botContent };
          return updated;
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <div style={{
        padding: "18px 20px",
        borderBottom: "1px solid var(--line)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "var(--paper-raised)",
      }}>
        <div>
          <div style={{ fontFamily: "monospace", fontSize: 11, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Study Buddy</div>
          <div style={{ fontWeight: 700, fontSize: 17, color: "var(--green)" }}>
            {selected ? `${selected.code} — ${selected.title}` : "Select a course"}
          </div>
        </div>
        <ModeToggle />
      </div>

      {!selected && (
        <div style={{ padding: 20, flex: 1, overflowY: "auto" }}>
          <div style={{ fontFamily: "monospace", fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
            Your courses
          </div>
          {error && <div style={{ color: "red", fontSize: 13, marginBottom: 12 }}>Error: {error}</div>}
          {courses.length === 0 && !error && (
            <div style={{ color: "var(--muted)", fontSize: 13 }}>Loading courses...</div>
          )}
          {courses.map(c => (
            <div
              key={c.id}
              onClick={() => setSelected(c)}
              style={{
                padding: "14px 16px",
                marginBottom: 8,
                background: "var(--paper-raised)",
                border: "1px solid var(--line)",
                borderRadius: 12,
                cursor: "pointer",
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 15 }}>{c.code}</div>
              <div style={{ fontSize: 13, color: "var(--muted)" }}>{c.title}</div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <>
          <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                maxWidth: "85%",
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                padding: "12px 14px",
                borderRadius: 14,
                fontSize: 13.5,
                lineHeight: 1.6,
                background: m.role === "user" ? "var(--green)" : "var(--paper-raised)",
                color: m.role === "user" ? "var(--paper)" : "var(--ink)",
                border: m.role === "user" ? "none" : "1px solid var(--line)",
              }}>
                {m.content || (loading ? "..." : "")}
              </div>
            ))}
          </div>
          <div style={{
            padding: "12px 20px 20px",
            display: "flex",
            gap: 10,
            borderTop: "1px solid var(--line)",
            background: "var(--paper-raised)",
          }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendMessage()}
              placeholder={`Ask about ${selected.code}...`}
              style={{
                flex: 1,
                padding: "12px 16px",
                borderRadius: 100,
                border: "1px solid var(--line)",
                background: "var(--paper)",
                fontSize: 14,
                outline: "none",
                fontFamily: "inherit",
              }}
            />
            <button
              onClick={sendMessage}
              disabled={loading}
              style={{
                width: 42, height: 42,
                borderRadius: "50%",
                background: "var(--green)",
                color: "var(--paper)",
                border: "none",
                cursor: "pointer",
                fontSize: 18,
                flexShrink: 0,
              }}
            >↑</button>
          </div>
        </>
      )}
    </div>
  );
}
