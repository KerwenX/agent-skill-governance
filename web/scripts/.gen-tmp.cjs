const { build } = require("esbuild");
const path = require("path");
(async () => {
  // 把备份的源文件放进一个临时项目结构
  const { mkdirSync, cpSync, writeFileSync } = require("fs");
  const proj = path.join("C:SERSADMINI~1APPDATAocaltempscen-backup", "proj");
  mkdirSync(path.join(proj, "src/app"), { recursive: true });
  mkdirSync(path.join(proj, "src/domain"), { recursive: true });
  mkdirSync(path.join(proj, "src/fixtures/scenarios"), { recursive: true });
  cpSync(path.join("C:SERSADMINI~1APPDATAocaltempscen-backup", "demoScript.ts"), path.join(proj, "src/app/demoScript.ts"));
  cpSync(path.join("C:SERSADMINI~1APPDATAocaltempscen-backup", "eventBus.ts"), path.join(proj, "src/app/eventBus.ts"));
  cpSync(path.join("C:SERSADMINI~1APPDATAocaltempscen-backup", "types.ts"), path.join(proj, "src/domain/types.ts"));
  cpSync(path.join("C:SERSADMINI~1APPDATAocaltempscen-backup", "types.ts"), path.join(proj, "src/fixtures/scenarios/types.ts"));
  cpSync(path.join("C:SERSADMINI~1APPDATAocaltempscen-backup", "seed-helpers.ts"), path.join(proj, "src/fixtures/scenarios/seed-helpers.ts"));
  for (const f of ["e2e-01-filing.ts","e2e-02-claim.ts","e2e-03-finance.ts","registry.ts"]) {
    cpSync(path.join("C:SERSADMINI~1APPDATAocaltempscen-backup", f), path.join(proj, "src/fixtures/scenarios", f));
  }
  writeFileSync(path.join(proj, "entry.ts"), `
import { SCENARIOS } from "./src/fixtures/scenarios/registry";
import { DEMO_SCRIPTS } from "./src/app/demoScript";
const db = { meta: { version: 1, seedAt: new Date().toISOString() }, scenarios: {} };
for (const sc of SCENARIOS) {
  db.scenarios[sc.id] = {
    id: sc.id, index: sc.index, title: sc.title, shortTitle: sc.shortTitle,
    industry: sc.industry, summary: sc.summary, initialVersion: sc.initialVersion,
    skills: sc.skills, users: sc.users, agents: sc.agents,
    globalContracts: sc.globalContracts, localContracts: sc.localContracts,
    platformStats: sc.platformStats, tasks: sc.tasks, publishes: sc.publishes,
    seed: sc.seed ?? null, script: DEMO_SCRIPTS[sc.id] ?? null,
  };
}
console.log(JSON.stringify(db));
`);
  const res = await build({ entryPoints: [path.join(proj, "entry.ts")], bundle: true, format: "cjs", platform: "node", outfile: path.join(proj, "out.cjs"), logLevel: "error" });
  const { execSync } = require("child_process");
  const out = execSync(`node "${path.join(proj, "out.cjs")}"`, { encoding: "utf-8", maxBuffer: 64 * 1024 * 1024 });
  writeFileSync("D:/Desktop/专利-多skill冲突治理/web/public/data/db.json", out.trim());
  console.log("db.json regenerated from git backup");
})();
