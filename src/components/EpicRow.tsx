import { useRef, useState } from 'react';
import {
  differenceInDays,
  addDays,
  format,
  parseISO,
  startOfDay,
  isValid,
} from 'date-fns';
import { ChevronRight, ChevronDown, ExternalLink } from 'lucide-react';
import { RoadmapEpic, JiraIssue, DAY_WIDTH, ZoomLevel, statusColor, priorityColor } from '../types/jira';
import { useStore } from '../store/useStore';
import { useJira } from '../hooks/useJira';

// ── helpers ──────────────────────────────────────────────────────────────────

function dateToX(date: Date, start: Date, dayWidth: number): number {
  return differenceInDays(startOfDay(date), startOfDay(start)) * dayWidth;
}

function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = parseISO(s);
  return isValid(d) ? startOfDay(d) : null;
}

const FALLBACK_DURATION_DAYS = 30;
const ROW_HEIGHT_EPIC = 52;
const ROW_HEIGHT_STORY = 40;
const BAR_HEIGHT = 28;

// ── DragBar ───────────────────────────────────────────────────────────────────

interface DragBarProps {
  issueKey: string;
  summary: string;
  color: string;
  startDate: Date | null;
  endDate: Date | null;
  timelineStart: Date;
  dayWidth: number;
  rowHeight: number;
  barHeight: number;
  onCommit: (key: string, start: string, end: string) => void;
  domain?: string;
  isEpic?: boolean;
}

