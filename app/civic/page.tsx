"use client";
import { useState } from "react";
import ModeToggle from "../components/ModeToggle";

const topics = [
  { key: "elections", icon: "🗳", title: "Elections near you", desc: "What's coming up, and when", color: "ochre" },
  { key: "compare", icon: "⚖", title: "Compare candidates", desc: "See where they stand, side by side", color: "green" },
  { key: "rights", icon: "📋", title: "Voting process & your rights", desc: "What to expect, what's allowed", color: "ochre" },
  { key: "represent", icon: "🏛", title: "Who represents you", desc: "From president to your ward, in order", color: "green" },
  { key: "dates", icon: "📅", title: "Key dates & deadlines", desc: "Registration, PVC collection, election day", color: "green" },
  { key: "verify", icon: "🔍", title: "Verify a claim", desc: "Check quotes & promises against sources", color: "ochre" },
  { key: "track", icon: "📜", title: "Track record", desc: "2019 promises vs. what happened since", color: "green" },
];

const reps = [
  { level: "President", name: "Bola Tinubu", party: "APC", indent: 0 },
  { level: "Governor, Imo State", name: "Hope Uzodinma", party: "APC", indent: 1 },
  { level: "Senator, Owerri Zone", name: "—", party: "—", indent: 2 },
  { level: "House of Reps", name: "—", party: "—", indent: 2 },
  { level: "State Assembly", name: "—", party: "—", indent: 3 },
  { level: "LGA Chairman", name: "—", party: "—", indent: 4 },
];

const seeds: Record<string, { title: string; msgs: [string, string][] }> = {
  elections: {
    title: "Elections near you",
    msgs: [
      ["bot", "Here's what's coming up for Imo State and the federal level:"],
      ["bot", "<b>2027 General Election</b> (President, Senate, House of Reps, State Assembly) — Feb 2027, exact date TBC by INEC.<br><br><b>Imo State Governorship</b> — runs off-cycle, next due ~Nov 2027.<br><br><b>LGA elections (Owerri Municipal)</b> — run by Imo SIEC, schedule not yet announced. <span class='source'>§ INEC calendar</span>"],
      ["user", "Why is the governorship separate from the presidential election?"],
      ["bot", "A handful of states ended up on a different election cycle due to past court rulings on tenure. Your governor isn't elected at the same time as the president, even though both control Imo's budget and security funding. <span class='source'>§ INEC, 2019 cycle notes</span>"],
    ],
  },
  compare: {
    title: "Compare candidates",
    msgs: [
      ["user", "What are Candidate A and B saying about education?"],
      ["bot", "<b>Candidate A (APGA)</b> — promises free tertiary tuition for low-income households, funded via a new state education levy. <span class='source'>§ Manifesto, p.14</span><br><br><b>Candidate B (LP)</b> — focuses on rebuilding public school infrastructure across all 27 LGAs in first term. <span class='source'>§ Manifesto, p.9</span>"],
      ["user", "Which one is more specific about funding?"],
      ["bot", "Candidate A names a specific mechanism (education levy). Candidate B's manifesto doesn't specify a funding source — it's a priority without a budget line. <span class='source'>§ Manifesto comparison</span>"],
    ],
  },
  rights: {
    title: "Voting process & your rights",
    msgs: [
      ["user", "Can someone ask who I voted for?"],
      ["bot", "No. Under the Electoral Act 2022, your vote is secret. No party agent, official, or security personnel can pressure you to reveal who you voted for. <span class='source'>§ Electoral Act 2022, s.61</span>"],
      ["user", "What if BVAS isn't working at my unit?"],
      ["bot", "INEC's contingency plan allows manual accreditation using the voter register if BVAS fails. You're still entitled to vote — don't leave without raising it with the presiding officer. <span class='source'>§ INEC Regulations 2022</span>"],
    ],
  },
  represent: {
    title: "Who represents you",
    msgs: [
      ["bot", "Based on Owerri Municipal, Imo State — here's your chain of representation."],
      ["user", "What does my State Assembly member actually do?"],
      ["bot", "They sit in the Imo State House of Assembly and vote on state laws and budgets — healthcare funding, LGA allocations, state-level policy. Often the most reachable elected office for direct contact. <span class='source'>§ 1999 Constitution, s.4</span>"],
      ["user", "And the LGA Chairman?"],
      ["bot", "The LGA Chairman runs day-to-day local government — primary healthcare, local roads, markets, and the LGA's federal allocation share. Closest to daily life, least covered in media. <span class='source'>§ Local Govt Act</span>"],
    ],
  },
  dates: {
    title: "Key dates & deadlines",
    msgs: [
      ["user", "When does voter registration close?"],
      ["bot", "INEC typically closes CVR about 90 days before a general election. For 2027, that places the deadline around <b>November 2026</b> — INEC will confirm the exact date. <span class='source'>§ INEC CVR guidelines</span>"],
      ["user", "What about collecting my PVC?"],
      ["bot", "PVC collection is ongoing at your registration centre — bring your registration slip or valid ID. Collect well before the deadline; collection points get congested closer to election day. <span class='source'>§ INEC Voter Guide</span>"],
    ],
  },
  verify: {
    title: "Verify a claim",
    msgs: [
      ["user", "I saw a post saying Candidate A wants to ban okada completely."],
      ["bot", "I checked Candidate A's manifesto and recent statements — no complete ban found. The manifesto mentions <i>restricting okada from major highways</i> as part of a road safety plan, not a state-wide ban. <span class='source'>§ Manifesto, p.22</span><br><br>This looks like an exaggerated version of the actual policy."],
      ["user", "Where did the original statement come from?"],
      ["bot", "The closest matching statement is from a town hall covered by Daily Sun in May 2026 — it discusses highway restrictions, not a full ban. Treat the version you saw as unverified until traced to that source. <span class='source'>§ Daily Sun, May 2026</span>"],
    ],
  },
  track: {
    title: "Track record",
    msgs: [
      ["bot", "In 2019, Candidate A promised 50 new public schools within one term. <span class='source'>§ 2019 Manifesto, p.7</span><br><br>Reporting from 2023 shows 18 were completed, with funding gaps cited for the rest. <span class='source'>§ ICIR, Mar 2023</span>"],
      ["user", "How does that compare to their 2027 promise?"],
      ["bot", "The 2027 manifesto repeats a similar pledge — 40 new schools — but this time specifies the education levy as funding source, which wasn't in the 2019 plan. Worth asking the candidate directly if that addresses the previous gap. <span class='source'>§ 2027 Manifesto, p.11</span>"],
    ],
  },
};

