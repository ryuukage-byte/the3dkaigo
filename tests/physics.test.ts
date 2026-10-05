/**
 * Headless regression test for CollisionWorld + PhysicsWorld (no DOM / WebGL needed).
 * Run: npm run test:physics
 */
import * as THREE from 'three';
import { collisionWorld } from '../src/world/CollisionWorld.ts';
import { physicsWorld, PlayerProxy } from '../src/physics/PhysicsWorld.ts';

let fails = 0;
const ok = (c: boolean, m: string) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

function reset() {
  collisionWorld.clear(); physicsWorld.clear();
  // room walls: x in [-5,5], z in [-5,5], 0.15 thick
  collisionWorld.addBox(V(-5.15, 0, -5.15), V(5.15, 2.5, -5), 'N');
  collisionWorld.addBox(V(-5.15, 0, 5), V(5.15, 2.5, 5.15), 'S');
  collisionWorld.addBox(V(-5.15, 0, -5), V(-5, 2.5, 5), 'W');
  collisionWorld.addBox(V(5, 0, -5), V(5.15, 2.5, 5), 'E');
}
function mkPlayer(x: number, z: number): PlayerProxy {
  return { position: V(x, 0, z), velocity: V(0, 0, 0), yaw: 0, radius: 0.32, height: 1.68, mass: 70 };
}
function body(id: string, x: number, z: number, o: any = {}) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  return physicsWorld.register({ id, name: id, group: g, mass: 10, radius: 0.28, height: 0.85, friction: 0.35, linearDamping: 0.8, ...o });
}
// player walking toward -Z at speed v (yaw 0 => forward is -Z). Simple accel model like PlayerController.
function walk(p: PlayerProxy, dirx: number, dirz: number, speed: number, seconds: number, dt: number, onStep?: () => void) {
  const n = Math.round(seconds / dt);
  let maxStep = 0;
  for (let i = 0; i < n; i++) {
    const rate = 22 * dt;
    const f = physicsWorld.playerSpeedFactor; const tx = dirx * speed * f, tz = dirz * speed * f;
    const dvx = tx - p.velocity.x, dvz = tz - p.velocity.z, dv = Math.hypot(dvx, dvz);
    if (dv <= rate) { p.velocity.x = tx; p.velocity.z = tz; } else { p.velocity.x += dvx / dv * rate; p.velocity.z += dvz / dv * rate; }
    const ox = p.position.x, oz = p.position.z;
    collisionWorld.moveCircle(p.position, p.velocity.x * dt, p.velocity.z * dt, p.radius, p.height);
    const mx = p.position.x - ox, mz = p.position.z - oz;
    if (Math.hypot(mx, mz) < Math.hypot(p.velocity.x * dt, p.velocity.z * dt) * 0.999) { p.velocity.x = mx / dt; p.velocity.z = mz / dt; }
    physicsWorld.step(dt);
    maxStep = Math.max(maxStep, Math.hypot(p.position.x - ox, p.position.z - oz));
    onStep?.();
  }
  return maxStep;
}

// 1. wall: stops, slides, no tunnel even at dt = 0.05 and running speed
for (const dt of [1 / 144, 1 / 60, 0.05]) {
  reset(); const p = mkPlayer(0, 0); physicsWorld.setPlayer(p);
  const sub = Math.ceil(dt / (1 / 60)); // like Game: equal sub-steps
  walk(p, 0, -1, 4.2, 3, dt / sub);
  ok(p.position.z >= -5 + 0.32 - 1e-3 && p.position.z < -4.6, `wall stop (dt=${dt.toFixed(3)}) z=${p.position.z.toFixed(3)}`);
}
// 2. diagonal into wall slides along it
reset(); { const p = mkPlayer(0, -4); physicsWorld.setPlayer(p);
  walk(p, 0.707, -0.707, 2.4, 1, 1 / 60);
  ok(p.position.x > 1.2 && p.position.z >= -4.68 - 1e-3, `diagonal wall slide x=${p.position.x.toFixed(2)} z=${p.position.z.toFixed(2)}`); }
