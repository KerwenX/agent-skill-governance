// 数据副本重建工具：校验并规范化 web/public/data/db.json（本地简易数据库的种子副本）
// 数据真源是 db.json 本身（可直接编辑）；运行中修改存于 localStorage，启动时从此副本复位。
// 用法：node scripts/export-db.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const src = path.join(root, "public", "data", "db.json");

const db = JSON.parse(readFileSync(src, "utf-8"));
const ids = Object.keys(db.scenarios || {});
if (ids.length === 0) throw new Error("db.json 缺少 scenarios");
for (const id of ids) {
  const s = db.scenarios[id];
  for (const key of ["id", "title", "initialVersion", "skills", "users", "globalContracts", "localContracts", "script"]) {
    if (!(key in s)) throw new Error(`scenario ${id} 缺少字段 ${key}`);
  }
  if (!s.script?.steps?.length) throw new Error(`scenario ${id} 缺少剧本步骤`);
}
db.meta = { version: db.meta?.version ?? 1, seedAt: new Date().toISOString() };
mkdirSync(path.dirname(src), { recursive: true });
writeFileSync(src, JSON.stringify(db, null, 2), "utf-8");
console.log(`db.json 校验通过并规范化：${ids.length} 个场景（${ids.join(", ")}），${db.meta.seedAt}`);
