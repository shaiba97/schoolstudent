import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatDelta, getTrendVerdict } from "./trend.ts";

describe("getTrendVerdict", () => {
  it("reports improving when the delta is at least one point", () => {
    assert.equal(getTrendVerdict(20), "improving");
    assert.equal(getTrendVerdict(1), "improving");
  });

  it("reports declining when the drop is at least one point", () => {
    assert.equal(getTrendVerdict(-20), "declining");
    assert.equal(getTrendVerdict(-1), "declining");
  });

  it("reports stable when the movement is under one point either way", () => {
    assert.equal(getTrendVerdict(0), "stable");
    assert.equal(getTrendVerdict(0.4), "stable");
    assert.equal(getTrendVerdict(-0.4), "stable");
    assert.equal(getTrendVerdict(0.99), "stable");
  });

  it("returns null when there is nothing to compare", () => {
    assert.equal(getTrendVerdict(null), null);
    assert.equal(getTrendVerdict(undefined), null);
    assert.equal(getTrendVerdict(NaN), null);
  });
});

describe("formatDelta", () => {
  it("signs positive deltas and rounds to one decimal", () => {
    assert.equal(formatDelta(6.24), "+6.2 pts");
    assert.equal(formatDelta(-3), "-3 pts");
    assert.equal(formatDelta(0), "+0 pts");
  });

  it("renders an em dash when there is no delta", () => {
    assert.equal(formatDelta(null), "—");
    assert.equal(formatDelta(undefined), "—");
    assert.equal(formatDelta(NaN), "—");
  });
});
