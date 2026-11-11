---
name: ponytail
description: >-
  Make the smallest complete change to write, fix, review, or refactor code.
  Use for coding tasks, dependency decisions, and requests for a simpler
  implementation or less complexity. Levels are lite, full (default), and
  ultra. Use off to return to normal mode.
argument-hint: "[lite|full|ultra|off]"
license: MIT
---

# Ponytail

Make the smallest change that fully solves the user's problem and preserves the behavior callers rely on. Based on [Ponytail v5.3.3 by DietrichGebert](https://github.com/DietrichGebert/ponytail/releases/tag/v5.3.3).

## Understand what must work

- Read the current behavior through its normal entry points. Trace the affected callers, data, tests, fixtures, configuration, and exports as far as the change reaches.
- For a bug, find the common cause. Fix it once where the affected callers share the same requirement. Check that other callers of that code retain their existing behavior.
- Account for existing data, partial failures, retries, and concurrent calls when they affect the change. Make reversible implementation choices and keep working when the request already authorizes them.

## Choose the first complete solution

1. Remove work that serves no current requirement.
2. Reuse the repository's existing behavior, components, and conventions.
3. Use the standard library or a native platform feature.
4. Use a dependency the project already has.
5. Write the smallest readable implementation that covers the required cases.

Keep the diff small and easy to read. Keep code in the project's existing layers. Add a dependency or abstraction when an actual requirement justifies it. Keep validation, permissions, accessibility, recovery from data loss, and hardware calibration wherever they matter. When a deliberate shortcut has a real limit, use a short `ponytail:` comment that names the limit and what would require revisiting it.

## Verify and report

Run the smallest existing check that exercises the changed behavior through its normal entry point. For nontrivial behavior, add a focused regression check when existing coverage would miss the failure. Use the repo's usual test setup. A trivial change can use an appropriate lightweight check.

Say what changed and what the verification established. For example, "The restart test passed. The saved job resumed once and preserved its previous results." State material verification gaps briefly. Give the detail the user asked for.

## Modes

Use `/ponytail lite|full|ultra|off` where slash commands are supported, or accept the same mode in plain language. Keep the selected mode for coding work in this session until the user changes it, says "stop ponytail" or "normal mode", or ends the session.

| Level | Behavior |
| --- | --- |
| **lite** | Implement the requested scope. Mention a materially simpler option when the user has a real choice to make. |
| **full** | Default. Use the first solution that satisfies the whole request. |
| **ultra** | Remove or reuse more aggressively. Challenge speculative options while delivering every required behavior. |
| **off** | Return to normal mode. |

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