export default function CivicPage() {
  const [chat, setChat] = useState<{ title: string; msgs: [string, string][] } | null>(null);
  const [input, setInput] = useState("");

  function openChat(key: string) {
    setChat(seeds[key] ?? { title: "Ask Civic Buddy", msgs: [["bot", "Ask me anything about candidates, your rights, or the election process."]] });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{
        padding: "18px 20px 16px",
        borderBottom: "1px solid var(--line)",
        background: "var(--paper-raised)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--green)", border: "1px solid var(--green)", borderRadius: 100, padding: "3px 10px", letterSpacing: "0.1em" }}>● CIVIC BUDDY</span>
          <ModeToggle />
        </div>
        <div style={{ fontWeight: 800, fontSize: 28, color: "var(--green)", lineHeight: 1.2, marginBottom: 6 }}>What do you<br />need to know?</div>
        <div style={{ fontSize: 13.5, color: "var(--muted)" }}>Every answer is backed by a real source.</div>
      </div>

      {/* Constituency */}
      <div style={{ margin: "16px 20px 0", padding: "12px 16px", background: "var(--paper-raised)", border: "1px solid var(--line)", borderRadius: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontFamily: "monospace", fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Your constituency</div>
          <div style={{ fontWeight: 600, fontSize: 15, marginTop: 2 }}>Owerri Municipal, Imo State</div>
        </div>
        <button style={{ fontWeight: 600, fontSize: 13, color: "var(--green)", background: "none", border: "none", cursor: "pointer" }}>Change</button>
      </div>

      {/* Representatives */}
      <div style={{ fontFamily: "monospace", fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", margin: "20px 20px 10px" }}>Your representatives</div>
      <div style={{ margin: "0 20px", border: "1px solid var(--line)", borderRadius: 14, overflow: "hidden", background: "var(--paper-raised)" }}>
        {reps.map((r, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: `12px 16px 12px ${16 + r.indent * 14}px`,
            borderBottom: i < reps.length - 1 ? "1px solid var(--line)" : "none",
            fontSize: 13,
          }}>
            {r.indent > 0 && <span style={{ color: "var(--line)", marginLeft: -10 }}>↳</span>}
            <span style={{ flex: 1, fontFamily: "monospace", fontSize: 10.5, color: "var(--muted)", textTransform: "uppercase" }}>{r.level}</span>
            <span style={{ fontWeight: 600 }}>{r.name}</span>
            <span style={{ fontFamily: "monospace", fontSize: 10, color: "var(--green)", background: "var(--green-soft)", padding: "2px 8px", borderRadius: 100 }}>{r.party}</span>
          </div>
        ))}
        <div onClick={() => openChat("represent")} style={{ padding: "12px 16px", background: "var(--green-soft)", color: "var(--green)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
          💬 Ask what each of these roles actually does
        </div>
      </div>

      {/* Topic cards */}
      <div style={{ fontFamily: "monospace", fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", margin: "20px 20px 10px" }}>Browse by topic</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 20px" }}>
        {topics.map(t => (
          <div key={t.key} onClick={() => openChat(t.key)} style={{
            display: "flex", alignItems: "center", gap: 14, padding: 14,
            background: "var(--paper-raised)", border: "1px solid var(--line)",
            borderRadius: 14, cursor: "pointer",
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0,
              background: t.color === "green" ? "var(--green-soft)" : "#F4E8D0",
              color: t.color === "green" ? "var(--green)" : "var(--ochre)",
            }}>{t.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{t.title}</div>
              <div style={{ fontSize: 13, color: "var(--muted)" }}>{t.desc}</div>
            </div>
            <span style={{ color: "var(--line)", fontSize: 18 }}>→</span>
          </div>
        ))}
      </div>

      {/* Ask anything */}
      <div onClick={() => openChat("general")} style={{
        margin: "20px 20px 32px", display: "flex", alignItems: "center", gap: 10,
        padding: "14px 18px", border: "1px solid var(--green)", borderRadius: 100,
        background: "var(--paper-raised)", cursor: "pointer",
      }}>
        <span style={{ flex: 1, fontSize: 14, color: "var(--muted)" }}>Or ask anything else...</span>
        <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--green)", color: "var(--paper)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>↑</div>
      </div>

      <div style={{ textAlign: "center", fontFamily: "monospace", fontSize: 11, color: "var(--muted)", paddingBottom: 28 }}>
        Every answer cites its source — tap § to verify
      </div>

      {/* Chat overlay */}
      {chat && (
        <div style={{
          position: "fixed", top: 0, right: 0, width: "100%", maxWidth: 480, height: "100vh",
          background: "var(--paper)", display: "flex", flexDirection: "column", zIndex: 10,
        }}>
          <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--line)", background: "var(--paper-raised)", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            <button onClick={() => setChat(null)} style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid var(--line)", background: "var(--paper)", fontSize: 16, cursor: "pointer", color: "var(--green)" }}>←</button>
            <span style={{ fontWeight: 700, fontSize: 18, color: "var(--green)" }}>{chat.title}</span>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
            {chat.msgs.map(([role, html], i) => (
              <div key={i} style={{
                maxWidth: "85%", alignSelf: role === "user" ? "flex-end" : "flex-start",
                padding: "12px 14px", borderRadius: 14, fontSize: 13.5, lineHeight: 1.6,
                background: role === "user" ? "var(--green)" : "var(--paper-raised)",
                color: role === "user" ? "var(--paper)" : "var(--ink)",
                border: role === "user" ? "none" : "1px solid var(--line)",
              }} dangerouslySetInnerHTML={{ __html: html }} />
            ))}
          </div>
          <div style={{ padding: "12px 20px 20px", display: "flex", gap: 10, borderTop: "1px solid var(--line)", background: "var(--paper-raised)" }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask a follow-up..."
              style={{ flex: 1, padding: "12px 16px", borderRadius: 100, border: "1px solid var(--line)", background: "var(--paper)", fontSize: 14, outline: "none", fontFamily: "inherit" }}
            />
            <div style={{ width: 42, height: 42, borderRadius: "50%", background: "var(--green)", color: "var(--paper)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, cursor: "pointer" }}>↑</div>
          </div>
        </div>
      )}
    </div>
  );
}
