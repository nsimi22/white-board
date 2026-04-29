import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { JiraConfig, RoadmapEpic, ZoomLevel, EPIC_COLORS, JiraIssue } from '../types/jira';

interface FilterState {
  status: string[];      // statusCategory keys: 'new' | 'indeterminate' | 'done'
  assignee: string[];    // accountIds
  labels: string[];
}

interface AppStore {
  config: JiraConfig | null;
  epics: RoadmapEpic[];
  isLoading: boolean;
  error: string | null;
  isConfigOpen: boolean;
  zoom: ZoomLevel;
  filters: FilterState;
  pendingSaves: Set<string>;  // issue keys with unsaved date changes

  setConfig: (config: JiraConfig) => void;
  clearConfig: () => void;
  setEpics: (issues: JiraIssue[]) => void;
  setEpicChildren: (epicKey: string, children: JiraIssue[]) => void;
  toggleEpicExpand: (epicKey: string) => void;
  updateEpicDates: (epicKey: string, startDate: string | null, endDate: string | null) => void;
  updateStoryDates: (epicKey: string, storyKey: string, startDate: string | null, endDate: string | null) => void;
  markSaved: (issueKey: string) => void;
  setIsLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
  setIsConfigOpen: (open: boolean) => void;
  setZoom: (zoom: ZoomLevel) => void;
  setFilters: (filters: Partial<FilterState>) => void;
}

export const useStore = create<AppStore>()(
  persist(
    (set) => ({
      config: null,
      epics: [],
      isLoading: false,
      error: null,
      isConfigOpen: false,
      zoom: 'month',
      filters: { status: [], assignee: [], labels: [] },
      pendingSaves: new Set(),

      setConfig: (config) => set({ config, epics: [], error: null }),
      clearConfig: () => set({ config: null, epics: [] }),

      setEpics: (issues) =>
        set({
          epics: issues.map((issue, i) => ({
            ...issue,
            color: EPIC_COLORS[i % EPIC_COLORS.length],
            isExpanded: false,
            isDirty: false,
            children: [],
            childrenLoaded: false,
          })),
        }),

      setEpicChildren: (epicKey, children) =>
        set((state) => ({
          epics: state.epics.map((e) =>
            e.key === epicKey ? { ...e, children, childrenLoaded: true } : e
          ),
        })),

      toggleEpicExpand: (epicKey) =>
        set((state) => ({
          epics: state.epics.map((e) =>
            e.key === epicKey ? { ...e, isExpanded: !e.isExpanded } : e
          ),
        })),

      updateEpicDates: (epicKey, startDate, endDate) =>
        set((state) => ({
          epics: state.epics.map((e) =>
            e.key === epicKey
              ? {
                  ...e,
                  isDirty: true,
                  fields: { ...e.fields, customfield_10015: startDate, duedate: endDate },
                }
              : e
          ),
          pendingSaves: new Set([...state.pendingSaves, epicKey]),
        })),

      updateStoryDates: (epicKey, storyKey, startDate, endDate) =>
        set((state) => ({
          epics: state.epics.map((e) =>
            e.key === epicKey
              ? {
                  ...e,
                  children: e.children.map((s) =>
                    s.key === storyKey
                      ? { ...s, fields: { ...s.fields, customfield_10015: startDate, duedate: endDate } }
                      : s
                  ),
                }
              : e
          ),
          pendingSaves: new Set([...state.pendingSaves, storyKey]),
        })),

      markSaved: (issueKey) =>
        set((state) => {
          const next = new Set(state.pendingSaves);
          next.delete(issueKey);
          return {
            pendingSaves: next,
            epics: state.epics.map((e) =>
              e.key === issueKey ? { ...e, isDirty: false } : e
            ),
          };
        }),

      setIsLoading: (v) => set({ isLoading: v }),
      setError: (e) => set({ error: e }),
      setIsConfigOpen: (open) => set({ isConfigOpen: open }),
      setZoom: (zoom) => set({ zoom }),
      setFilters: (filters) =>
        set((state) => ({ filters: { ...state.filters, ...filters } })),
    }),
    {
      name: 'jira-roadmap-v1',
      partialize: (state) => ({ config: state.config, zoom: state.zoom }),
    }
  )
);
