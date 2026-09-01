const assert = require('node:assert/strict');
const path = require('node:path');

const { computeAlignment } = require(path.join(__dirname, '..', 'js', 'modules', 'alignment-guides.js'));

function testNoTargetsMeansNoSnap() {
  const result = computeAlignment({ x: 0, y: 0, width: 10, height: 10 }, []);
  assert.deepEqual(result, { dx: 0, dy: 0, guides: [] }, 'no targets must not move anything');
}

function testLeftEdgeSnapsToLeftEdge() {
  const moving = { x: 103, y: 200, width: 50, height: 20 };
  const targets = [{ bounds: { x: 100, y: 20, width: 40, height: 30 } }];
  const { dx, dy, guides } = computeAlignment(moving, targets, { threshold: 6 });

  assert.equal(dx, -3, 'left edge 3 units away must snap onto the target left edge');
  assert.equal(dy, 0, 'the vertical axis has no candidate within the threshold');
  assert.equal(guides.some((guide) => guide.axis === 'x' && guide.position === 100), true,
    'a vertical guide must be reported at the shared left edge');
}

function testCenterSnapsToCenter() {
  // Moving centre x = 50 + 30/2 = 65, target centre x = 100 + 60/2 = 130.
  const moving = { x: 98, y: 0, width: 30, height: 10 };
  const targets = [{ bounds: { x: 100, y: 100, width: 30, height: 10 } }];
  const { dx, guides } = computeAlignment(moving, targets, { threshold: 6 });

  assert.equal(dx, 2, 'centres 2 units apart must snap together');
  assert.equal(guides.every((guide) => guide.axis === 'x'), true, 'only vertical guides apply here');
}

function testBeyondThresholdDoesNotSnap() {
  // Both axes deliberately far from any candidate edge.
  const moving = { x: 120, y: 140, width: 10, height: 10 };
  const targets = [{ bounds: { x: 100, y: 0, width: 10, height: 10 } }];
  const result = computeAlignment(moving, targets, { threshold: 6 });

  assert.equal(result.dx, 0, 'a 20-unit gap is outside a 6-unit threshold');
  assert.equal(result.dy, 0, 'the vertical gap is outside the threshold too');
  assert.deepEqual(result.guides, [], 'no snap means no guides');
}

function testAlreadyAlignedAxisStillReportsGuide() {
  // x is far away, but y already coincides exactly. The guide must still show so
  // the user can see the alignment they are holding.
  const moving = { x: 400, y: 0, width: 10, height: 10 };
  const targets = [{ bounds: { x: 100, y: 0, width: 10, height: 10 } }];
  const { dx, dy, guides } = computeAlignment(moving, targets, { threshold: 6 });

  assert.equal(dx, 0, 'x must not snap across a 300-unit gap');
  assert.equal(dy, 0, 'an already-aligned axis needs no offset');
  assert.equal(guides.some((guide) => guide.axis === 'y'), true,
    'an exact existing alignment must still be drawn');
}

function testNearestCandidateWins() {
  const moving = { x: 104, y: 0, width: 10, height: 10 };
  const targets = [
    { bounds: { x: 100, y: 0, width: 10, height: 10 } }, // 4 away
    { bounds: { x: 105, y: 0, width: 10, height: 10 } }  // 1 away
  ];
  const { dx } = computeAlignment(moving, targets, { threshold: 6 });

  assert.equal(dx, 1, 'the closest candidate must win');
}

function testBothAxesSnapIndependently() {
  // Offsets chosen so edge-to-edge is unambiguously the nearest match on both
  // axes (a same-size rect 2 units off aligns start, end and centre together).
  const moving = { x: 102, y: 198, width: 10, height: 10 };
  const targets = [{ bounds: { x: 100, y: 200, width: 10, height: 10 } }];
  const { dx, dy, guides } = computeAlignment(moving, targets, { threshold: 6 });

  assert.equal(dx, -2, 'x must snap');
  assert.equal(dy, 2, 'y must snap');
  assert.equal(guides.some((guide) => guide.axis === 'x'), true, 'expect a vertical guide');
  assert.equal(guides.some((guide) => guide.axis === 'y'), true, 'expect a horizontal guide');
}

function testAllAlignedTargetsProduceGuides() {
  // Three targets share x = 100. Snapping to any of them aligns with all, so
  // every one should light up, not just the nearest.
  const moving = { x: 102, y: 400, width: 10, height: 10 };
  const targets = [
    { bounds: { x: 100, y: 0, width: 10, height: 10 } },
    { bounds: { x: 100, y: 100, width: 10, height: 10 } },
    { bounds: { x: 100, y: 200, width: 10, height: 10 } }
  ];
  const { dx, guides } = computeAlignment(moving, targets, { threshold: 6 });

  assert.equal(dx, -2, 'must snap to the shared edge');
  const atSharedEdge = guides.filter((guide) => guide.axis === 'x' && Math.abs(guide.position - 100) < 0.01);
  assert.equal(atSharedEdge.length >= 3, true,
    `all aligned targets should report a guide, got ${atSharedEdge.length}`);
}