// 3. corner: not stuck
reset(); { const p = mkPlayer(4, -4); physicsWorld.setPlayer(p);
  walk(p, 0.707, -0.707, 2.4, 1, 1 / 60);
  walk(p, -1, 0, 2.4, 1, 1 / 60);
  ok(p.position.x < 3.0, `leaves corner x=${p.position.x.toFixed(2)}`); }
// 4. push chair: chair moves, player keeps most of its speed
reset(); { const p = mkPlayer(0, 2); physicsWorld.setPlayer(p); const c = body('chair', 0, 0.8);
  walk(p, 0, -1, 2.4, 1.2, 1 / 60);
  ok(c.position.z < 0.3 && p.position.z < c.position.z + 0.6 + 0.02, `chair pushed z=${c.position.z.toFixed(2)} player z=${p.position.z.toFixed(2)} (ps ${Math.hypot(p.velocity.x, p.velocity.z).toFixed(2)})`);
  ok(Math.hypot(p.velocity.x, p.velocity.z) > 2.0, 'player barely slowed by chair'); }
// 5. table slows player more
reset(); { const p = mkPlayer(0, 2); physicsWorld.setPlayer(p); const t = body('table', 0, 0.7, { mass: 32, radius: 0.5, friction: 0.5, linearDamping: 1 });
  walk(p, 0, -1, 2.4, 1.2, 1 / 60);
  const sp = Math.hypot(p.velocity.x, p.velocity.z);
  ok(t.position.z < 0.5 && sp > 1.2 && sp < 2.3, `table pushed, player slowed to ${sp.toFixed(2)} m/s`); }
// 6. push chair into wall: player stops, never overlaps, never inside wall
reset(); { const p = mkPlayer(0, 0); physicsWorld.setPlayer(p); const c = body('chair', 0, -1);
  let bad = 0; walk(p, 0, -1, 2.4, 6, 1 / 60, () => {
    if (Math.hypot(p.position.x - c.position.x, p.position.z - c.position.z) < 0.6 - 1e-3) bad++;
    if (c.position.z < -5 + 0.28 - 1e-3 || p.position.z < -5 + 0.32 - 1e-3) bad++;
  });
  ok(bad === 0, `chair pinned against wall, overlap violations=${bad}, chair z=${c.position.z.toFixed(2)}, player z=${p.position.z.toFixed(2)}`); }
// 7. chain: chair pushes table pushes chair
reset(); { const p = mkPlayer(0, 3); physicsWorld.setPlayer(p); const a = body('a', 0, 2); const t = body('t', 0, 1.1, { mass: 32, radius: 0.5, friction: 0.5, linearDamping: 1 });
  walk(p, 0, -1, 2.4, 1.5, 1 / 60);
  ok(t.position.z < 1.1 - 0.3, `chain push moves table z=${t.position.z.toFixed(2)}`); }
// 8. braked wheelchair blocks, unbraked rolls then stops
reset(); { let braked = true; const p = mkPlayer(0, 2); physicsWorld.setPlayer(p);
  const w = body('wc', 0, 0.8, { mass: 24, radius: 0.42, height: 0.95, friction: 0.12, linearDamping: 0.25, lateralGrip: 6, isLocked: () => braked });
  walk(p, 0, -1, 2.4, 1, 1 / 60);
  ok(Math.abs(w.position.z - 0.8) < 1e-6 && p.position.z > 0.8 + 0.74 - 0.02, `braked wheelchair immovable, player stopped z=${p.position.z.toFixed(2)}`);
  braked = false;
  walk(p, 0, -1, 2.4, 0.6, 1 / 60); // push it
  const z1 = w.position.z; walk(p, 0, 0, 0, 0.0001, 1 / 60);
  p.velocity.set(0, 0, 0);
  const speedAtRelease = Math.hypot(w.velocity.x, w.velocity.z);
  let travelled = 0, last = w.position.z; walk(p, 0, 0, 0, 4, 1 / 60, () => { travelled += Math.abs(w.position.z - last); last = w.position.z; });
  ok(z1 < 0.8 - 0.3, `unbraked wheelchair pushed z=${z1.toFixed(2)}`);
  ok(Math.hypot(w.velocity.x, w.velocity.z) === 0 && travelled > 0.05, `coasts ${travelled.toFixed(2)}m after release (v0=${speedAtRelease.toFixed(2)}) then stops`); }
