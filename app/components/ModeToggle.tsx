"use client";
import { useRouter, usePathname } from "next/navigation";

export default function ModeToggle() {
  const router = useRouter();
  const path = usePathname();
  const isAcademic = path.startsWith("/academic");
  const isCivic = path.startsWith("/civic");

  return (
    <div style={{
      display: "flex",
      gap: 4,
      background: "var(--line)",
      borderRadius: 100,
      padding: 3,
    }}>
      <button
        onClick={() => router.push("/academic")}
        style={{
          padding: "6px 16px",
          borderRadius: 100,
          border: "none",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 600,
          background: isAcademic ? "var(--paper-raised)" : "transparent",
          color: isAcademic ? "var(--green)" : "var(--muted)",
          transition: "all 0.15s ease",
        }}
      >
        Academic
      </button>
      <button
        onClick={() => router.push("/civic")}
        style={{
          padding: "6px 16px",
          borderRadius: 100,
          border: "none",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 600,
          background: isCivic ? "var(--paper-raised)" : "transparent",
          color: isCivic ? "var(--green)" : "var(--muted)",
          transition: "all 0.15s ease",
        }}
      >
        Civic
      </button>
    </div>
  );
}
