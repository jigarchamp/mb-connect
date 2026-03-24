
You are about to review and plan the implementation of GitHub issue $ARGUMENTS.

## Phase 1 — Issue Review (Explore agent)

Use an Explore agent to do all of the following without touching the main conversation context:

1. Fetch the issue: `gh issue view $ARGUMENTS --json number,title,body,labels,comments`
2. Read every file that would plausibly be involved in implementing it (components, pages, actions, types, migrations, lib files)
3. Check for any related or dependent issues mentioned in the body or comments

Return a summary covering:
- **What the issue is asking for** — in plain language, not just a restatement of the title
- **Which files/components would need to change** and why each one is involved
- **Ambiguities** — anything the issue doesn't make clear that will require a decision
- **Dependencies** — other issues or missing infrastructure that must exist first

Do not start planning yet. Present this summary and wait.

## Phase 2 — Implementation Plan (Plan agent)

After presenting the Phase 1 summary, use a Plan agent to draft a full implementation plan. Do the exploration inside the agent — do not re-read files in the main thread.

Present the plan with:
- **Approach** — the overall strategy and why
- **Files to change** — specific file paths with line ranges where relevant, and exactly what changes in each
- **Blocking questions only** — questions you genuinely cannot answer from the code; omit anything you can determine yourself

Do not write any code or make any edits until the plan is explicitly approved.
