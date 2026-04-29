import { useMemo } from 'react';
import { addMonths, subMonths, startOfMonth, endOfMonth, parseISO, isValid, min, max, startOfDay } from 'date-fns';
import { useStore } from '../store/useStore';
import TimelineHeader from './TimelineHeader';
import EpicRow from './EpicRow';
import { DAY_WIDTH } from '../types/jira';

// How many months of padding to add before/after the earliest/latest dates
const PAD_MONTHS = 3;

export default function RoadmapTimeline() {
  const { epics, zoom, filters } = useStore();

  // Compute timeline bounds from epic dates + fixed padding
  const { timelineStart, timelineEnd } = useMemo(() => {
    const today = startOfDay(new Date());
    const dates: Date[] = [today];

    epics.forEach((epic) => {
      const s = epic.fields.customfield_10015 ? parseISO(epic.fields.customfield_10015) : null;
      const e = epic.fields.duedate ? parseISO(epic.fields.duedate) : null;
      if (s && isValid(s)) dates.push(s);
      if (e && isValid(e)) dates.push(e);
      epic.children.forEach((child) => {
        const cs = child.fields.customfield_10015 ? parseISO(child.fields.customfield_10015) : null;
        const ce = child.fields.duedate ? parseISO(child.fields.duedate) : null;
        if (cs && isValid(cs)) dates.push(cs);
        if (ce && isValid(ce)) dates.push(ce);
      });
    });

    return {
      timelineStart: startOfMonth(subMonths(min(dates), PAD_MONTHS)),
      timelineEnd: endOfMonth(addMonths(max(dates), PAD_MONTHS)),
    };
  }, [epics]);

  // Apply filters
  const visibleEpics = useMemo(() => {
    return epics.filter((epic) => {
      if (
        filters.status.length > 0 &&
        !filters.status.includes(epic.fields.status.statusCategory.key)
      ) {
        return false;
      }
      if (
        filters.assignee.length > 0 &&
        !filters.assignee.includes(epic.fields.assignee?.accountId ?? '__unassigned__')
      ) {
        return false;
      }
      if (filters.labels.length > 0) {
        const hasLabel = filters.labels.some((l) => epic.fields.labels.includes(l));
        if (!hasLabel) return false;
      }
      return true;
    });
  }, [epics, filters]);

  const totalWidth =
    (Math.ceil(
      (timelineEnd.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1) *
    DAY_WIDTH[zoom];

  if (epics.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-600 text-sm">
        No epics loaded — sync your project to begin.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto relative" style={{ contain: 'strict' }}>
      {/* The inner container is wide enough to hold the full timeline */}
      <div style={{ minWidth: 288 + totalWidth }}>
        <TimelineHeader
          timelineStart={timelineStart}
          timelineEnd={timelineEnd}
          zoom={zoom}
        />

        {/* Rows */}
        {visibleEpics.map((epic) => (
          <EpicRow
            key={epic.key}
            epic={epic}
            timelineStart={timelineStart}
            zoom={zoom}
          />
        ))}

        {visibleEpics.length === 0 && (
          <div className="flex items-center justify-center h-24 text-slate-600 text-sm">
            No epics match the current filters.
          </div>
        )}
      </div>
    </div>
  );
}
