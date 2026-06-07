import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  useCommandStore,
  selectUndoStackSize,
  selectRedoStackSize,
  type Command,
} from './commandStore';

/**
 * Create a mock command for testing
 */
function createMockCommand(description: string): Command {
  return {
    execute: vi.fn(),
    undo: vi.fn(),
    description,
  };
}

describe('commandStore', () => {
  beforeEach(() => {
    // Reset store between tests
    useCommandStore.setState({
      undoStack: [],
      redoStack: [],
      maxHistorySize: 100,
    });
  });

  describe('initial state', () => {
    it('starts with empty undo stack', () => {
      const state = useCommandStore.getState();
      expect(state.undoStack).toEqual([]);
    });

    it('starts with empty redo stack', () => {
      const state = useCommandStore.getState();
      expect(state.redoStack).toEqual([]);
    });

    it('starts with default max history size', () => {
      const state = useCommandStore.getState();
      expect(state.maxHistorySize).toBe(100);
    });
  });

  describe('execute', () => {
    it('calls command.execute()', () => {
      const command = createMockCommand('Test Command');

      useCommandStore.getState().execute(command);

      expect(command.execute).toHaveBeenCalledTimes(1);
    });

    it('adds command to undo stack', () => {
      const command = createMockCommand('Test Command');

      useCommandStore.getState().execute(command);

      const state = useCommandStore.getState();
      expect(state.undoStack).toHaveLength(1);
      expect(state.undoStack[0]).toBe(command);
    });

    it('clears redo stack', () => {
      const command1 = createMockCommand('Command 1');
      const command2 = createMockCommand('Command 2');

      useCommandStore.getState().execute(command1);
      useCommandStore.getState().undo();
      expect(useCommandStore.getState().redoStack).toHaveLength(1);

      useCommandStore.getState().execute(command2);

      const state = useCommandStore.getState();
      expect(state.redoStack).toHaveLength(0);
    });

    it('trims undo stack when exceeding max size', () => {
      useCommandStore.getState().setMaxHistorySize(3);

      for (let i = 0; i < 5; i++) {
        useCommandStore.getState().execute(createMockCommand(`Command ${i}`));
      }

      const state = useCommandStore.getState();
      expect(state.undoStack).toHaveLength(3);
      expect(state.undoStack[0].description).toBe('Command 2');
      expect(state.undoStack[2].description).toBe('Command 4');
    });
  });

  describe('undo', () => {
    it('calls command.undo()', () => {
      const command = createMockCommand('Test Command');
      useCommandStore.getState().execute(command);

      useCommandStore.getState().undo();

      expect(command.undo).toHaveBeenCalledTimes(1);
    });

    it('removes command from undo stack', () => {
      const command = createMockCommand('Test Command');
      useCommandStore.getState().execute(command);

      useCommandStore.getState().undo();

      const state = useCommandStore.getState();
      expect(state.undoStack).toHaveLength(0);
    });

    it('adds command to redo stack', () => {
      const command = createMockCommand('Test Command');
      useCommandStore.getState().execute(command);

      useCommandStore.getState().undo();

      const state = useCommandStore.getState();
      expect(state.redoStack).toHaveLength(1);
      expect(state.redoStack[0]).toBe(command);
    });

    it('returns true when undo succeeds', () => {
      const command = createMockCommand('Test Command');
      useCommandStore.getState().execute(command);

      const result = useCommandStore.getState().undo();

      expect(result).toBe(true);
    });

    it('returns false when nothing to undo', () => {
      const result = useCommandStore.getState().undo();

      expect(result).toBe(false);
    });

    it('undoes commands in reverse order', () => {
      const command1 = createMockCommand('Command 1');
      const command2 = createMockCommand('Command 2');
      useCommandStore.getState().execute(command1);
      useCommandStore.getState().execute(command2);

      useCommandStore.getState().undo();

      expect(command2.undo).toHaveBeenCalled();
      expect(command1.undo).not.toHaveBeenCalled();
    });
  });

  describe('redo', () => {
    it('calls command.execute() again', () => {
      const command = createMockCommand('Test Command');
      useCommandStore.getState().execute(command);
      useCommandStore.getState().undo();

      useCommandStore.getState().redo();

      expect(command.execute).toHaveBeenCalledTimes(2);
    });

    it('removes command from redo stack', () => {
      const command = createMockCommand('Test Command');
      useCommandStore.getState().execute(command);
      useCommandStore.getState().undo();

      useCommandStore.getState().redo();

      const state = useCommandStore.getState();
      expect(state.redoStack).toHaveLength(0);
    });

    it('adds command back to undo stack', () => {
      const command = createMockCommand('Test Command');
      useCommandStore.getState().execute(command);
      useCommandStore.getState().undo();

      useCommandStore.getState().redo();

      const state = useCommandStore.getState();
      expect(state.undoStack).toHaveLength(1);
    });

    it('returns true when redo succeeds', () => {
      const command = createMockCommand('Test Command');
      useCommandStore.getState().execute(command);
      useCommandStore.getState().undo();

      const result = useCommandStore.getState().redo();

      expect(result).toBe(true);
    });

    it('returns false when nothing to redo', () => {
      const result = useCommandStore.getState().redo();

      expect(result).toBe(false);
    });
  });

  describe('clear', () => {
    it('clears both undo and redo stacks', () => {
      const command = createMockCommand('Test Command');
      useCommandStore.getState().execute(command);
      useCommandStore.getState().undo();

      useCommandStore.getState().clear();

      const state = useCommandStore.getState();
      expect(state.undoStack).toHaveLength(0);
      expect(state.redoStack).toHaveLength(0);
    });
  });

  describe('canUndo', () => {
    it('returns false when undo stack is empty', () => {
      const result = useCommandStore.getState().canUndo();

      expect(result).toBe(false);
    });

    it('returns true when undo stack has commands', () => {
      const command = createMockCommand('Test Command');
      useCommandStore.getState().execute(command);

      const result = useCommandStore.getState().canUndo();

      expect(result).toBe(true);
    });
  });

  describe('canRedo', () => {
    it('returns false when redo stack is empty', () => {
      const result = useCommandStore.getState().canRedo();

      expect(result).toBe(false);
    });

    it('returns true when redo stack has commands', () => {
      const command = createMockCommand('Test Command');
      useCommandStore.getState().execute(command);
      useCommandStore.getState().undo();

      const result = useCommandStore.getState().canRedo();

      expect(result).toBe(true);
    });
  });

  describe('getUndoDescription', () => {
    it('returns null when undo stack is empty', () => {
      const result = useCommandStore.getState().getUndoDescription();

      expect(result).toBeNull();
    });

    it('returns description of last command', () => {
      useCommandStore.getState().execute(createMockCommand('First'));
      useCommandStore.getState().execute(createMockCommand('Second'));

      const result = useCommandStore.getState().getUndoDescription();

      expect(result).toBe('Second');
    });
  });

  describe('getRedoDescription', () => {
    it('returns null when redo stack is empty', () => {
      const result = useCommandStore.getState().getRedoDescription();

      expect(result).toBeNull();
    });

    it('returns description of last undone command', () => {
      useCommandStore.getState().execute(createMockCommand('First'));
      useCommandStore.getState().execute(createMockCommand('Second'));
      useCommandStore.getState().undo();

      const result = useCommandStore.getState().getRedoDescription();

      expect(result).toBe('Second');
    });
  });

  describe('setMaxHistorySize', () => {
    it('updates max history size', () => {
      useCommandStore.getState().setMaxHistorySize(50);

      const state = useCommandStore.getState();
      expect(state.maxHistorySize).toBe(50);
    });

    it('trims existing undo stack if needed', () => {
      for (let i = 0; i < 10; i++) {
        useCommandStore.getState().execute(createMockCommand(`Command ${i}`));
      }

      useCommandStore.getState().setMaxHistorySize(5);

      const state = useCommandStore.getState();
      expect(state.undoStack).toHaveLength(5);
    });
  });

  describe('selectors', () => {
    it('selectUndoStackSize returns undo stack size', () => {
      useCommandStore.getState().execute(createMockCommand('1'));
      useCommandStore.getState().execute(createMockCommand('2'));

      const size = selectUndoStackSize(useCommandStore.getState());

      expect(size).toBe(2);
    });

    it('selectRedoStackSize returns redo stack size', () => {
      useCommandStore.getState().execute(createMockCommand('1'));
      useCommandStore.getState().execute(createMockCommand('2'));
      useCommandStore.getState().undo();

      const size = selectRedoStackSize(useCommandStore.getState());

      expect(size).toBe(1);
    });
  });
});
