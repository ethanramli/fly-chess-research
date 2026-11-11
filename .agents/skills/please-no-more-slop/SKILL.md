---
name: please-no-more-slop
description: Choose clear, human-readable names for code, files, folders, APIs, database keys, and user-facing labels. Use whenever creating or renaming any of these.
---

# Please no more slop

Never name things with hyper-abstract jargon, over-engineered compounds, or technical gibberish. Use familiar words that make the purpose clear at a glance. Name entities for the real domain concept they represent, not their implementation mechanics.

## Naming rules

- **Normie test:** a non-technical person or a developer returning after ten years should be able to guess what the name represents without decoding it. If they cannot, rename it.
- Do not use abstract modifiers such as `handler`, `manager`, `wrapper`, `processor`, `helper`, `util`, `orchestrator`, or `abstract` unless the language or framework requires that role.
- Spell out domain terms. Do not use cryptic acronyms, inside jokes, or unexplained single-letter names.
- Use the domain's language. Name what the entity represents in real life, not how the code happens to implement it.
- Keep names focused. For example, prefer `extract_metrics.py` over `data_extraction_pipeline_final_v4_processed.py` and `client_relationships` over `usr_clnt_rel_mttr_v2`.
- Before finalizing a name, ask: "If a human says, 'fucking shit, what does this mean?' when reading this code later, how would I fix it?" Make that fix now.

Apply these rules whenever creating or renaming variables, functions, database keys, files, API endpoints, folders, or user-facing labels. Preserve established public interfaces and unrelated names unless the requested work includes renaming them.
