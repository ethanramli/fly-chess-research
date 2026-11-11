# Check README navigation

Run this command from the repository root after staging any new files or directories:

```sh
python .github/scripts/check-readme-navigation.py
```

The [GitHub check](../workflows/readme-navigation.yml) runs the same command on pull requests and pushes to the main branch. It checks paths against Git's index, so ignored local outputs cannot make a link pass. The checkout only needs README files and the check itself. Git supplies linked Markdown files as needed for heading checks.

The [root README](../../README.md) and maintained section indexes mark their folder maps with `<!-- directory-map -->` and `<!-- /directory-map -->`. Add a clickable entry with a plain description for each immediate tracked folder. You can link to the folder, its README, or the report inside it. The reports map also covers Markdown reports stored directly in the reports folder. Each design topic index links to its immediate Markdown pages.

The checker handles single-line Markdown links and reference definitions, percent-encoded paths, Markdown heading fragments, and explicit HTML anchors. It skips external URLs and fenced code. Archived records, vendor files, dated evidence, and superseded outlines stay outside the maintained README check. Their destinations can still be linked from active indexes. Review link labels and reader routes by hand for scientific meaning and clarity.

[Navigation maintenance rule](../../AGENTS.md#keep-readme-navigation-current)
