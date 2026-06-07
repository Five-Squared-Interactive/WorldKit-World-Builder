/**
 * Command Store
 *
 * Zustand store for managing undo/redo stacks.
 * Implements the Command pattern for all undoable operations.
 */

import { create } from 'zustand';

/**
 * Command interface for undoable operations
 */
export interface Command {
  /** Execute the command (apply the change) */
  execute(): void;

  /** Undo the command (revert the change) */
  undo(): void;

  /** Human-readable description for UI display */
  readonly description: string;

  /** Whether this command can be merged with the previous command */
  readonly canMerge?: boolean;
}

/**
 * Command store state interface
 */
export interface CommandState {
  /** Stack of executed commands (for undo) */
  undoStack: Command[];

  /** Stack of undone commands (for redo) */
  redoStack: Command[];

  /** Maximum number of commands to keep in history */
  maxHistorySize: number;
}

/**
 * Command store actions interface
 */
export interface CommandActions {
  /**
   * Execute a command and add it to the undo stack
   * @param command - The command to execute
   */
  execute: (command: Command) => void;

  /**
   * Undo the last command
   * @returns true if undo was successful, false if nothing to undo
   */
  undo: () => boolean;

  /**
   * Redo the last undone command
   * @returns true if redo was successful, false if nothing to redo
   */
  redo: () => boolean;

  /**
   * Clear all command history
   */
  clear: () => void;

  /**
   * Check if undo is available
   */
  canUndo: () => boolean;

  /**
   * Check if redo is available
   */
  canRedo: () => boolean;

  /**
   * Get the description of the next undo action
   */
  getUndoDescription: () => string | null;

  /**
   * Get the description of the next redo action
   */
  getRedoDescription: () => string | null;

  /**
   * Set the maximum history size
   */
  setMaxHistorySize: (size: number) => void;
}

/**
 * Combined command store type
 */
export type CommandStore = CommandState & CommandActions;

/**
 * Default maximum history size
 */
const DEFAULT_MAX_HISTORY = 100;

/**
 * Initial state for the command store
 */
const initialState: CommandState = {
  undoStack: [],
  redoStack: [],
  maxHistorySize: DEFAULT_MAX_HISTORY,
};

/**
 * Command store instance
 */
export const useCommandStore = create<CommandStore>((set, get) => ({
  // State
  ...initialState,

  // Actions
  execute: (command) => {
    // Execute the command first - if it throws, state is not modified
    try {
      command.execute();
    } catch (error) {
      console.error(`Command "${command.description}" failed to execute:`, error);
      throw error; // Re-throw so caller can handle
    }

    set((state) => {
      // Add to undo stack
      let newUndoStack = [...state.undoStack, command];

      // Trim if exceeds max size
      if (newUndoStack.length > state.maxHistorySize) {
        newUndoStack = newUndoStack.slice(-state.maxHistorySize);
      }

      return {
        undoStack: newUndoStack,
        // Clear redo stack when new command is executed
        redoStack: [],
      };
    });
  },

  undo: () => {
    const state = get();
    if (state.undoStack.length === 0) {
      return false;
    }

    // Get the last command
    const command = state.undoStack[state.undoStack.length - 1];

    // Undo it
    command.undo();

    set((prevState) => ({
      undoStack: prevState.undoStack.slice(0, -1),
      redoStack: [...prevState.redoStack, command],
    }));

    return true;
  },

  redo: () => {
    const state = get();
    if (state.redoStack.length === 0) {
      return false;
    }

    // Get the last undone command
    const command = state.redoStack[state.redoStack.length - 1];

    // Re-execute it
    command.execute();

    set((prevState) => ({
      undoStack: [...prevState.undoStack, command],
      redoStack: prevState.redoStack.slice(0, -1),
    }));

    return true;
  },

  clear: () =>
    set({
      undoStack: [],
      redoStack: [],
    }),

  canUndo: () => get().undoStack.length > 0,

  canRedo: () => get().redoStack.length > 0,

  getUndoDescription: () => {
    const { undoStack } = get();
    if (undoStack.length === 0) return null;
    return undoStack[undoStack.length - 1].description;
  },

  getRedoDescription: () => {
    const { redoStack } = get();
    if (redoStack.length === 0) return null;
    return redoStack[redoStack.length - 1].description;
  },

  setMaxHistorySize: (size) =>
    set((state) => {
      // Trim existing stacks if needed
      let newUndoStack = state.undoStack;
      if (newUndoStack.length > size) {
        newUndoStack = newUndoStack.slice(-size);
      }

      return {
        maxHistorySize: size,
        undoStack: newUndoStack,
      };
    }),
}));

/**
 * Selector: Get undo stack size
 */
export const selectUndoStackSize = (state: CommandState): number =>
  state.undoStack.length;

/**
 * Selector: Get redo stack size
 */
export const selectRedoStackSize = (state: CommandState): number =>
  state.redoStack.length;
