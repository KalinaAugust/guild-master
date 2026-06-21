---
name: resume-claude-session
description: Analyzes the current Claude Code session logs, recent commits, uncommitted code, specs, and docs to continue a task when Claude runs out of tokens. Asks clarifying questions and strictly avoids making unilateral architectural decisions.
---

# Resume Claude Session (Продолжи за Клодом)

When the user runs out of tokens or limits with Claude Code and asks you to continue the session, execute this skill.

## 1. Gather Context
You must deeply understand what Claude was doing before it stopped. Follow these steps:
- **Read Claude Code Logs:** Check the user's `~/.claude/projects/` directory. Find the most recent `.jsonl` session log file corresponding to the current project and read the last interactions to understand the immediate context, the current goal, and what Claude was about to do.
- **Examine Code State:** 
  - Run `git status` and `git diff` (via the `run_command` tool) to see uncommitted changes.
  - Run `git log -n 5` to see recent commits.
  - Read `CLAUDE.md` (if it exists) and `.cursorrules` or `.agents/AGENTS.md` to understand the project's rules and architecture.
  - Review any relevant specifications, documentation, and the active files that were recently modified.

## 2. Analyze the Task
- Determine the overall goal of the current task based on the logs and uncommitted changes.
- Identify the exact step where Claude stopped.
- Synthesize the gathered context into a brief summary of "What was done" and "What is left to do".

## 3. Mandatory Clarification and Constraints
- **NO Unilateral Architectural Decisions:** You are NOT allowed to make any architectural, design, or structural decisions on your own.
- **Ask Clarifying Questions:** Before writing or changing any code, present your summary of the task to the user and explicitly ask:
  1. "Is my understanding of the current state and goal correct?"
  2. "Are there any specific architectural decisions or approaches you want me to use for the next steps?"
- Wait for the user's confirmation and answers before proceeding.

## 4. Execution
Once the user confirms the plan:
- Continue the work strictly following the established patterns and architecture of the project.
- Keep your code changes focused on the agreed-upon next steps.
- Remember the global rule: all documentation, specs, CLAUDE.md files, and code comments must be written exclusively in English. You must reply to the user in Russian.
