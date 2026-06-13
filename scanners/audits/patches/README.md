# Plamen Local Patches

Patches we keep applied on the VM's Plamen install (`~/.plamen`) because the
upstream `PlamenTSV/plamen` repo still ships with the bug. Re-apply after
every `git pull` in `~/.plamen` until the matching fix lands upstream.

## Quick re-apply

From the VM, as the `claude` user, after `cd ~/.plamen && git pull`:

```bash
cd ~/.plamen
for p in /home/claude/BugChainIndexer/scanners/audits/patches/*.patch; do
  git apply --check "$p" 2>/dev/null && git apply "$p" && echo "applied: $p"
done
```

`git apply --check` first guards against re-application — if upstream has
already fixed it (or the file changed in a way that breaks the patch), the
check fails and we skip cleanly instead of corrupting the file.

---

## `plamen-empty-tier-sidecar.patch`

**Generated**: 2026-05-21 against `PlamenTSV/plamen@7dc8221` (v2.0.0 line).

**Symptom**: `audit-one.sh` exits with code 3 ("AUDIT_REPORT.md not found")
after Plamen runs the full pipeline. Plamen's own log ends with:

```
[ERROR] [report_critical_high] body-writer output failed validator
```

and the scratchpad's `report_critical_high.body_writer.degraded` file says:

```
body validator: manifest report_critical_high.json missing for report_critical_high.md
```

**Trigger**: any audit where the Critical+High severity tier ends up empty
after Plamen's verification gates. Small contracts and well-written ones
hit this often. The wTAO audit (`0x134f59e8...d1e` on subtensor) is the
canonical reproducer — see `contract_audits.id = 40`.

**Root cause** (in `plamen_validators.py`):

1. `_maybe_skip_empty_body_writer` writes a placeholder body markdown
   AND a structured sidecar at `body_manifests/<tier>.empty.json`. The
   sidecar write is wrapped in a bare `except: pass`, so any failure
   (race with parallel body-writers creating the dir, filesystem hiccup,
   etc.) silently leaves the sidecar missing.
2. `_empty_tier_sidecar_valid` then refuses to accept the tier as
   authentically empty without the sidecar — even though the body
   markdown itself already contains the magic line
   `Empty-Tier-Auth: PLAMEN-DRIVER-AUTHENTIC-EMPTY-TIER` written by the
   same handler in the same call.

**The patch**:

1. `_maybe_skip_empty_body_writer`: `mkdir(parents=True, exist_ok=True)` and
   the bare except now logs the exception instead of swallowing it. Future
   sidecar-write failures will be diagnosable from the run log.
2. `_empty_tier_sidecar_valid`: sidecar stays the primary signal, but if it
   is missing OR unreadable we fall back to scanning the body markdown for
   the `Empty-Tier-Auth: PLAMEN-DRIVER-AUTHENTIC-EMPTY-TIER` line. Both
   signals originate from the same handler call, so accepting either is
   safe. Still gated on `_expected_tier_assignment_count(...) == 0` so the
   LLM can't spoof an empty tier when the index has reportable findings.

**Recovery for an audit that already failed with this signature** (e.g.
contracts you ran before the patch was applied):

```bash
# Replace SCRATCH with the failed audit's scratchpad path
SCRATCH=/tmp/audits/<network>-<address>/.scratchpad
rm -f $SCRATCH/report_critical_high.body_writer.degraded
python3 ~/.plamen/scripts/plamen_driver.py "$SCRATCH/config.json"

# Then manually ingest the produced report:
node /home/claude/BugChainIndexer/scanners/audits/ingest.js \
  --network <network> --address <address> \
  --report /tmp/audits/<network>-<address>/AUDIT_REPORT.md \
  --mode thorough \
  --started-at <original started_at ms from contract_audits row> \
  --status completed
```

Once the upstream fix lands at `PlamenTSV/plamen`, `git apply --check`
will fail for this patch and it can be deleted from this directory.

---

## `plamen-noninteractive-prompts.patch`

**Generated**: 2026-06-04 against `PlamenTSV/plamen@094fe11`
(v2.0.2 line).

**Symptom**: a dashboard-launched audit can remain `running` forever after a
critical phase fails. The Plamen driver prints:

```
Critical phase failed: recon
Press ENTER to retry  |  S to skip (degrade + continue)  |  Esc to stop
```

but `audit-one.sh` is launched with stdin redirected to `/dev/null`, so there
is no terminal that can answer the prompt. On POSIX, `select()` treats
`/dev/null` as readable and `read(1)` returns `""`, which made the prompt loop
hot and burn CPU indefinitely.

**The patch**: both halt prompt waiters detect non-interactive stdin and EOF.
Normal halts return `False` (stop), and critical halts return `"exit"`, letting
the wrapper exit and the backend mark the audit failed instead of leaving a
misleading live PID.

---

## `plamen-scoped-package-citations.patch`

**Generated**: 2026-06-04 against `PlamenTSV/plamen@094fe11`
(v2.0.2 line).

**Symptom**: recon can cite vendored scoped-package Solidity paths such as
`@openzeppelin/contracts/access/Ownable.sol`, but the recon coverage validator
does not count them because its file-reference regex requires the first
character to be alphanumeric or `_`. For a project with a substantial
`@openzeppelin/contracts` dependency bucket, recon can fail even when the
artifacts explicitly cite those files.

**The patch**: allow `@` as a valid first/path character in the citation regex.
This keeps suffix-based coverage matching intact while correctly recognizing
scoped package paths emitted by the Codex backend.

---

## `plamen-mechanical-proof-routing.patch`

**Generated**: 2026-06-13 against the VM `~/.plamen` v2 prompt set.

**Symptom**: verifier shards can downgrade a finding to `[CODE-TRACE]` even
when a matching Medusa/PoC artifact already proved the same root cause. Then
`report_index.md` treats the stale verifier tag as the best evidence and caps a
production-relevant High/Medium finding to Low in `--proven-only` mode.

**Trigger**: DTXT is the canonical reproducer. `medusa_fuzz_findings.md` proves
the liquidity-add spoof with `[MEDUSA-PASS]`, while `verify_H-1.md` records
`[CODE-TRACE]`; report-index then emits `PROVEN(High)` and routes the issue to
`L-01`.

**The patch**:

1. SC verifier shards may read same-finding Medusa/invariant/PoC/exploit-intel
   sidecar sections and preserve `[MEDUSA-PASS]`, `[POC-PASS]`, or
   `[PROD-ONCHAIN]` as mechanical proof.
2. Report-index reads the same sidecars before final severity gating and merges
   stronger same-finding tags into the BEST evidence tag before applying the
   proven-only Low cap.
3. `exploit_intel.md` is an optional bounded input, generated by
   `scanners/audits/exploit-intel.js` from the public registry or operator env
   overrides before Plamen starts.
