"""Check that maintained README links and directory maps match the Git index."""

import posixpath
import re
import subprocess
import sys
from collections import defaultdict
from pathlib import Path, PurePosixPath
from urllib.parse import unquote, urlsplit

DIRECTORY_MAPS = {
    "README.md",
    "python actions/README.md",
    ".codebase/README.md",
    ".codebase/scripts/README.md",
    ".codebase/src/README.md",
    ".codebase/tests/README.md",
    "documentation/README.md",
    "documentation/design/README.md",
    "research/README.md",
    "research/journal/README.md",
    "research/literature/README.md",
    "research/literature/writings/README.md",
    "research/outreach/README.md",
    "research/reports/README.md",
}
START_MAP = "<!-- directory-map -->"
END_MAP = "<!-- /directory-map -->"
DESTINATION = r'''(?:<([^<>]+)>|((?:[^\s()<>]|\([^\s()<>]*\))+))'''
INLINE_LINK = re.compile(r"(?<!\\)\[[^\]\n]+\]\(\s*" + DESTINATION + r'''(?:[ \t]+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\)''')
REFERENCE = re.compile(r"^\s{0,3}\[[^\]]+\]:[ \t]*" + DESTINATION)
FENCE = re.compile(r"^ {0,3}(`{3,}|~{3,})(.*)$")
HEADING = re.compile(r"^ {0,3}#{1,6}[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$")
HTML_ANCHOR = re.compile(r'''<(?:a|span)\s+(?:id|name)=["']([^"']+)["']''', re.IGNORECASE)


def git(*args, root=None):
    return subprocess.check_output(["git", *args], cwd=root)


def markdown_lines(text):
    """Yield visible lines outside fenced examples, keeping original line numbers."""
    fence = ""
    for number, line in enumerate(text.splitlines(), 1):
        match = FENCE.match(line)
        if fence:
            if match and match[1].startswith(fence) and not match[2].strip():
                fence = ""
        elif match:
            fence = match[1]
        else:
            yield number, line


def links(line):
    """Return destinations in single-line inline links and reference definitions."""
    reference = REFERENCE.match(line)
    if reference:
        yield next(part for part in reference.groups() if part is not None)
        return
    if line.lstrip().startswith("<!--"):
        return
    code_spans = [
        match.span()
        for match in re.finditer(r"(?<!`)(`+)(?!`).+?(?<!`)\1(?!`)", line)
    ]
    for match in INLINE_LINK.finditer(line):
        if not any(start <= match.start() < end for start, end in code_spans):
            yield next(part for part in match.groups() if part is not None)


def resolve_link(page, link):
    parts = urlsplit(link)
    if parts.scheme or parts.netloc:
        return None
    path = unquote(parts.path)
    if path.startswith("/"):
        target = posixpath.normpath(path.lstrip("/"))
    elif path:
        target = posixpath.normpath(posixpath.join(posixpath.dirname(page), path))
    else:
        target = page
    return target, unquote(parts.fragment)


def maintained_readme(path):
    parts = PurePosixPath(path).parts
    if parts[-1] != "README.md":
        return False
    if "vendor" in parts or "archive" in parts:
        return False
    if any(part.startswith(("superseded-", "stage2-prep-")) for part in parts[:-1]):
        return False
    if len(parts) > 3 and parts[:2] in {
        ("research", "reports"),
        ("research", "literature"),
    } and parts[2] != "writings":
        return False
    return not (
        len(parts) > 4
        and parts[:3] in {
            ("research", "outreach", "drafts"),
            ("research", "outreach", "verification"),
        }
    )


def heading_ids(text):
    used = set()
    previous = ""
    for _, line in markdown_lines(text):
        used.update(HTML_ANCHOR.findall(line))
        match = HEADING.match(line)
        title = match[1] if match else previous if re.fullmatch(r" {0,3}(?:=+|-+)[ \t]*", line) else ""
        if title:
            title = re.sub(r"\[([^\]]+)\]\([^)]*\)|<[^>]*>", lambda m: m[1] or "", title)
            slug = "".join(c for c in title.strip().lower().replace(" ", "-") if c.isalnum() or c in "-_")
            anchor = slug
            suffix = 0
            while anchor in used:
                suffix += 1
                anchor = f"{slug}-{suffix}"
            used.add(anchor)
        previous = line if line.strip() and not match else ""
    return used


def check(root):
    files = set(git("ls-files", "--cached", "-z", root=root).decode("utf-8").split("\0"))
    files.discard("")
    children = defaultdict(set)
    markdown = defaultdict(set)
    for path in files:
        parts = path.split("/")
        for index in range(len(parts) - 1):
            children["/".join(parts[:index]) or "."].add(parts[index])
        children.setdefault(posixpath.dirname(path) or ".", set())
        if path.endswith(".md") and parts[-1] != "README.md":
            markdown[posixpath.dirname(path) or "."].add(path)

    def read(path):
        disk_path = root / path
        if disk_path.is_file() and not disk_path.is_symlink():
            return disk_path.read_text(encoding="utf-8-sig")
        return git("show", f":{path}", root=root).decode("utf-8-sig")

    pages = {path for path in files if maintained_readme(path)}
    anchors = {}
    errors = []
    link_count = 0
    for missing in sorted(DIRECTORY_MAPS - pages):
        errors.append(f"{missing}: required README is absent from Git")

    for page in sorted(pages):
        lines = list(markdown_lines(read(page)))
        starts = [number for number, line in lines if line.strip() == START_MAP]
        ends = [number for number, line in lines if line.strip() == END_MAP]
        has_map = page in DIRECTORY_MAPS or bool(starts or ends)
        map_valid = len(starts) == len(ends) == 1 and starts[0] < ends[0]
        if has_map and not map_valid:
            errors.append(f"{page}: expected one ordered directory-map marker pair")

        parent = posixpath.dirname(page) or "."
        expected_dirs = children.get(parent, set())
        found_dirs = set()
        found_pages = set()
        map_pages = set()

        for number, line in lines:
            for destination in links(line):
                try:
                    resolved = resolve_link(page, destination)
                except ValueError as error:
                    errors.append(f"{page}:{number}: invalid link {destination} ({error})")
                    continue
                if resolved is None:
                    continue
                target, fragment = resolved
                link_count += 1
                if target not in files and target not in children:
                    errors.append(f"{page}:{number}: untracked link target {target}")
                    continue
                if fragment and target in files and target.endswith(".md"):
                    if target not in anchors:
                        anchors[target] = heading_ids(read(target))
                    if fragment not in anchors[target]:
                        errors.append(f"{page}:{number}: missing heading {target}#{fragment}")
                found_pages.add(target)
                if map_valid and starts[0] < number < ends[0]:
                    immediate = posixpath.relpath(target, parent).split("/")[0]
                    if immediate in expected_dirs:
                        found_dirs.add(immediate)
                    map_pages.add(target)

        if has_map and map_valid:
            for folder in sorted(expected_dirs - found_dirs):
                errors.append(f"{page}: directory map is missing {folder}/")
        if page == "research/reports/README.md":
            for path in sorted(markdown[parent] - map_pages):
                errors.append(f"{page}: report map is missing {posixpath.basename(path)}")
        if re.fullmatch(r"documentation/design/[^/]+/README\.md", page):
            for path in sorted(markdown[parent] - found_pages):
                errors.append(f"{page}: design index is missing {posixpath.basename(path)}")

    return errors, len(pages), link_count


def main():
    root = Path(git("rev-parse", "--show-toplevel").decode().strip())
    errors, pages, links_checked = check(root)
    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 1
    print(f"Checked {links_checked} local links across {pages} maintained README files.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
