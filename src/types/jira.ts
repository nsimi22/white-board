export interface JiraConfig {
  domain: string;       // e.g. "acme.atlassian.net"
  email: string;
  apiToken: string;
  projectKey: string;
  projectName?: string;
}

export interface JiraProject {
  id: string;
  key: string;
  name: string;
  avatarUrls?: { '48x48': string };
}

export interface JiraStatusCategory {
  id: number;
  key: 'new' | 'indeterminate' | 'done' | 'undefined';
  colorName: string;
  name: string;
}

export interface JiraStatus {
  id: string;
  name: string;
  statusCategory: JiraStatusCategory;
}

export interface JiraUser {
  accountId: string;
  displayName: string;
  avatarUrls: { '48x48': string };
}

export interface JiraPriority {
  name: string;
  iconUrl: string;
}

export interface JiraIssueFields {
  summary: string;
  status: JiraStatus;
  priority: JiraPriority | null;
  assignee: JiraUser | null;
  customfield_10015: string | null;   // Sprint / issue start date
  duedate: string | null;
  issuetype: { id: string; name: string; iconUrl: string };
  labels: string[];
  customfield_10016: number | null;   // Story points (most configs)
  customfield_10028: number | null;   // Story points (alt field)
  parent?: { id: string; key: string; fields: { summary: string; issuetype: { name: string } } };
  subtasks?: Array<{
    id: string;
    key: string;
    fields: { summary: string; status: JiraStatus };
  }>;
  description?: unknown;
  comment?: { total: number };
}

export interface JiraIssue {
  id: string;
  key: string;
  fields: JiraIssueFields;
}

export interface RoadmapEpic extends JiraIssue {
  color: string;
  isExpanded: boolean;
  isDirty: boolean;
  children: JiraIssue[];
  childrenLoaded: boolean;
}

export type ZoomLevel = 'day' | 'week' | 'month' | 'quarter';

export const DAY_WIDTH: Record<ZoomLevel, number> = {
  day: 60,
  week: 24,
  month: 8,
  quarter: 3,
};

export const EPIC_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#ec4899', // pink
  '#3b82f6', // blue
  '#14b8a6', // teal
  '#f97316', // orange
];

export function statusColor(status: JiraStatus): string {
  switch (status.statusCategory.key) {
    case 'new':           return '#64748b'; // slate
    case 'indeterminate': return '#3b82f6'; // blue
    case 'done':          return '#22c55e'; // green
    default:              return '#94a3b8';
  }
}

export function priorityColor(priority: JiraPriority | null): string {
  if (!priority) return '#94a3b8';
  switch (priority.name.toLowerCase()) {
    case 'highest': return '#ef4444';
    case 'high':    return '#f97316';
    case 'medium':  return '#f59e0b';
    case 'low':     return '#06b6d4';
    case 'lowest':  return '#94a3b8';
    default:        return '#94a3b8';
  }
}
