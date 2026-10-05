/**
 * Browser regression test for the wheelchair grab/push flow on the REAL room wheelchairs.
 * Needs the dev server (npm run dev -- --port 3111) and Playwright + Chromium.
 *   BASE_URL=http://127.0.0.1:3111/ node tests/wheelchair.e2e.cjs
 * Frames are stepped deterministically (no wall-clock dependence); input goes through real keyboard events.
 */
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 640, height: 400 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(process.env.BASE_URL || 'http://127.0.0.1:3111/');
  await page.waitForFunction(() => window.__game);
  await page.evaluate(() => {
    const g = window.__game; g.stop();
    g.renderer.webgl.render = (s, c) => { s.updateMatrixWorld(); c.updateMatrixWorld(); };
    window.__step = (n, dt) => { for (let i = 0; i < n; i++) g.frame(dt); };
  });
  const G = (f, a) => page.evaluate(f, a);
  const step = (sec) => page.evaluate((n) => window.__step(n, 1 / 60), Math.round(sec * 60));
  const key = async (k, sec) => { await page.keyboard.down(k); await step(sec); await page.keyboard.up(k); await step(0.02); };

  // Put the caregiver 1.0 m behind the chair and aim the crosshair at a given hit volume ('handleHitbox' | 'brakeHitboxes[0]').
  const stand = (idx, part) => G(([idx, part]) => {
    const g = window.__game, w = g.sceneManager.facility.wheelchairs[idx];
    const ry = w.group.rotation.y;
    // handle: straight behind the chair; brake lever: beside the rear wheel (where a caregiver reaches for it)
    const back = part === 'handle' ? 1.0 : 0.35, side = part === 'handle' ? 0 : -0.95; // brakeHitboxes[0] is the left lever (local -x)
    g.player.resetPosition({
      x: w.group.position.x - Math.sin(ry) * back + Math.cos(ry) * side,
      y: 0,
      z: w.group.position.z - Math.cos(ry) * back - Math.sin(ry) * side,
    });
    for (let i = 0; i < 10; i++) g.frame(1 / 60);
    w.group.updateMatrixWorld(true);
    const hb = part === 'handle' ? w.handleHitbox : w.brakeHitboxes[0];
    const t = hb.getWorldPosition(new g.sceneManager.camera.position.constructor());
    const e = g.player.position, dx = t.x - e.x, dz = t.z - e.z;
    g.player.yaw = Math.atan2(-dx, -dz);
    g.player.pitch = Math.atan2(t.y - (e.y + 1.58), Math.hypot(dx, dz));
  }, [idx, part]);
  const wcPos = (idx) => G((idx) => { const g = window.__game, w = g.sceneManager.facility.wheelchairs[idx], p = g.player.position; return { wx: w.group.position.x, wz: w.group.position.z, ry: w.group.rotation.y, px: p.x, pz: p.z }; }, idx);
  const dist = (a, b) => Math.hypot(a.wx - b.wx, a.wz - b.wz);

  for (let idx = 0; idx < 3; idx++) {
    const name = await G((i) => window.__game.sceneManager.facility.wheelchairs[i].bodyId, idx);
    console.log(`\n== ${name}`);

    // 1-2. approach, press E on the grips
    await stand(idx, 'handle'); await step(0.4);
    ok((await G(() => window.__game.sceneManager.interactionManager.activeTarget?.id))?.includes('handle'), 'crosshair focuses the grips');
    await page.keyboard.press('KeyE'); await step(0.3);
    ok(await G(() => window.__game.heldWheelchair !== null), 'E grabs the wheelchair ("Pegang")');
    await step(0.3);
    ok((await G(() => window.__game.heldWheelchair?.mode)) === 'BRAKED', 'held but still BRAKED (brake is a separate state)');

    // brake ON: W must not push
    let a = await wcPos(idx); await key('KeyW', 1.0); let b = await wcPos(idx);
    ok(dist(a, b) < 1e-4, 'brake ON: W does not push the wheelchair');

    // release the brake through the real crosshair interaction on the red lever, then keep holding
    await G(() => window.__game.heldWheelchair.toggleHold()); await step(0.3);
    await stand(idx, 'brake'); await step(0.4);
    const brakeTarget = await G(() => window.__game.sceneManager.interactionManager.activeTarget?.id);
    ok(brakeTarget?.includes('brake'), `crosshair focuses brake lever (${brakeTarget})`);
    await page.keyboard.press('KeyE'); await step(0.3);
    ok(!(await G((i) => window.__game.sceneManager.facility.wheelchairs[i].state.brakeLocked, idx)), 'E on the lever releases the brake');
    await stand(idx, 'handle'); await step(0.4);
    await page.keyboard.press('KeyE'); await step(0.3);
    ok(await G(() => window.__game.heldWheelchair !== null), 'grabbed again with brake released');

    // 4-6. W: player and wheelchair move together
    a = await wcPos(idx);
    await page.keyboard.down('KeyW');
    const mon = await G(() => { const g = window.__game, w = g.heldWheelchair, p = g.player; let lw = w.group.position.clone(), lp = p.position.clone(), mw = 0, mp = 0, minD = 9, maxD = 0; for (let i = 0; i < 70; i++) { g.frame(1 / 60); mw = Math.max(mw, w.group.position.distanceTo(lw)); mp = Math.max(mp, p.position.distanceTo(lp)); lw.copy(w.group.position); lp.copy(p.position); const d = Math.hypot(p.position.x - w.group.position.x, p.position.z - w.group.position.z); minD = Math.min(minD, d); maxD = Math.max(maxD, d); } return { mw, mp, minD, maxD }; });
    b = await wcPos(idx);
    ok(dist(a, b) > 0.4, `W: wheelchair moved ${dist(a, b).toFixed(2)} m`);
    ok(Math.hypot(b.px - a.px, b.pz - a.pz) > 0.4, `W: player moved ${Math.hypot(b.px - a.px, b.pz - a.pz).toFixed(2)} m with it`);
    ok(mon.mw < 0.06 && mon.mp < 0.06, `no teleport/snap (max per-frame: chair ${mon.mw.toFixed(3)}, player ${mon.mp.toFixed(3)})`);
    ok(mon.maxD <= 1.17 && mon.minD >= 0.64, `stays connected, never overlapping (${mon.minD.toFixed(2)}..${mon.maxD.toFixed(2)} m)`);

    // 7. release W: gradual stop
    await page.keyboard.up('KeyW');
    const speeds = await G(() => { const g = window.__game, w = g.heldWheelchair, out = []; for (let i = 0; i < 180; i++) { g.frame(1 / 60); out.push(w.physicalBody.velocity.length()); } return out; });
    ok(speeds[speeds.length - 1] < 0.01, 'releasing W: wheelchair comes to rest');
    let mono = true; for (let i = 1; i < speeds.length; i++) if (speeds[i] > speeds[i - 1] + 0.02) mono = false;
    ok(mono, 'deceleration is monotonic (no jitter)');

    // S: backwards
    a = await wcPos(idx); await key('KeyS', 0.8); b = await wcPos(idx);
    ok(dist(a, b) > 0.3, `S: pulls the wheelchair back ${dist(a, b).toFixed(2)} m`);

    // steering: rotate heading, wheelchair turns at a limited rate
    a = await wcPos(idx);
    await G(() => { window.__game.player.yaw += 0.6; });
    await step(0.1);
    b = await wcPos(idx);
    ok(Math.abs(b.ry - a.ry) <= 2.8 * 0.1 + 0.01 && Math.abs(b.ry - a.ry) > 0.02, `turning is rate-limited (${(b.ry - a.ry).toFixed(3)} rad in 0.1 s)`);
    await G(() => { window.__game.player.yaw -= 0.6; }); await step(1.0);

    // 8-9. E releases; WASD walks normally; chair no longer follows
    await G(() => { window.__game.player.pitch = 0; }); await step(0.2); // not aiming at the brake lever (that would toggle the brake instead)
    const preTarget = await G(() => window.__game.sceneManager.interactionManager.activeTarget?.id + ' phase=' + window.__game.sceneManager.interactionManager.phase + ' state=' + window.__game.fsm.state + ' cd=' + window.__game.sceneManager.interactionManager.coolingDown);
    await page.keyboard.press('KeyE'); await step(0.3);
    ok((await G(() => window.__game.heldWheelchair)) === null, 'E releases the wheelchair (before E: ' + preTarget + ')');
    ok(await G(() => window.__game.player.speedScale === 1 || window.__game.player.speedScale > 0.9), 'player speed scale restored after release');
    a = await wcPos(idx); await key('KeyS', 0.4); b = await wcPos(idx);
    ok(Math.hypot(b.px - a.px, b.pz - a.pz) > 0.3, `after release WASD walks normally (${Math.hypot(b.px - a.px, b.pz - a.pz).toFixed(2)} m in 0.4 s)`);
    ok(dist(a, b) < 0.5, 'released wheelchair is not dragged along');
    await step(2.0);
  }

  // Doorway: steer each wheelchair out through its room door into the corridor
  const doors = { 0: -6.9, 1: -3.1, 2: 3.1 };
  for (let idx = 0; idx < 3; idx++) {
    console.log(`\n== doorway, wheelchair ${idx}`);
    ok((await G(() => window.__game.heldWheelchair)) === null, 'nothing held at start');
    await G((i) => { const w = window.__game.sceneManager.facility.wheelchairs[i]; if (w.state.brakeLocked) w.toggleBrake(); }, idx);
    await stand(idx, 'handle'); await step(0.4);
    await page.keyboard.press('KeyE'); await step(0.3);
    const doorX = doors[idx];
    await page.keyboard.down('KeyW');
    const res = await G((doorX) => {
      const g = window.__game, w = g.heldWheelchair, p = g.player;
      let steps = 0;
      for (let i = 0; i < 60 * 14; i++, steps++) {
        // "mouse steering": aim at a look-ahead point on the line through the door centre
        const wz = w.group.position.z;
        const ahead = wz > -0.3 ? 0.8 : 3.0;
        const dx = doorX - w.group.position.x, dz = Math.min(wz - ahead, -0.5) - wz;
        p.yaw = Math.atan2(-dx, -dz);
        g.frame(1 / 60);
        if (w.group.position.z < -1.9) break;
      }
      return { z: w.group.position.z, x: w.group.position.x, steps, pz: p.position.z };
    }, doorX);
    await page.keyboard.up('KeyW');
    ok(res.z < -1.5, `wheelchair pushed through the doorway into the corridor (z=${res.z.toFixed(2)}, x=${res.x.toFixed(2)}, ${res.steps} frames), player z=${res.pz.toFixed(2)}`);
    await page.keyboard.press('KeyE'); await step(0.3);
  }

  ok(errors.length === 0, `no page errors ${errors.join('|')}`);
  await browser.close();
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
})();