// 9. REGRESSION: grab wheelchair -> press W -> wheelchair displacement > 0 (brake off), player moves with it
const wcOpts = { mass: 24, radius: 0.34, height: 0.95, friction: 0.12, linearDamping: 0.25, lateralGrip: 6 };
function wheelchairScene(braked: boolean, playerDist = 0.9) {
  reset(); const p = mkPlayer(0, 1 + playerDist); physicsWorld.setPlayer(p);
  const state = { braked };
  const w = body('wc', 0, 1, { ...wcOpts, isLocked: () => state.braked });
  w.rotationY = Math.PI; w.group.rotation.y = Math.PI; // faces -Z; handles at +Z
  p.yaw = 0;
  physicsWorld.attachPlayerJoint(w, 1.15, true);
  return { p, w, state };
}
{ const { p, w } = wheelchairScene(false);
  const z0 = w.position.z, pz0 = p.position.z; let maxStep = 0, maxPlayerStep = 0, lastW = w.position.clone(), lastP = p.position.clone();
  walk(p, 0, -1, 2.4, 1.5, 1 / 60, () => { maxStep = Math.max(maxStep, w.position.distanceTo(lastW)); lastW.copy(w.position); maxPlayerStep = Math.max(maxPlayerStep, p.position.distanceTo(lastP)); lastP.copy(p.position); });
  ok(z0 - w.position.z > 1.0, `REGRESSION grab->W: wheelchair displacement ${(z0 - w.position.z).toFixed(2)} m > 0`);
  ok(pz0 - p.position.z > 1.0, `player moves forward with it (${(pz0 - p.position.z).toFixed(2)} m)`);
  ok(Math.hypot(p.position.x - w.position.x, p.position.z - w.position.z) <= 1.15 + 0.02, 'player stays connected (within grip reach)');
  ok(maxStep < 0.05 && maxPlayerStep < 0.05, `no snap/teleport: max step wheelchair ${maxStep.toFixed(3)} player ${maxPlayerStep.toFixed(3)}`);
  // release W: player stops, wheelchair decelerates gradually (not instantly, not forever)
  const v0 = Math.hypot(w.velocity.x, w.velocity.z);
  p.velocity.set(0, 0, 0);
  const speeds: number[] = []; walk(p, 0, 0, 0, 3, 1 / 60, () => speeds.push(Math.hypot(w.velocity.x, w.velocity.z)));
  ok(speeds[speeds.length - 1] === 0 && speeds.some((s) => s > 0.05), `releasing W: wheelchair decelerates to rest (v0 ${v0.toFixed(2)} m/s)`);
  let monotone = true; for (let i = 1; i < speeds.length; i++) if (speeds[i] > speeds[i - 1] + 1e-6) monotone = false;
  ok(monotone, 'deceleration is smooth/monotonic (no oscillation)'); }
// S: backwards drags it
{ const { p, w } = wheelchairScene(false);
  const z0 = w.position.z; walk(p, 0, 1, 1.68, 1.5, 1 / 60);
  ok(w.position.z - z0 > 0.8 && Math.hypot(p.position.x - w.position.x, p.position.z - w.position.z) <= 1.17, `S pulls the wheelchair back ${(w.position.z - z0).toFixed(2)} m, still connected`); }
// brake ON: W cannot push; brake OFF afterwards: can
{ const { p, w, state } = wheelchairScene(true);
  const z0 = w.position.z; walk(p, 0, -1, 2.4, 1.0, 1 / 60);
  ok(w.position.z === z0, 'brake ON: wheelchair does not move, player does not pass through');
  state.braked = false; walk(p, 0, -1, 2.4, 1.0, 1 / 60);
  ok(z0 - w.position.z > 0.8, `brake OFF: now pushable (${(z0 - w.position.z).toFixed(2)} m)`); }
