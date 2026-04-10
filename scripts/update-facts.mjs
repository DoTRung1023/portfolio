import fs from 'node:fs/promises';

const ROOT_FACTS_PATH = new URL('../public/facts.json', import.meta.url);

// Fill these in:
const LEETCODE_USERNAME = process.env.LEETCODE_USERNAME || '';
const DUOLINGO_USERNAME = process.env.DUOLINGO_USERNAME || '';

async function fetchJson(url, init) {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`Request failed ${res.status} for ${url}`);
  return res.json();
}

async function fetchLeetCodeStats(username) {
  if (!username) return {};

  // Unofficial but widely used LeetCode GraphQL endpoint
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

  const leetcodeDailyStreak = computeLeetCodeDailyStreak(matchedUser?.submissionCalendar);
  return {
    leetcodeSolved: typeof total === 'number' ? total : null,
    leetcodeDailyStreak
  };
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

async function fetchDuolingoStats(username) {
  if (!username) return {};

  // No official public Duolingo API. Duome provides a public stats API for many users.
  // Docs/behavior can vary; we fail gracefully.
  try {
    const url = `https://www.duome.eu/api/v1/users/${encodeURIComponent(username)}`;
    const data = await fetchJson(url);

    // duome fields commonly include "streak" (days)
    const streak = data?.streak;
    return {
      duolingoStreak: typeof streak === 'number' ? streak : null
    };
  } catch {
    return {};
  }
}

async function main() {
  let existingFacts = {};
  try {
    existingFacts = JSON.parse(await fs.readFile(ROOT_FACTS_PATH, 'utf8'));
  } catch {
    existingFacts = {};
  }

  const [leetcode, duolingo] = await Promise.all([
    fetchLeetCodeStats(LEETCODE_USERNAME),
    fetchDuolingoStats(DUOLINGO_USERNAME)
  ]);

  const facts = {
    // Keep manual value if duolingo fetch fails/unavailable
    duolingoStreak: duolingo.duolingoStreak ?? existingFacts.duolingoStreak ?? '-',
    leetcodeDailyStreak: leetcode.leetcodeDailyStreak ?? '-',
    leetcodeSolved: leetcode.leetcodeSolved ?? '-',
    updatedAt: new Date().toISOString()
  };

  await fs.writeFile(ROOT_FACTS_PATH, JSON.stringify(facts, null, 2) + '\n', 'utf8');
  console.log('Updated facts.json:', facts);
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});

