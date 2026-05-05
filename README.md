# portfolio

A personal portfolio website showing projects, experience and a few live stats.

**Updating LeetCode stats**

- The repository includes a script that fetches LeetCode statistics and writes them to `public/data/facts.json`:
	- Script: [scripts/update-facts.mjs](scripts/update-facts.mjs)
	- Output: [public/data/facts.json](public/data/facts.json)

- To update the LeetCode daily streak and solved count locally, set your LeetCode username and run the npm script:

```bash
# POSIX (macOS / Linux)
LEETCODE_USERNAME=dotrung npm run update:facts

# or export first
export LEETCODE_USERNAME=dotrung
npm run update:facts
```

- The script uses LeetCode's GraphQL endpoint to compute the daily streak from the submission calendar and the total solved count. It will overwrite `public/data/facts.json` and print the new values to the console.

- If you want this updated automatically, add a scheduled job (cron, GitHub Actions, or a server-side cron) to run the same command and optionally commit the updated file.

_Instruction added: include steps to run `update-facts.mjs` and the required `LEETCODE_USERNAME` environment variable._