// A/D strafing while holding: the caregiver stays in the rear lane (steering is by turning), no snap
{ const { p, w } = wheelchairScene(false); let maxStep = 0, last = w.position.clone(), maxLat = 0;
  walk(p, 1, 0, 2.4, 1.5, 1 / 60, () => { maxStep = Math.max(maxStep, w.position.distanceTo(last)); last.copy(w.position); maxLat = Math.max(maxLat, Math.abs(p.position.x - w.position.x)); });
  ok(maxStep < 0.05 && maxLat <= 0.34 && Math.hypot(p.position.x - w.position.x, p.position.z - w.position.z) <= 1.17, `strafe while holding: stays in rear lane (lateral ${maxLat.toFixed(2)} m), no snap (${maxStep.toFixed(3)})`); }
// Standing beside the chair when grabbed: drawn behind it smoothly, then W pushes it (the doorway failure)
{ reset(); const p = mkPlayer(0.65, 1.0); physicsWorld.setPlayer(p); const w = body('wc', 0, 1, { ...wcOpts }); w.rotationY = Math.PI; w.group.rotation.y = Math.PI; p.yaw = 0;
  physicsWorld.attachPlayerJoint(w, 1.15, true); let maxP = 0, last = p.position.clone();
  const z0 = w.position.z; walk(p, 0, -1, 2.4, 2.0, 1 / 60, () => { maxP = Math.max(maxP, p.position.distanceTo(last)); last.copy(p.position); });
  ok(z0 - w.position.z > 1.0 && maxP < 0.07, `grabbed from beside: chair still pushed ${(z0 - w.position.z).toFixed(2)} m, no snap (${maxP.toFixed(3)})`); }
// Yaw follow is rate-limited and never excessive
{ const { p, w } = wheelchairScene(false); p.yaw = 1.2; const r0 = w.rotationY; walk(p, 0, 0, 0, 0.1, 1 / 60);
  ok(Math.abs(w.rotationY - r0) <= 2.8 * 0.1 + 1e-3, `wheelchair turn rate-limited (${(w.rotationY - r0).toFixed(3)} rad in 0.1 s)`); }
// Wall: pushing the held wheelchair into a wall stops both, no overlap
{ const { p, w } = wheelchairScene(false); let bad = 0;
  walk(p, 0, -1, 2.4, 6, 1 / 60, () => { if (w.position.z < -5 + 0.34 - 1e-3 || p.position.z < -5 + 0.32 - 1e-3 || Math.hypot(p.position.x - w.position.x, p.position.z - w.position.z) < 0.66 - 1e-3) bad++; });
  ok(bad === 0 && w.position.z < -4.5, `wall: held wheelchair stops at wall, violations ${bad}, wc z ${w.position.z.toFixed(2)}`);
  walk(p, 0, 1, 2.4, 2, 1 / 60);
  ok(w.position.z > -4.0, 'can pull it back out of the wall (player not stuck)'); }
// Blocked behind (the shipped room layouts): grip from the side where the rear is walled off still moves it forward
{ reset(); collisionWorld.addBox(V(-1, 0, 1.3), V(1, 0.97, 2.4), 'bed'); // bed right behind the handles
  const p = mkPlayer(0.9, 1.3); physicsWorld.setPlayer(p); const w = body('wc', 0, 1, { ...wcOpts }); w.rotationY = Math.PI; w.group.rotation.y = Math.PI; p.yaw = 0;
  physicsWorld.attachPlayerJoint(w, 1.15, true); const z0 = w.position.z;
  walk(p, 0, -1, 2.4, 1.2, 1 / 60);
  ok(z0 - w.position.z > 0.3, `blocked grip point does not leave the player stuck (chair moved ${(z0 - w.position.z).toFixed(2)} m)`); }
// Release: normal walking resumes and chair is no longer constrained
{ const { p, w } = wheelchairScene(false); walk(p, 0, -1, 2.4, 0.5, 1 / 60); physicsWorld.detachPlayerJoint();
  const pz = p.position.z; walk(p, 0, 1, 2.4, 2, 1 / 60);
  ok(p.position.z - pz > 3.5 && Math.hypot(p.position.x - w.position.x, p.position.z - w.position.z) > 1.5, 'after release the player walks away freely (rope gone)'); }
console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
process.exit(fails ? 1 : 0);
