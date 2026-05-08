import express from 'express';
import fs from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();

const ROOT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const FACTS_PATH = path.join(PUBLIC_DIR, 'data', 'facts.json');

const FACTS_SNAPSHOT_URL = new URL('../public/data/facts.json', import.meta.url);
const factsSnapshot = JSON.parse(readFileSync(FACTS_SNAPSHOT_URL, 'utf8'));

const PORT = process.env.PORT || 3000;
const LEETCODE_USERNAME = process.env.LEETCODE_USERNAME || '';
const DUOLINGO_USERNAME = process.env.DUOLINGO_USERNAME || '';

async function fetchJson(url, init) {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`Request failed ${res.status} for ${url}`);
  return res.json();
}

async function fetchLeetCodeSolved(username) {
  if (!username) return null;

  try {
    const url = 'https://leetcode.com/graphql';
    const query = `
    query userProfile($username: String!) {
      matchedUser(username: $username) {
        submissionCalendar
        submitStatsGlobal {
          acSubmissionNum {
            difficulty
            count
          }
        }
      }
    }
  `;

    const data = await fetchJson(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query, variables: { username } })
    });

    const matchedUser = data?.data?.matchedUser;
    const nums = matchedUser?.submitStatsGlobal?.acSubmissionNum ?? [];
    const total = nums.find(x => x?.difficulty === 'All')?.count;
    const solved = typeof total === 'number' ? total : null;

    const streak = computeLeetCodeDailyStreak(matchedUser?.submissionCalendar);
    return { solved, streak };
  } catch {
    // LeetCode often blocks or throttles serverless/datacenter IPs (e.g. on Vercel).
    return null;
  }
}

function utcMidnightSeconds(date = new Date()) {
  return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 1000);
}

function computeLeetCodeDailyStreak(submissionCalendar) {
  if (!submissionCalendar || typeof submissionCalendar !== 'string') return null;

  let cal;
  try {
    cal = JSON.parse(submissionCalendar);
  } catch {
    return null;
  }

  const today = utcMidnightSeconds(new Date());
  const oneDay = 86400;

  const start = cal[String(today)] ? today : today - oneDay;

  let streak = 0;
  for (let t = start; streak < 5000; t -= oneDay) {
    const v = cal[String(t)];
    if (!v) break;
    streak += 1;
  }

  return streak;
}

async function fetchDuolingoStreak(username) {
  if (!username) return null;

  try {
    const url = `https://www.duome.eu/api/v1/users/${encodeURIComponent(username)}`;
    const data = await fetchJson(url);
    const streak = data?.streak;
    return typeof streak === 'number' ? streak : null;
  } catch {
    return null;
  }
}

app.get('/api/facts', async (_req, res) => {
  try {
    let fileFacts = { ...factsSnapshot };
    try {
      const raw = await fs.readFile(FACTS_PATH, 'utf8');
      fileFacts = { ...factsSnapshot, ...JSON.parse(raw) };
    } catch {
      // On Vercel the function bundle may not have `public/` on disk; imported snapshot still works.
    }

    const [leetcode, duolingoStreak] = await Promise.all([
      fetchLeetCodeSolved(LEETCODE_USERNAME),
      fetchDuolingoStreak(DUOLINGO_USERNAME)
    ]);

    res.json({
      duolingoStreak: duolingoStreak ?? fileFacts.duolingoStreak ?? '-',
      leetcodeDailyStreak: leetcode?.streak ?? fileFacts.leetcodeDailyStreak ?? '-',
      leetcodeSolved: leetcode?.solved ?? fileFacts.leetcodeSolved ?? '-',
      leetcodeEasy: fileFacts.leetcodeEasy ?? '-',
      leetcodeMedium: fileFacts.leetcodeMedium ?? '-',
      leetcodeHard: fileFacts.leetcodeHard ?? '-',
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    res.status(200).json({
      duolingoStreak: '-',
      leetcodeDailyStreak: '-',
      leetcodeSolved: '-',
      leetcodeEasy: '-',
      leetcodeMedium: '-',
      leetcodeHard: '-',
      updatedAt: new Date().toISOString(),
      error: err instanceof Error ? err.message : String(err)
    });
  }
});

app.get('/', (_req, res) => {
  if (process.env.VERCEL) {
    res.redirect(302, '/about.html');
    return;
  }
  res.sendFile(path.join(PUBLIC_DIR, 'about.html'));
});

app.use(express.static(PUBLIC_DIR, { extensions: ['html'] }));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
