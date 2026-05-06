import fs from 'node:fs/promises';
import { config } from 'dotenv';

config({ debug: false });

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
  const easy = nums.find(x => x?.difficulty === 'Easy')?.count;
  const medium = nums.find(x => x?.difficulty === 'Medium')?.count;
  const hard = nums.find(x => x?.difficulty === 'Hard')?.count;

  const leetcodeDailyStreak = computeLeetCodeDailyStreak(matchedUser?.submissionCalendar);
  return {
    leetcodeSolved: typeof total === 'number' ? total : null,
    leetcodeEasy: typeof easy === 'number' ? easy : null,
    leetcodeMedium: typeof medium === 'number' ? medium : null,
    leetcodeHard: typeof hard === 'number' ? hard : null,
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

function calculateDuolingoStreak() {
  // Calculate days since November 22, 2023
  const startDate = new Date('2023-11-22');
  const today = new Date();
  
  // Calculate difference in milliseconds and convert to days
  const diffMs = today - startDate;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  return {
    duolingoStreak: diffDays
  };
}

async function main() {
  let existingFacts = {};
  try {
    existingFacts = JSON.parse(await fs.readFile(ROOT_FACTS_PATH, 'utf8'));
  } catch {
    existingFacts = {};
  }

  const leetcode = await fetchLeetCodeStats(LEETCODE_USERNAME);
  const duolingo = calculateDuolingoStreak();

  const facts = {
    duolingoStreak: `${duolingo.duolingoStreak} days`,
    leetcodeDailyStreak: leetcode.leetcodeDailyStreak ?? '-',
    leetcodeSolved: leetcode.leetcodeSolved ?? '-',
    leetcodeEasy: leetcode.leetcodeEasy ?? '-',
    leetcodeMedium: leetcode.leetcodeMedium ?? '-',
    leetcodeHard: leetcode.leetcodeHard ?? '-',
    updatedAt: new Date().toISOString()
  };

  await fs.writeFile(ROOT_FACTS_PATH, JSON.stringify(facts, null, 2) + '\n', 'utf8');
  console.log('Updated facts.json:', facts);
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});

