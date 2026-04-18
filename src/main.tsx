import { createRoot } from "react-dom/client";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element was not found.");
}

const root = createRoot(rootElement);

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  root.render(
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(135deg, rgba(244,247,252,1) 0%, rgba(232,238,248,1) 100%)",
        padding: "24px",
        fontFamily:
          '"Segoe UI", "Noto Sans", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "720px",
          background: "#ffffff",
          border: "1px solid rgba(15, 23, 42, 0.08)",
          borderRadius: "20px",
          boxShadow: "0 24px 80px rgba(15, 23, 42, 0.12)",
          padding: "32px",
        }}
      >
        <p
          style={{
            margin: 0,
            color: "#2563eb",
            fontSize: "12px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          MG-Market Local Startup
        </p>
        <h1
          style={{
            margin: "12px 0 8px",
            color: "#0f172a",
            fontSize: "32px",
            lineHeight: 1.1,
          }}
        >
          Локальный запуск остановлен
        </h1>
        <p
          style={{
            margin: 0,
            color: "#475569",
            fontSize: "16px",
            lineHeight: 1.6,
          }}
        >
          Приложение не видит переменные Supabase. Вместо пустого экрана теперь
          показываю причину прямо на старте.
        </p>

        <div
          style={{
            marginTop: "24px",
            padding: "16px 18px",
            borderRadius: "14px",
            background: "#f8fafc",
            border: "1px solid rgba(148, 163, 184, 0.25)",
          }}
        >
          <p style={{ margin: "0 0 10px", color: "#0f172a", fontWeight: 600 }}>
            Что нужно сделать
          </p>
          <pre
            style={{
              margin: 0,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              color: "#0f172a",
              fontSize: "14px",
              lineHeight: 1.6,
            }}
          >{`Создайте файл .env.local в корне проекта:

VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...

После этого перезапустите npm run dev.`}</pre>
        </div>

        <div
          style={{
            marginTop: "20px",
            display: "grid",
            gap: "10px",
            color: "#334155",
            fontSize: "14px",
          }}
        >
          <div>
            <strong>VITE_SUPABASE_URL:</strong>{" "}
            {supabaseUrl ? "найден" : "не найден"}
          </div>
          <div>
            <strong>VITE_SUPABASE_PUBLISHABLE_KEY:</strong>{" "}
            {supabasePublishableKey ? "найден" : "не найден"}
          </div>
        </div>
      </div>
    </div>
  );
} else {
  import("./App.tsx").then(({ default: App }) => {
    root.render(<App />);
  });
}
