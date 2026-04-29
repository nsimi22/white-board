import {
  eachMonthOfInterval,
  eachWeekOfInterval,
  eachDayOfInterval,
  eachQuarterOfInterval,
  format,
  getDaysInMonth,
  differenceInDays,
  startOfDay,
  getWeek,
} from 'date-fns';
import { ZoomLevel, DAY_WIDTH } from '../types/jira';

interface Props {
  timelineStart: Date;
  timelineEnd: Date;
  zoom: ZoomLevel;
}

function dateToX(date: Date, start: Date, dayWidth: number): number {
  return differenceInDays(startOfDay(date), startOfDay(start)) * dayWidth;
}

export default function TimelineHeader({ timelineStart, timelineEnd, zoom }: Props) {
  const dayWidth = DAY_WIDTH[zoom];
  const today = startOfDay(new Date());

  // Primary row: months (or quarters)
  // Secondary row: weeks (or days for day-zoom)
  const renderMonthRow = () => {
    const months = eachMonthOfInterval({ start: timelineStart, end: timelineEnd });
    return months.map((month) => {
      const daysInMonth = getDaysInMonth(month);
      const width = daysInMonth * dayWidth;
      const left = dateToX(month, timelineStart, dayWidth);
      return (
        <div
          key={month.toISOString()}
          className="absolute top-0 h-full flex items-center justify-center border-r border-[#1e2f57]"
          style={{ left, width }}
        >
          <span className="text-xs font-semibold text-slate-300 select-none">
            {format(month, width > 60 ? 'MMMM yyyy' : width > 36 ? 'MMM yy' : 'M')}
          </span>
        </div>
      );
    });
  };

  const renderQuarterRow = () => {
    const quarters = eachQuarterOfInterval({ start: timelineStart, end: timelineEnd });
    return quarters.map((q) => {
      const qEnd = new Date(q.getFullYear(), q.getMonth() + 3, 0);
      const days = differenceInDays(qEnd, q) + 1;
      const width = days * dayWidth;
      const left = dateToX(q, timelineStart, dayWidth);
      return (
        <div
          key={q.toISOString()}
          className="absolute top-0 h-full flex items-center justify-center border-r border-[#1e2f57]"
          style={{ left, width }}
        >
          <span className="text-xs font-semibold text-slate-300 select-none">
            Q{Math.ceil((q.getMonth() + 1) / 3)} {q.getFullYear()}
          </span>
        </div>
      );
    });
  };

  const renderWeekTicks = () => {
    const weeks = eachWeekOfInterval(
      { start: timelineStart, end: timelineEnd },
      { weekStartsOn: 1 }
    );
    return weeks.map((week) => {
      const width = 7 * dayWidth;
      const left = dateToX(week, timelineStart, dayWidth);
      return (
        <div
          key={week.toISOString()}
          className="absolute top-0 h-full flex items-center justify-start pl-1 border-r border-[#1e2f57]/60"
          style={{ left, width }}
        >
          <span className="text-[10px] text-slate-500 select-none">
            W{getWeek(week, { weekStartsOn: 1 })} {format(week, 'MMM d')}
          </span>
        </div>
      );
    });
  };

  const renderDayTicks = () => {
    const days = eachDayOfInterval({ start: timelineStart, end: timelineEnd });
    return days.map((day) => {
      const isWeekend = day.getDay() === 0 || day.getDay() === 6;
      const left = dateToX(day, timelineStart, dayWidth);
      return (
        <div
          key={day.toISOString()}
          className={`absolute top-0 h-full flex items-center justify-center border-r border-[#1e2f57]/50 ${isWeekend ? 'bg-[#162244]/30' : ''}`}
          style={{ left, width: dayWidth }}
        >
          <span className={`text-[10px] select-none ${isWeekend ? 'text-slate-600' : 'text-slate-500'}`}>
            {format(day, 'd')}
          </span>
        </div>
      );
    });
  };

  const totalWidth = differenceInDays(timelineEnd, timelineStart) * dayWidth + dayWidth;
  const todayX = dateToX(today, timelineStart, dayWidth);
  const showToday = todayX >= 0 && todayX <= totalWidth;

  return (
    <div className="sticky top-0 z-20 flex flex-shrink-0" style={{ height: zoom === 'day' ? 48 : 64 }}>
      {/* Empty corner above left panel */}
      <div className="sticky left-0 z-30 flex-shrink-0 w-72 bg-[#0d1526] border-r border-b border-[#1e2f57]" />

      {/* Timeline header area */}
      <div
        className="relative flex-shrink-0 border-b border-[#1e2f57] bg-[#0d1526]"
        style={{ width: totalWidth }}
      >
        {/* Primary row: months or quarters */}
        <div className="absolute top-0 left-0 right-0 h-1/2">
          {zoom === 'quarter' ? renderQuarterRow() : renderMonthRow()}
        </div>

        {/* Secondary row: weeks or days */}
        <div className="absolute bottom-0 left-0 right-0 h-1/2 border-t border-[#1e2f57]/40">
          {zoom === 'day' ? null /* single-row for day zoom */ : null}
          {zoom === 'week' || zoom === 'month' ? renderWeekTicks() : null}
          {zoom === 'day' ? renderDayTicks() : null}
        </div>

        {/* Today indicator line in header */}
        {showToday && (
          <div
            className="absolute top-0 bottom-0 w-px bg-rose-500/70 z-10"
            style={{ left: todayX + dayWidth / 2 }}
          />
        )}
      </div>
    </div>
  );
}

export { dateToX };