function DragBar({
  issueKey,
  summary,
  color,
  startDate,
  endDate,
  timelineStart,
  dayWidth,
  rowHeight,
  barHeight,
  onCommit,
  domain,
  isEpic,
}: DragBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ start: Date; end: Date } | null>(null);

  const effectiveStart = startDate ?? startOfDay(new Date());
  const effectiveEnd = endDate ?? addDays(effectiveStart, FALLBACK_DURATION_DAYS);

  const leftPx = dateToX(effectiveStart, timelineStart, dayWidth);
  const rawWidth = dateToX(effectiveEnd, timelineStart, dayWidth) - leftPx;
  const widthPx = Math.max(rawWidth, dayWidth * 2);

  const noDate = !startDate && !endDate;
  const topPx = (rowHeight - barHeight) / 2;

  function startDrag(
    type: 'move' | 'left' | 'right',
    e: React.MouseEvent
  ) {
    e.preventDefault();
    e.stopPropagation();

    const origStart = effectiveStart;
    const origEnd = effectiveEnd;
    const mouseX0 = e.clientX;

    function clampDelta(deltaDays: number, s: Date, en: Date): [Date, Date] {
      if (type === 'move') {
        return [addDays(s, deltaDays), addDays(en, deltaDays)];
      }
      if (type === 'left') {
        const ns = addDays(s, deltaDays);
        return ns < en ? [ns, en] : [addDays(en, -1), en];
      }
      // right
      const ne = addDays(en, deltaDays);
      return ne > s ? [s, ne] : [s, addDays(s, 1)];
    }

    function onMove(ev: MouseEvent) {
      const delta = ev.clientX - mouseX0;
      const deltaDays = Math.round(delta / dayWidth);
      const [ns, ne] = clampDelta(deltaDays, origStart, origEnd);
      setTooltip({ start: ns, end: ne });

      if (!barRef.current) return;
      const newLeft = dateToX(ns, timelineStart, dayWidth);
      const newWidth = Math.max(
        dateToX(ne, timelineStart, dayWidth) - newLeft,
        dayWidth * 2
      );
      barRef.current.style.left = `${newLeft}px`;
      barRef.current.style.width = `${newWidth}px`;
    }

    function onUp(ev: MouseEvent) {
      const delta = ev.clientX - mouseX0;
      const deltaDays = Math.round(delta / dayWidth);
      const [ns, ne] = clampDelta(deltaDays, origStart, origEnd);
      onCommit(issueKey, format(ns, 'yyyy-MM-dd'), format(ne, 'yyyy-MM-dd'));
      setTooltip(null);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    document.body.style.cursor = type === 'move' ? 'grabbing' : 'ew-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  const statusRing = isEpic ? '' : 'ring-1 ring-inset ring-white/10';

  return (
    <>
      <div
        ref={barRef}
        className={`absolute flex items-center rounded-md overflow-visible select-none group
                    ${statusRing}
                    ${noDate ? 'opacity-40 border border-dashed border-white/30 bg-transparent' : ''}`}
        style={{
          left: leftPx,
          width: widthPx,
          top: topPx,
          height: barHeight,
          background: noDate ? 'transparent' : color,
          cursor: 'grab',
          zIndex: 10,
        }}
        onMouseDown={(e) => startDrag('move', e)}
        title={summary}
      >
        {/* Left resize handle */}
        <div
          className="absolute left-0 top-0 bottom-0 w-2.5 cursor-ew-resize z-20 rounded-l-md
                     opacity-0 group-hover:opacity-100 bg-white/20 transition-opacity"
          onMouseDown={(e) => { e.stopPropagation(); startDrag('left', e); }}
        />

        {/* Label */}
        <span
          className="px-3 text-xs font-medium text-white truncate pointer-events-none leading-none"
          style={{ maxWidth: widthPx - 24 }}
        >
          {noDate ? `${issueKey} (no dates)` : summary}
        </span>

        {/* Right resize handle */}
        <div
          className="absolute right-0 top-0 bottom-0 w-2.5 cursor-ew-resize z-20 rounded-r-md
                     opacity-0 group-hover:opacity-100 bg-white/20 transition-opacity"
          onMouseDown={(e) => { e.stopPropagation(); startDrag('right', e); }}
        />

        {/* External link on hover */}
        {domain && (
          <a
            href={`https://${domain}/browse/${issueKey}`}
            target="_blank"
            rel="noreferrer"
            className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity
                       bg-[#0d1526] border border-[#1e2f57] rounded-full p-0.5 text-slate-300 hover:text-white z-30"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={10} />
          </a>
        )}
      </div>

      {/* Drag tooltip */}
      {tooltip && (
        <div
          ref={tooltipRef}
          className="absolute z-50 px-2 py-1 rounded bg-[#0d1526] border border-[#1e2f57] text-xs text-slate-200 pointer-events-none whitespace-nowrap shadow-lg"
          style={{ left: dateToX(tooltip.start, timelineStart, dayWidth), top: topPx - 28 }}
        >
          {format(tooltip.start, 'MMM d')} → {format(tooltip.end, 'MMM d, yyyy')}
          <span className="ml-2 text-slate-400">
            ({differenceInDays(tooltip.end, tooltip.start)}d)
          </span>
        </div>
      )}
    </>
  );
}

// ── EpicRow ───────────────────────────────────────────────────────────────────

interface EpicRowProps {
  epic: RoadmapEpic;
  timelineStart: Date;
  zoom: ZoomLevel;
  totalWidth: number;
}

export default function EpicRow({ epic, timelineStart, zoom, totalWidth }: EpicRowProps) {
  const dayWidth = DAY_WIDTH[zoom];
  const { toggleEpicExpand, updateEpicDates, updateStoryDates, pendingSaves, config } =
    useStore();
  const { loadChildren, saveIssueDates } = useJira();

  function handleToggle() {
    if (!epic.childrenLoaded) loadChildren(epic.key);
    toggleEpicExpand(epic.key);
  }

  function handleEpicCommit(_key: string, start: string, end: string) {
    updateEpicDates(epic.key, start, end);
    saveIssueDates(epic.key, start, end);
  }

  function handleStoryCommit(storyKey: string, start: string, end: string) {
    updateStoryDates(epic.key, storyKey, start, end);
    saveIssueDates(storyKey, start, end);
  }

  const isDirty = pendingSaves.has(epic.key);
  const sc = statusColor(epic.fields.status);
  const pc = priorityColor(epic.fields.priority);

  return (
    <>
      {/* Epic row */}
      <div className="flex group/epic" style={{ height: ROW_HEIGHT_EPIC }}>
        {/* Left panel */}
        <div className="sticky left-0 z-10 flex-shrink-0 w-72 flex items-center gap-2 px-3
                        bg-[#0d1526] border-r border-b border-[#1e2f57] group-hover/epic:bg-[#111d35]">
          {/* Expand toggle */}
          <button
            onClick={handleToggle}
            className="flex-shrink-0 p-0.5 rounded text-slate-500 hover:text-slate-200 hover:bg-[#1e2f57] transition-colors"
          >
            {epic.isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {/* Color dot */}
          <div
            className="flex-shrink-0 w-2.5 h-2.5 rounded-full"
            style={{ background: epic.color }}
          />

          {/* Epic key + summary */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-slate-500">{epic.key}</span>
              {isDirty && (
                <span className="text-[9px] text-amber-400 font-medium px-1 rounded bg-amber-400/10">
                  saving…
                </span>
              )}
            </div>
            <p className="text-xs text-slate-200 truncate font-medium leading-tight">
              {epic.fields.summary}
            </p>
          </div>

          {/* Status badge */}
          <div
            className="flex-shrink-0 w-2 h-2 rounded-full"
            title={epic.fields.status.name}
            style={{ background: sc }}
          />

          {/* Priority dot */}
          <div
            className="flex-shrink-0 w-1.5 h-1.5 rounded-full"
            title={epic.fields.priority?.name ?? 'No priority'}
            style={{ background: pc }}
          />

          {/* Assignee avatar */}
          {epic.fields.assignee ? (
            <img
              src={epic.fields.assignee.avatarUrls['48x48']}
              alt={epic.fields.assignee.displayName}
              title={epic.fields.assignee.displayName}
              className="flex-shrink-0 w-5 h-5 rounded-full"
            />
          ) : (
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#1e2f57] border border-[#334155]" />
          )}
        </div>

        {/* Timeline area */}
        <div
          className="relative flex-shrink-0 border-b border-[#1e2f57] group-hover/epic:bg-[#0d1526]/50"
          style={{ width: totalWidth, height: ROW_HEIGHT_EPIC }}
        >
          <DragBar
            issueKey={epic.key}
            summary={epic.fields.summary}
            color={epic.color}
            startDate={parseDate(epic.fields.customfield_10015)}
            endDate={parseDate(epic.fields.duedate)}
            timelineStart={timelineStart}
            dayWidth={dayWidth}
            rowHeight={ROW_HEIGHT_EPIC}
            barHeight={BAR_HEIGHT + 4}
            onCommit={handleEpicCommit}
            domain={config?.domain}
            isEpic
          />
        </div>
      </div>

      {/* Story rows (when expanded) */}
      {epic.isExpanded &&
        epic.children.map((story) => (
          <StoryRow
            key={story.key}
            story={story}
            epicColor={epic.color}
            timelineStart={timelineStart}
            dayWidth={dayWidth}
            totalWidth={totalWidth}
            onCommit={handleStoryCommit}
            domain={config?.domain}
          />
        ))}

      {/* Loading placeholder */}
      {epic.isExpanded && !epic.childrenLoaded && (
        <div
          className="flex items-center pl-14 text-xs text-slate-500 border-b border-[#1e2f57]"
          style={{ height: ROW_HEIGHT_STORY }}
        >
          Loading stories…
        </div>
      )}

      {/* Empty children */}
      {epic.isExpanded && epic.childrenLoaded && epic.children.length === 0 && (
        <div
          className="flex items-center pl-14 text-xs text-slate-600 border-b border-[#1e2f57] italic"
          style={{ height: ROW_HEIGHT_STORY }}
        >
          No stories found for this epic
        </div>
      )}
    </>
  );
}

// ── StoryRow ──────────────────────────────────────────────────────────────────

interface StoryRowProps {
  story: JiraIssue;
  epicColor: string;
  timelineStart: Date;
  dayWidth: number;
  totalWidth: number;
  onCommit: (key: string, start: string, end: string) => void;
  domain?: string;
}

function StoryRow({ story, epicColor, timelineStart, dayWidth, totalWidth, onCommit, domain }: StoryRowProps) {
  const sc = statusColor(story.fields.status);
  const storyColor = epicColor + 'aa'; // transparent version of epic color

  return (
    <div className="flex group/story" style={{ height: ROW_HEIGHT_STORY }}>
      {/* Left panel */}
      <div className="sticky left-0 z-10 flex-shrink-0 w-72 flex items-center gap-2 pl-8 pr-3
                      bg-[#080d16] border-r border-b border-[#1e2f57] group-hover/story:bg-[#0d1526]">
        <div className="w-px h-4 bg-[#1e2f57] flex-shrink-0" />

        {/* Type icon indicator */}
        <div
          className="flex-shrink-0 w-2 h-2 rounded-sm"
          style={{ background: epicColor }}
        />

        <div className="flex-1 min-w-0">
          <span className="text-[10px] font-mono text-slate-600">{story.key}</span>
          <p className="text-xs text-slate-400 truncate leading-tight">{story.fields.summary}</p>
        </div>

        <div
          className="flex-shrink-0 w-1.5 h-1.5 rounded-full"
          title={story.fields.status.name}
          style={{ background: sc }}
        />

        {story.fields.assignee ? (
          <img
            src={story.fields.assignee.avatarUrls['48x48']}
            alt={story.fields.assignee.displayName}
            title={story.fields.assignee.displayName}
            className="flex-shrink-0 w-4 h-4 rounded-full"
          />
        ) : (
          <div className="flex-shrink-0 w-4 h-4 rounded-full bg-[#1e2f57] border border-[#334155]" />
        )}
      </div>

      {/* Timeline */}
      <div
        className="relative flex-shrink-0 border-b border-[#1e2f57]/60 bg-[#080d16] group-hover/story:bg-[#0a1020]"
        style={{ width: totalWidth, height: ROW_HEIGHT_STORY }}
      >
        <DragBar
          issueKey={story.key}
          summary={story.fields.summary}
          color={storyColor}
          startDate={parseDate(story.fields.customfield_10015)}
          endDate={parseDate(story.fields.duedate)}
          timelineStart={timelineStart}
          dayWidth={dayWidth}
          rowHeight={ROW_HEIGHT_STORY}
          barHeight={BAR_HEIGHT - 4}
          onCommit={onCommit}
          domain={domain}
        />
      </div>
    </div>
  );
}

