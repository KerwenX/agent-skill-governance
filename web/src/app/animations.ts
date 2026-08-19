// ============================================================
// Animation Orchestrator — V4.0 sections 170–172
// All timing goes through here; never setTimeout-in-component.
// ============================================================
type Task = () => void;
class Orchestrator {
  private speed = 1;
  private queue: { id: string; startedAt: number; duration: number; elapsed: number; task: () => void }[] = [];
  private raf: number | null = null;
  private reduced = typeof window !== "undefined"
    && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  setSpeed(s: number) { this.speed = s; }
  getSpeed() { return this.speed; }

  /** Wait for `ms` (scaled by speed). Respects reduced-motion. */
  wait(ms: number): Promise<void> {
    if (this.reduced) return Promise.resolve();
    return new Promise(resolve => setTimeout(resolve, ms / this.speed));
  }

  /** Run a sequence of steps with delays between. */
  async sequence(steps: (() => void | Promise<void>)[], gapMs = 220) {
    for (const step of steps) {
      await step();
      await this.wait(gapMs);
    }
  }

  /** Play a single named cue. */
  async cue(_name: string, fn: () => void, delay = 0) {
    await this.wait(delay);
    fn();
  }

  stop() {
    if (this.raf !== null) cancelAnimationFrame(this.raf);
    this.raf = [] as unknown as number;
  }
}

export const orchestrator = new Orchestrator();

/** Duration tokens (ms). */
export const DUR = {
  micro: 160,
  hover: 120,
  drawer: 240,
  modal: 220,
  insert: 280,
  morph: 450,
  pulse: 600,
  wave: 1200,
} as const;
