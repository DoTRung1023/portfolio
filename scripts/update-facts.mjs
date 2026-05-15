import fs from 'node:fs/promises';

const ROOT_FACTS_PATH = new URL('../public/data/facts.json', import.meta.url);

// Fill these in:
const LEETCODE_USERNAME = process.env.LEETCODE_USERNAME || '';

async function fetchJson(url, init) {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`Request failed ${res.status} for ${url}`);
  return res.json();
}

async function fetchLeetCodeStats(username) {
  if (!username) return {};

  const base = `https://alfa-leetcode-api.onrender.com/${encodeURIComponent(username)}`;
  try {
    const [solved, calendar] = await Promise.all([
      fetchJson(`${base}/solved`),
      fetchJson(`${base}/calendar`)
    ]);
    return {
      leetcodeSolved: solved?.solvedProblem ?? null,
      leetcodeEasy: solved?.easySolved ?? null,
      leetcodeMedium: solved?.mediumSolved ?? null,
      leetcodeHard: solved?.hardSolved ?? null,
      leetcodeDailyStreak: computeLeetCodeDailyStreak(calendar?.submissionCalendar)
    };
  } catch (err) {
    console.warn('LeetCode API unavailable:', err.message);
    return {};
  }
}

function utcMidnightSeconds() {
  const now = new Date();
  return Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 1000);
}

function computeLeetCodeDailyStreak(submissionCalendar) {
  if (!submissionCalendar || typeof submissionCalendar !== 'string') return null;
  let cal;
  try { cal = JSON.parse(submissionCalendar); } catch { return null; }

  const today = utcMidnightSeconds();
  const oneDay = 86400;
  const start = cal[String(today)] ? today : today - oneDay;

  let streak = 0;
  for (let t = start; streak < 5000; t -= oneDay) {
    if (!cal[String(t)]) break;
    streak++;
  }
  return streak;
}

function calculateDuolingoStreak() {
  const startDate = new Date('2023-11-22');
  const diffMs = Date.now() - startDate.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

async function main() {
  let existingFacts = {};
  try {
    existingFacts = JSON.parse(await fs.readFile(ROOT_FACTS_PATH, 'utf8'));
  } catch {
    existingFacts = {};
  }

  const leetcode = await fetchLeetCodeStats(LEETCODE_USERNAME);

  const facts = {
    duolingoStreak: `${calculateDuolingoStreak()} days`,
    leetcodeDailyStreak: leetcode.leetcodeDailyStreak ?? existingFacts.leetcodeDailyStreak ?? '-',
    leetcodeSolved: leetcode.leetcodeSolved ?? existingFacts.leetcodeSolved ?? '-',
    leetcodeEasy: leetcode.leetcodeEasy ?? existingFacts.leetcodeEasy ?? '-',
    leetcodeMedium: leetcode.leetcodeMedium ?? existingFacts.leetcodeMedium ?? '-',
    leetcodeHard: leetcode.leetcodeHard ?? existingFacts.leetcodeHard ?? '-',
    updatedAt: new Date().toISOString()
  };

  await fs.writeFile(ROOT_FACTS_PATH, JSON.stringify(facts, null, 2) + '\n', 'utf8');
  console.log('Updated facts.json:', facts);
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});

