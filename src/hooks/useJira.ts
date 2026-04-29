import { useCallback } from 'react';
import { useStore } from '../store/useStore';
import { fetchEpics, fetchStoriesForEpic, updateIssueDates } from '../api/jira';

export function useJira() {
  const { config, setEpics, setEpicChildren, setIsLoading, setError, markSaved } = useStore();

  const loadEpics = useCallback(async () => {
    if (!config) return;
    setIsLoading(true);
    setError(null);
    try {
      const issues = await fetchEpics(config);
      setEpics(issues);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load epics';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [config, setEpics, setIsLoading, setError]);

  const loadChildren = useCallback(
    async (epicKey: string) => {
      if (!config) return;
      try {
        const children = await fetchStoriesForEpic(config, epicKey);
        setEpicChildren(epicKey, children);
      } catch {
        // Non-fatal — epic stays collapsed
      }
    },
    [config, setEpicChildren]
  );

  const saveIssueDates = useCallback(
    async (issueKey: string, startDate: string | null, dueDate: string | null) => {
      if (!config) return;
      try {
        await updateIssueDates(config, issueKey, startDate, dueDate);
        markSaved(issueKey);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : `Failed to save ${issueKey}`;
        useStore.getState().setError(msg);
      }
    },
    [config, markSaved]
  );

  return { loadEpics, loadChildren, saveIssueDates };
}
