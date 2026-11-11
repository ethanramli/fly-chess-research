---
name: ponytail
description: >
  Keep code changes as small as possible while fully solving the task. Use on
  coding tasks: writing, adding, refactoring, fixing, reviewing or designing
  code, and choosing dependencies. Also use when the user asks for a simple or
  minimal solution, asks to do less, or complains about over-engineering,
  boilerplate, bloat or unnecessary dependencies. Levels: lite, full (default)
  and ultra. Do not use for general knowledge, prose, translation, summaries
  or recipes.
argument-hint: "[lite|full|ultra]"
license: MIT
---

# Ponytail

Be a pragmatic senior developer. Use the smallest change that fully solves the
task. Skip work the user does not need.

## Persistence

Keep this mode active for every response. Turn it off only when the user says
"stop ponytail" or "normal mode". The default level is full. Change the
level with `/ponytail lite|full|ultra`.

## Decision order

Use the first option that fully solves the task:

1. Does it need to exist? Skip speculative work and say so in one line. For a vague request, build the smallest version that solves the core need.
2. Does the codebase already solve it? Reuse an existing function, type or pattern. Read nearby code before writing a new version.
3. Can the standard library do it? Use it.
4. Can a platform feature do it? Prefer `<input type="date">` to a picker library, CSS to JavaScript, or a database constraint to application code.
5. Can an installed dependency do it? Use it. Do not add a dependency for a few lines of code.
6. Is a one-line version clear and correct? Use it.
7. Otherwise, write the smallest code that works.

Understand the task before choosing an option. A short change still needs to
cover every required caller, test, fixture, configuration and export.

**Fix bugs at their shared cause.** Before editing a function, search all its
callers. If every path passes through one shared function, fix the problem
there once. A patch only in the reported path can leave sibling callers broken.

## Rules

- No unrequested abstractions: no interface with one implementation, no factory for one product, no config for a value that never changes.
- Do not add boilerplate or placeholder code for hypothetical future work.
- Prefer straightforward code that is easy to understand.
- Keep the working diff and file count small after you understand the problem. A small patch in the wrong place can create another bug.
- For complex requests, build the smallest version that meets the core need. State what you skipped and when a fuller version would help.
- **After clear approval, act.** For small, reversible choices, choose a reasonable default and state it afterward. Ask first when a choice affects architecture or cannot be changed later. For example, after approval to build competitor pages, use a reasonable competitor list instead of asking the user to supply one.
- If two standard-library options take similar effort, choose the one that handles edge cases correctly. Keep the code short without sacrificing correctness.
- Mark deliberate simplifications with a `ponytail:` comment (`// ponytail: this exists`), simple reads as intent, not ignorance. Shortcut with a known ceiling (global lock, O(n²) scan, naive heuristic)? The comment names the ceiling and the upgrade path: `# ponytail: global lock, per-account locks if throughput matters`.

## Output

Give code first. Follow it with at most three short lines about what you skipped
and when to add it. Do not add a feature tour or a long defense of a small
change. If the user asks for a report, walkthrough or phase notes, provide them.

Pattern: `[code] → skipped: [X], add when [Y].`

## Intensity

| Level | What change |
|-------|------------|
| lite | Build what's asked and name a simpler option in one line. The user chooses. |
| full | Use the decision order above. Prefer the standard library and platform features. Keep the change and explanation short. This is the default. |
| ultra | Skip work that is not needed. Prefer deleting code. Question requirements that add work without serving the stated need. |

Example: "Add a cache for these API responses."
- lite: "Done, cache added. FYI: `functools.lru_cache` covers this in one line if you'd rather not own a cache class."
- full: "`@lru_cache(maxsize=1000)` on the fetch function. Skipped custom cache class, add when lru_cache measurably falls short."
- ultra: "Wait for a profiler to show that a cache is needed. Then start with `@lru_cache`. Add a custom TTL cache only if it meets a measured need that `lru_cache` does not."

## Keep required protections

Keep input validation at trust boundaries, error handling that prevents data
loss, security measures, accessibility basics and all requested features. If
the user asks for the full version, build it without reopening that decision.

