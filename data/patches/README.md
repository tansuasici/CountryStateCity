# Source overlay patches

Upstream exports are immutable inputs. Local corrections belong in `overrides.json`; never edit downloaded raw files.

Supported operations:

- `merge`: update fields on an existing entity selected by numeric `id`.
- `upsert`: add or completely replace an entity.
- `delete`: remove an entity.

Every patch must include `entity` (`country`, `state`, or `city`), `operation`, `id`, `reason`, `sourceUrl`, and `license`. `merge` uses a `changes` object; `upsert` uses a complete `value` object.

Community patches created after 2026-08-08 must also include `contributionId` and an `auditTrail`
with contributor, submission time, reviewer, review time, GitHub issue URL, and accepted decision.
Use `npm run contribution:apply -- reviewed-proposal.json`; do not hand-copy an accepted issue into
this file. CI rejects community patches without a matching accepted contribution ledger entry.

The sync pipeline applies patches only inside its staging directory, then runs all validation gates. Production application remains disabled while the candidate identity report contains a source-ID collision or a removal without a reviewed successor event.
