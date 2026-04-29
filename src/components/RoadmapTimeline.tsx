import { useMemo } from 'react';
import {
  addMonths, subMonths, startOfMonth, endOfMonth,
  parseISO, isValid, min, max, startOfDay, differenceInDays, addDays,
} from 'date-fns';
import { useStore } from '../store/useStore';
import TimelineHeader from './TimelineHeader';
import EpicRow from './EpicRow';
import { DAY_WIDTH, ZoomLevel } from '../types/jira';

const PAD_MONTHS = 3;

function buildGridLines(timelineStart: Date, totalWidth: number, zoom: ZoomLevel): number[] {
  const dayWidth = DAY_WIDTH[zoom];
  const lines: number[] = [];

  function xOf(d: Date) {
    return differenceInDays(startOfDay(d), startOfDay(timelineStart)) * dayWidth;
  }

  if (zoom === 'day') {
    let d = startOfDay(timelineStart);
    while (xOf(d) <= totalWidth) { lines.push(xOf(d)); d = addDays(d, 1); }
  } else if (zoom === 'week') {
    let d = startOfDay(timelineStart);
    while (xOf(d) <= totalWidth) {
      if (d.getDay() === 1) lines.push(xOf(d));
      d = addDays(d, 1);
    }
  } else {
    let d = new Date(timelineStart.getFullYear(), timelineStart.getMonth(), 1);
    while (xOf(d) <= totalWidth) {
      lines.push(xOf(d));
      d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    }
  }

  return lines;
}

export default function RoadmapTimeline() {
  const { epics, zoom, filters } = useStore();

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

  const totalWidth = (differenceInDays(timelineEnd, timelineStart) + 1) * DAY_WIDTH[zoom];

  const gridLines = useMemo(
    () => buildGridLines(timelineStart, totalWidth, zoom),
    [timelineStart, totalWidth, zoom]
  );

  const todayX =
    differenceInDays(startOfDay(new Date()), startOfDay(timelineStart)) * DAY_WIDTH[zoom] +
    DAY_WIDTH[zoom] / 2;

  const visibleEpics = useMemo(() => {
    return epics.filter((epic) => {
      if (filters.status.length > 0 && !filters.status.includes(epic.fields.status.statusCategory.key))
        return false;
      if (filters.assignee.length > 0 && !filters.assignee.includes(epic.fields.assignee?.accountId ?? '__unassigned__'))
        return false;
      if (filters.labels.length > 0 && !filters.labels.some((l) => epic.fields.labels.includes(l)))
        return false;
      return true;
    });
  }, [epics, filters]);

  if (epics.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-slate-600 text-sm">
        No epics loaded — sync your project to begin.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto relative bg-slate-50 dark:bg-[#080d16]" style={{ contain: 'strict' }}>
      <div style={{ minWidth: 288 + totalWidth }}>
        <TimelineHeader timelineStart={timelineStart} timelineEnd={timelineEnd} zoom={zoom} />

        <div className="relative">
          {/* Single grid overlay — rendered once, not per row */}
          <div
            className="absolute top-0 bottom-0 pointer-events-none z-0"
            style={{ left: 288, right: 0 }}
            aria-hidden
          >
            {gridLines.map((x) => (
              <div
                key={x}
                className="absolute top-0 bottom-0 w-px bg-slate-200 dark:bg-[#1e2f57]/50"
                style={{ left: x }}
              />
            ))}
            {todayX >= 0 && todayX <= totalWidth && (
              <div
                className="absolute top-0 bottom-0 w-px bg-rose-400/60 dark:bg-rose-500/40"
                style={{ left: todayX }}
              />
            )}
          </div>

          {visibleEpics.map((epic) => (
            <EpicRow
              key={epic.key}
              epic={epic}
              timelineStart={timelineStart}
              zoom={zoom}
              totalWidth={totalWidth}
            />
          ))}

          {visibleEpics.length === 0 && (
            <div className="flex items-center justify-center h-24 text-slate-400 dark:text-slate-600 text-sm">
              No epics match the current filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
