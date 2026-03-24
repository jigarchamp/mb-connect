Kill any process currently listening on port 3001, then start the Next.js dev server in the background.

Steps:
1. Run `lsof -ti :3001 | xargs kill -9 2>/dev/null` to kill any existing process on port 3001 (ignore errors if nothing is running).
2. Run `npm run dev > /tmp/mb-connect-dev.log 2>&1 &` to start the dev server in the background, logging output to `/tmp/mb-connect-dev.log`.
3. Wait a few seconds for the server to initialize.
4. Poll `http://localhost:3001` up to 15 times (1-second intervals) until it returns an HTTP 200/307/308, using `curl -s -o /dev/null -w "%{http_code}" http://localhost:3001`.
5. Report success (server is running and responding) or failure (did not come up within the timeout), and show the last few lines of the log file either way.
