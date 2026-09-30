# Project documents

| File                  | What it holds                                                                  |
| --------------------- | ------------------------------------------------------------------------------ |
| `status.md`           | Where the work stands: current step, next step, open points. At most 50 lines. |
| `architecture.md`     | Packages, data model and the flows between them. Kept current with the code.   |
| `decisions/NNNN-*.md` | One file per decision, with its reason. Never edited later, only replaced.     |

`status.md` is the file to read first after a break, a restart or a
context compaction. It stays short: details go into `architecture.md`,
decisions into `decisions/`. A long status file is read only in part and
conflicts on every merge.

## Decisions

A new decision gets the next free number and its own file, for example
`decisions/0007-one-origin-for-spa-and-api.md`. One file per decision
means that two branches never edit the same lines. When two branches take
the same number, the second one to merge takes the next free one;
`tooling/quality` fails on duplicate numbers.

A decision that replaces an older one says so in its first line
(`Replaces 0003.`), and the older file gets one line `Replaced by 0007.`
Copy `decisions/0000-template.md` to start.