function testGuideSpansBothObjects() {
  const moving = { x: 103, y: 300, width: 10, height: 20 };
  const targets = [{ bounds: { x: 100, y: 50, width: 10, height: 10 } }];
  const { guides } = computeAlignment(moving, targets, { threshold: 6 });
  const guide = guides.find((candidate) => candidate.axis === 'x');

  assert.ok(guide, 'expected a vertical guide');
  assert.equal(guide.start, 50, 'guide must start at the topmost of the two objects');
  assert.equal(guide.end, 320, 'guide must end at the bottommost of the two objects');
}

function testCanvasTargetSpansFullExtent() {
  const moving = { x: 0, y: 0, width: 100, height: 100 };
  // Canvas centre x = 500; moving centre x = 50 once placed near it.
  const targets = [{ bounds: { x: 0, y: 0, width: 1000, height: 600 }, spansCanvas: true }];
  const nearCenter = { x: 448, y: 300, width: 100, height: 100 };
  const { dx, guides } = computeAlignment(nearCenter, targets, { threshold: 6 });

  assert.equal(dx, 2, 'must snap to the canvas centre line');
  const guide = guides.find((candidate) => candidate.axis === 'x' && candidate.spansCanvas);
  assert.ok(guide, 'canvas guides must be flagged');
  assert.equal(guide.start, 0, 'a canvas guide spans the full height');
  assert.equal(guide.end, 600, 'a canvas guide spans the full height');
  assert.equal(computeAlignment(moving, targets, { threshold: 6 }).dx, 0,
    'an object already on the canvas edge needs no offset');
}

function testNegativeExtentsAreNormalized() {
  // A rect expressed with negative width must behave like its positive twin.
  // Normalizes to { x: 102, width: 10 }, so it must behave like that rect.
  const moving = { x: 112, y: 0, width: -10, height: 10 };
  const targets = [{ bounds: { x: 100, y: 0, width: 10, height: 10 } }];
  const { dx } = computeAlignment(moving, targets, { threshold: 6 });
  const positiveTwin = computeAlignment({ x: 102, y: 0, width: 10, height: 10 }, targets, { threshold: 6 });

  assert.equal(dx, -2, 'a negative-width rect must snap by its normalized left edge');
  assert.equal(dx, positiveTwin.dx, 'a negative-width rect must match its positive twin');
}

function testInvalidInputIsIgnored() {
  const targets = [{ bounds: { x: 100, y: 0, width: 10, height: 10 } }];
  for (const bad of [null, undefined, {}, { x: NaN, y: 0, width: 1, height: 1 }, { x: 1, y: 1 }]) {
    const result = computeAlignment(bad, targets, { threshold: 6 });
    assert.deepEqual(result, { dx: 0, dy: 0, guides: [] }, 'invalid moving bounds must be a no-op');
  }
  const result = computeAlignment({ x: 0, y: 0, width: 10, height: 10 }, [null, undefined, {}]);
  assert.deepEqual(result, { dx: 0, dy: 0, guides: [] }, 'invalid targets must be a no-op');
}

function testSnapWithoutVisibleGuideIsRejected() {
  // Degenerate target: zero-size at a position that cannot coincide after the
  // offset is applied. The contract is that a reported dx always has a guide.
  const { dx, dy, guides } = computeAlignment(
    { x: 0, y: 0, width: 10, height: 10 },
    [{ bounds: { x: 3, y: 3, width: 0, height: 0 } }],
    { threshold: 6 }
  );
  if (dx !== 0 || dy !== 0) {
    assert.equal(guides.length > 0, true, 'any reported offset must come with a guide to show for it');
  }
}

function testGuidesAreDeduplicated() {
  const moving = { x: 100, y: 100, width: 10, height: 10 };
  const targets = [
    { bounds: { x: 100, y: 100, width: 10, height: 10 } },
    { bounds: { x: 100, y: 100, width: 10, height: 10 } }
  ];
  const { guides } = computeAlignment(moving, targets, { threshold: 6 });
  const keys = guides.map((guide) => `${guide.axis}|${guide.position}|${guide.start}|${guide.end}`);

  assert.equal(new Set(keys).size, keys.length, 'identical guides must be collapsed');
}

function main() {
  testNoTargetsMeansNoSnap();
  testLeftEdgeSnapsToLeftEdge();
  testCenterSnapsToCenter();
  testBeyondThresholdDoesNotSnap();
  testAlreadyAlignedAxisStillReportsGuide();
  testNearestCandidateWins();
  testBothAxesSnapIndependently();
  testAllAlignedTargetsProduceGuides();
  testGuideSpansBothObjects();
  testCanvasTargetSpansFullExtent();
  testNegativeExtentsAreNormalized();
  testInvalidInputIsIgnored();
  testSnapWithoutVisibleGuideIsRejected();
  testGuidesAreDeduplicated();
  console.log('alignment-guides.test: all assertions passed');
}

main();
