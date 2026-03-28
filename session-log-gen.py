#!/usr/bin/env python3
"""session-log-gen.py — Auto-generate SESSION_LOG.md entry + commit + push."""

import argparse, subprocess, re
from pathlib import Path


def parse_args():
    parser = argparse.ArgumentParser(description="Generate and append SESSION_LOG.md entry")
    parser.add_argument("--project", required=True, help="Project name (e.g., ARIA, aria-advisor)")
    parser.add_argument("--session", type=int, help="Session number (auto-detected if omitted)")
    parser.add_argument("--date", required=True, help="Session date (YYYY-MM-DD)")
    parser.add_argument("--goal", required=True, help="Session goal/focus")
    parser.add_argument("--shipped", required=True, help="What shipped (pipe-separated bullets)")
    parser.add_argument("--time", required=True, help="Estimated time (e.g., '49 min', '2 hrs')")
    parser.add_argument("--notes", required=True, help="Additional notes")
    return parser.parse_args()


def find_session_log(project):
    """Find SESSION_LOG.md for project (fuzzy prefix match)."""
    daytona = Path.home() / "Daytona"
    project_lower = project.lower()

    # Try exact match first
    projects_dir = daytona / project
    session_log = projects_dir / "SESSION_LOG.md"
    if session_log.exists():
        return session_log

    # Try case-insensitive exact match
    for d in daytona.iterdir():
        if d.is_dir() and d.name.lower() == project_lower:
            session_log = d / "SESSION_LOG.md"
            if session_log.exists():
                return session_log

    # Try prefix match (e.g., "ARIA" -> "aria-advisor")
    for d in daytona.iterdir():
        if d.is_dir() and d.name.lower().startswith(project_lower):
            session_log = d / "SESSION_LOG.md"
            if session_log.exists():
                return session_log

    raise FileNotFoundError(f"SESSION_LOG.md not found for project '{project}'")



def format_shipped(shipped_str):
    """Format pipe-separated bullets into single markdown string."""
    bullets = shipped_str.split("|")
    return ". ".join(b.strip() for b in bullets if b.strip())


def read_session_log(path):
    """Read current SESSION_LOG.md content."""
    with open(path, "r") as f:
        return f.read()


def extract_last_session_number(content):
    """Extract highest session number from SESSION_LOG.md table."""
    # Match "| N |" at start of line (session number in first column)
    matches = re.findall(r"^\|\s*(\d+)\s*\|", content, re.MULTILINE)
    if matches:
        return max(int(m) for m in matches)
    return 0


def generate_row(session_num, date, goal, shipped, time, notes):
    """Generate markdown table row for SESSION_LOG.md."""
    # Escape pipes in content (replace | with \|)
    goal = goal.replace("|", "\\|")
    shipped = shipped.replace("|", "\\|")
    notes = notes.replace("|", "\\|")

    row = f"| {session_num} | {date} | {goal} | {shipped} | {time} | {notes} |"
    return row


def append_to_session_log(path, row):
    """Append row to SESSION_LOG.md (before closing empty row if present)."""
    content = read_session_log(path)

    # Find the last pipe-delimited row (table content)
    lines = content.split("\n")
    insert_idx = len(lines)

    # Walk backwards to find last table row
    for i in range(len(lines) - 1, -1, -1):
        if lines[i].strip().startswith("|") and lines[i].strip().endswith("|"):
            insert_idx = i + 1
            break

    lines.insert(insert_idx, row)
    new_content = "\n".join(lines)

    with open(path, "w") as f:
        f.write(new_content)

    return new_content


def git_commit_and_push(project, session_num, repo_path=None):
    """Commit SESSION_LOG.md update and push."""
    if not repo_path:
        # Use fuzzy lookup if path not provided
        daytona = Path.home() / "Daytona"
        project_lower = project.lower()
        for d in daytona.iterdir():
            if d.is_dir() and (d.name.lower() == project_lower or d.name.lower().startswith(project_lower)):
                repo_path = d
                break
        if not repo_path:
            raise FileNotFoundError(f"Project directory not found for '{project}'")

    # Stage SESSION_LOG.md
    subprocess.run(
        ["git", "add", "SESSION_LOG.md"],
        cwd=repo_path,
        check=True,
        capture_output=True,
    )

    # Commit
    commit_msg = f"log: Session {session_num} — SESSION_LOG.md auto-generated entry"
    subprocess.run(
        ["git", "commit", "-m", commit_msg],
        cwd=repo_path,
        check=True,
        capture_output=True,
    )

    # Push
    subprocess.run(
        ["git", "push", "origin", "main"],
        cwd=repo_path,
        check=True,
        capture_output=True,
    )

    print(f"✅ Commit + Push: {commit_msg}")


def main():
    args = parse_args()

    # Find SESSION_LOG.md and repo path
    session_log_path = find_session_log(args.project)
    repo_path = session_log_path.parent

    # Format shipped bullets
    shipped_formatted = format_shipped(args.shipped)

    # Auto-detect session number if not provided
    if args.session:
        session_num = args.session
    else:
        current_content = read_session_log(session_log_path)
        last_session = extract_last_session_number(current_content)
        session_num = last_session + 1

    # Generate row
    row = generate_row(session_num, args.date, args.goal, shipped_formatted, args.time, args.notes)

    # Append to file
    new_content = append_to_session_log(session_log_path, row)

    # Commit + push
    git_commit_and_push(args.project, session_num, repo_path)

    print(f"✅ SESSION_LOG entry generated (Session {session_num})")
    print(f"Row:\n{row}")


if __name__ == "__main__":
    main()
