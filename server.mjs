import express from 'express';
import fs from 'node:fs/promises';

const app = express();

const PORT = process.env.PORT || 3000;
const LEETCODE_USERNAME = process.env.LEETCODE_USERNAME || '';
const DUOLINGO_USERNAME = process.env.DUOLINGO_USERNAME || '';
const FACTS_PATH = new URL('./facts.json', import.meta.url);

async function fetchJson(url, init) {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`Request failed ${res.status} for ${url}`);
  return res.json();
}

async function fetchLeetCodeSolved(username) {
  if (!username) return null;

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

  // If user hasn't submitted today yet, streak is still "current" based on yesterday.
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

  // Unofficial public API (Duome). Not guaranteed for all accounts.
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
    const [leetcode, duolingoStreak, fileFacts] = await Promise.all([
      fetchLeetCodeSolved(LEETCODE_USERNAME),
      fetchDuolingoStreak(DUOLINGO_USERNAME),
      fs.readFile(FACTS_PATH, 'utf8').then(t => JSON.parse(t)).catch(() => ({}))
    ]);

    res.json({
      duolingoStreak: duolingoStreak ?? fileFacts.duolingoStreak ?? '-',
      leetcodeDailyStreak: leetcode?.streak ?? '-',
      leetcodeSolved: leetcode?.solved ?? '-',
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    res.status(200).json({
      duolingoStreak: '-',
      leetcodeDailyStreak: '-',
      leetcodeSolved: '-',
      updatedAt: new Date().toISOString(),
      error: err instanceof Error ? err.message : String(err)
    });
  }
});

app.use(express.static('.', { extensions: ['html'] }));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

