# Reconciliation model

Yukh Projects separates desired state, observed GitHub state, planning, and
execution.

![Reviewed policy and issue contract are compared with bounded GitHub observations to produce a deterministic plan. Dry-run returns a redacted report; controlled apply requires separate approval and verification.](../assets/reconciliation-flow.svg)

## The boundary

1. Repository policy declares managed and observed fields.
2. The issue contract declares desired values and relationships.
3. Fixed GitHub adapters bind and validate observed state.
4. The planner produces an ordered plan with exact preconditions.
5. Dry-run returns a redacted report and stops.
6. Controlled apply, when separately qualified, re-observes state, verifies
   approval, executes allowlisted operations, and verifies convergence.

The planner never infers missing intent. Unmanaged fields are preserved.
Provider IDs and raw API responses remain outside public reports.
