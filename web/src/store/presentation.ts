// ============================================================
// Presentation Store — V4.0 section 169
// ============================================================
import { create } from "zustand";
import { orchestrator } from "../app/animations";

interface PresentationState {
  playbackSpeed: number;
  replayMode: boolean;
  focusedEntity?: { kind: string; id: string };
  setSpeed: (n: number) => void;
  setFocused: (e?: { kind: string; id: string }) => void;
  setReplayMode: (b: boolean) => void;
}

export const usePresentation = create<PresentationState>((set) => ({
  playbackSpeed: 1,
  replayMode: false,
  setSpeed: (n) => {
    orchestrator.setSpeed(n);
    set({ playbackSpeed: n });
  },
  setFocused: (e) => set({ focusedEntity: e }),
  setReplayMode: (b) => set({ replayMode: b }),
}));
