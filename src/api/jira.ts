import axios from 'axios';
import { JiraConfig, JiraProject, JiraIssue } from '../types/jira';

function headers(cfg: JiraConfig) {
  return {
    'x-jira-domain': cfg.domain,
    'x-jira-email': cfg.email,
    'x-jira-token': cfg.apiToken,
  };
}

const EPIC_FIELDS = [
  'summary', 'status', 'assignee', 'priority', 'labels', 'issuetype',
  'customfield_10015', 'duedate', 'subtasks', 'comment',
].join(',');

const STORY_FIELDS = [
  'summary', 'status', 'assignee', 'priority', 'labels', 'issuetype',
  'customfield_10015', 'duedate', 'customfield_10016', 'customfield_10028',
  'parent',
].join(',');

export async function fetchProjects(cfg: JiraConfig): Promise<JiraProject[]> {
  const res = await axios.get('/proxy/rest/api/3/project?maxResults=100', {
    headers: headers(cfg),
  });
  return res.data as JiraProject[];
}

export async function fetchEpics(cfg: JiraConfig): Promise<JiraIssue[]> {
  const jql = encodeURIComponent(
    `project = "${cfg.projectKey}" AND issuetype = Epic ORDER BY created DESC`
  );
  const res = await axios.get(
    `/proxy/rest/api/3/search?jql=${jql}&fields=${EPIC_FIELDS}&maxResults=200`,
    { headers: headers(cfg) }
  );
  return (res.data as { issues: JiraIssue[] }).issues;
}

export async function fetchStoriesForEpic(
  cfg: JiraConfig,
  epicKey: string
): Promise<JiraIssue[]> {
  // Support both classic (Epic Link) and next-gen (parent) projects
  const jql = encodeURIComponent(
    `project = "${cfg.projectKey}" AND issuetype in (Story, Task, Bug, Sub-task) ` +
    `AND (parent = "${epicKey}" OR "Epic Link" = "${epicKey}") ORDER BY created ASC`
  );
  const res = await axios.get(
    `/proxy/rest/api/3/search?jql=${jql}&fields=${STORY_FIELDS}&maxResults=200`,
    { headers: headers(cfg) }
  );
  return (res.data as { issues: JiraIssue[] }).issues;
}

export async function updateIssueDates(
  cfg: JiraConfig,
  issueKey: string,
  startDate: string | null,
  dueDate: string | null
): Promise<void> {
  const fields: Record<string, string | null> = {};
  if (startDate !== undefined) fields['customfield_10015'] = startDate;
  if (dueDate !== undefined) fields['duedate'] = dueDate;

  await axios.put(
    `/proxy/rest/api/3/issue/${issueKey}`,
    { fields },
    { headers: headers(cfg) }
  );
}

export async function validateConfig(cfg: JiraConfig): Promise<boolean> {
  try {
    await axios.get('/proxy/rest/api/3/myself', { headers: headers(cfg) });
    return true;
  } catch {
    return false;
  }
}
