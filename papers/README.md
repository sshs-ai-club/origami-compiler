# papers

Reference PDFs for the project.

## Getting them

```bash
./papers/fetch.sh 1      # the 5 essential ones, start here
./papers/fetch.sh        # all 23
```

Re-runnable; skips what you already have. Anything that fails prints its URL
— open it in a browser and save to `papers/pdf/<key>.pdf`.

**Why you have to run this yourself:** the environment these docs were
written in has arxiv.org, erikdemaine.org, ACM, Springer and Semantic Scholar
all blocked by a network egress proxy (403 on CONNECT, every mirror tried —
`export.arxiv.org`, `ar5iv`, `alphaxiv`, direct PDF links). Only
`raw.githubusercontent.com` and the npm/PyPI registries are reachable. So the
manifest and script are here, but the download has to happen on your machine.

If your school network also blocks arxiv, alternatives: fetch from home,
use the university-hosted copies (`erikdemaine.org` mirrors most of the
Demaine papers), or ask for them through a library.

## PDFs are gitignored — deliberately

`papers/pdf/` is in `.gitignore`.

Committing paper PDFs to a public repository is a copyright question, not a
storage one. arXiv's default licence grants arXiv distribution rights, not
onward redistribution — only papers explicitly under CC-BY or similar are
safe to re-host. ACM and Springer PDFs certainly are not.

The manifest gives everyone the same papers with one command, which achieves
the same thing without the legal exposure. If you decide you want them
committed anyway, check each paper's licence line first, and keep the repo
private.

## Reading order

**Priority 1 — read these before writing code (5 papers):**

1. `hull-survey` — the gentle entry point. Single-vertex flat foldability.
2. `flatfolder-2024` — **the paper `engine/` implements.** Read alongside
   the [flat-folder source](https://github.com/origamimagiro/flat-folder).
3. `simplefolds-hard` — why `sequencer/` is a heuristic and always will be.
4. `learn2fold` — closest prior art to our half of the problem.
5. `akitaya-mitani-2013` — the only previous attempt at automatic sequencing.
   Two pages. Read it and notice how little exists.

**Priority 2** — context and neighbouring systems. Read as they become
relevant to the module you're on.

**Priority 3** — depth, alternatives, benchmark data.

**Priority 4** — curiosity.

## Manifest format

`MANIFEST.tsv`, tab-separated:

```
key    priority    source    id_or_url    title    why
```

`source` is `arxiv` (id like `2603.29585`), `demaine` (directory name under
`erikdemaine.org/papers/`), or `url` (full URL).

To add a paper, append a row. Keep it tab-separated.

## Provenance warning

RESEARCH.md was assembled from **search-engine abstracts, not full texts**,
because of the network restriction described above. Claims there marked
**[verify]** have not been checked against the actual paper. Once you have
the PDFs, the highest-value hour you can spend is checking those claims and
removing the markers.
