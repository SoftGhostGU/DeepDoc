# Retrieval Flow Manual Verification Checklist

## Scope

This checklist validates task `3.2` and task `4.5` for `fix-heatmap-and-flow-ui`.

## Steps

1. Start `web-app` in dev mode and open `/chat/<documentId>` for an indexed document.
2. Submit one question and switch to the `Retrieval` tab immediately.
3. Confirm node updates occur during streaming:
   - `analyzing` is `active` first.
   - When stage moves to `rewriting`, `analyzing` becomes `completed` immediately.
   - `retrieving_summary` and `retrieving_paragraphs` activate in order.
   - `generating` becomes `active` while tokens stream.
4. Wait until streaming ends and confirm:
   - `query`, all stage nodes, and `answer` are `completed`.
   - Edge colors/animations are updated consistently with node status.
5. Resize browser width below `640px` and confirm the flow canvas can be panned.

## Expected Result

- No stale node state between stages.
- `analyzing -> rewriting` transition marks `analyzing` completed immediately.
- Final state remains completed after stream end.
