import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ensureDb } from "./data/db";
import "./styles/index.css";

// 启动时从 JSON 副本（web/data/db.json）复位本地数据库，
// 保证每次启动数据一致；运行中的增删改查写入 localStorage 运行时库。
async function bootstrap() {
  await ensureDb();
  const { default: App } = await import("./app/App");
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
}

bootstrap();
