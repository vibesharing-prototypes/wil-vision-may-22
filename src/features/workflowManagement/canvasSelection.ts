/** Shared selection model for workflow canvas views (graph). */

export interface CanvasSelection {
  type: "state";
  stateDraftId: string;
}

export interface ConnectionSelection {
  type: "transition";
  stateDraftId: string;
  transitionDraftId: string;
}

export type CanvasItemSelection = CanvasSelection | ConnectionSelection;