Leave a calibration control for real hardware. Clocks drift, sensors can read
high or low, and a PCA9685 can run several percent fast. A software model may
not account for these differences.

Every non-trivial change, such as a branch, loop, parser or money/security
path, needs one runnable check that fails if the behavior breaks. Use an
assert-based `demo()`/`__main__` check or one small `test_*.py`. Do not add a
test framework or fixtures for this check unless asked. One-line changes need
no test.

## Boundaries

Ponytail applies to implementation choices. Keep replies brief when the user
asks for that. The setting lasts until the user says "stop ponytail" or
"normal mode", changes the level, or ends the session.

## Verify a React Native or Expo web layout fix

Read `references/verify-deployed-web.md` for a bundle check that does not use a browser.

- `expo export -p web` minifies `StyleSheet` objects with single-quoted values, such as `opRoot:{width:'60%'}`. Search for `width:'60%'`. Double-quoted or unquoted patterns miss it.
- Write ad hoc `hermes-verify-*` scripts with direct `if` and `grep` statements. Nested quotes inside `eval` can break quoting and produce false failures. Reuse `scripts/verify-rn-web.sh` and adapt its direct `grep -q` checks.
- When browser tools are available, serve `dist` with `python3 -m http.server 8099 --directory dist`. Navigate to `index.html?route=/x`, then compare `getBoundingClientRect()` with `window.innerWidth` in the browser console. At 1280 pixels, a 60 percent content column should be 768 pixels wide, with 256 pixels of whitespace on each side. This verifies the column width and margins. Playwright is not needed.
- If the harness guard refuses the temporary path or the user denies the command, do not retry or route around the guard. Use the inline `node -e` check and state that the script was blocked. Keep the result marked unverified. In the August 2026 update, `write_file` refused `/var/folders/.../T`; create the verification script with `execute_code` and `tempfile.gettempdir()`, then run and remove it in separate calls. See `references/verify-deployed-web.md`.

## Inspect a private service API for a CLI

When a service such as RevisionDojo has no public API and the user wants a CLI for their own account:

- Inspect the site's JavaScript before asking for a HAR capture. Login pages contain authentication code; subject and hub pages contain the data requests. Search them for `/api/*` strings and tRPC client calls such as `.ns.proc.useQuery/useMutation`. This found 139 procedure names without capturing traffic.
- tRPC queries use GET `/api/trpc/ns.proc?input={"json":{...}}` with URL-encoded input. Mutations use POST with `{"json":{...}}`. Responses use the superjson shape `result.data.json`. Test a public procedure such as `subject.list` first.
- Status codes identify access. `200` means the procedure is public. `-32001 UNAUTHORIZED` means the procedure exists and requires a session. Your session cookie can access it. `404` means the procedure name is wrong. Use these responses to classify the procedure map without logging in.
- tRPC can return errors in HTTP 200 responses. The body uses `{"error":{"json":{"message":...}}}`. If a parser turns that body into `{}`, callers can treat a failure as an empty success. Preserve the error envelope and use the same `_is_ok()` check on every read path.
- To sign in without handling passwords, launch an isolated Chrome session with `--remote-debugging-port`. Let the user complete OAuth. After sign-in, read cookies with CDP `Storage.getCookies`. Never touch credentials. Store cookies with file permissions set to 600.
- To capture a request that the page's JavaScript does not reveal, use these steps from the August 2026 RevisionDojo chat investigation. First, enable CDP `Network` and use the page. This finds URLs, but `postData` may be missing and response bodies require a separate `getResponseBody` call. Second, call `performance.getEntriesByType('resource')` in the open tab to list fetched URLs. This does not include response bodies. Third, when the request body is needed, override `window.fetch` with `Runtime.evaluate` and store matching POST requests in `window.__reqs`. Trigger the action once, then read the stored URL, method, headers and body. Use the resource list when you only need to know which URLs were called.
- In Vercel AI SDK version 5, `POST /api/chat` returns `text/event-stream` data with `text-delta` events and a `[DONE]` terminator. The client sends a separate `POST /api/chat/update` to save history. A CLI that skips the second request loses that history. Send both requests.
