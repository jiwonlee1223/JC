import { useState, useCallback } from 'react';

interface HistoryState<T> {
  past: T[];
  present: T | null;
  future: T[];
}

export function useHistory<T>(initialState: T | null = null) {
  const [history, setHistory] = useState<HistoryState<T>>({
    past: [],
    present: initialState,
    future: [],
  });

  // 현재 상태 설정 (히스토리에 추가)
  const set = useCallback((newState: T) => {
    setHistory((prev) => ({
      past: prev.present ? [...prev.past, prev.present] : prev.past,
      present: newState,
      future: [], // 새 상태 설정 시 future 초기화
    }));
  }, []);

  // 히스토리 없이 현재 상태만 설정 (초기화용)
  const setWithoutHistory = useCallback((newState: T | null) => {
    setHistory({
      past: [],
      present: newState,
      future: [],
    });
  }, []);

  // 뒤로가기 (Undo)
  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.past.length === 0) return prev;

      const newPast = [...prev.past];
      const newPresent = newPast.pop()!;

      return {
        past: newPast,
        present: newPresent,
        future: prev.present ? [prev.present, ...prev.future] : prev.future,
      };
    });
  }, []);

  // 앞으로가기 (Redo)
  const redo = useCallback(() => {
    setHistory((prev) => {
      if (prev.future.length === 0) return prev;

      const newFuture = [...prev.future];
      const newPresent = newFuture.shift()!;

      return {
        past: prev.present ? [...prev.past, prev.present] : prev.past,
        present: newPresent,
        future: newFuture,
      };
    });
  }, []);

  // 히스토리 초기화
  const clear = useCallback(() => {
    setHistory({
      past: [],
      present: null,
      future: [],
    });
  }, []);

  return {
    state: history.present,
    set,
    setWithoutHistory,
    undo,
    redo,
    clear,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    historyLength: history.past.length,
  };
}
