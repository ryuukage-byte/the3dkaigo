/**
 * DiningArea.ts
 * Common Dining Area & Day Hall (食堂・機能訓練室・デイルーム).
 * Main community hub featuring 3 dining tables with wide wheelchair navigation clearances,
 * 10 kaigo armchairs, relaxation lounge with sofa & TV, water/tea station,
 * and expansive south windows overlooking the Japanese garden.
 */

import * as THREE from 'three';
import { createTable } from '../furniture/Table.ts';
import { createChair } from '../furniture/Chair.ts';
import { createCabinet } from '../furniture/Cabinet.ts';
import {
  createWaterDispenser,
  createWallClock,
  createPottedPlant,
  createNoticeBoard,
  createTissueBox
} from '../furniture/Props.ts';
import { createWindow } from '../architecture/Window.ts';

export function createDiningArea(): THREE.Group {
  const group = new THREE.Group();

  // 1. Dining Table 01 (West side of dining hall: X = -0.8, Z = 4.2)
  const table1 = createTable({
    position: new THREE.Vector3(-0.8, 0, 4.2),
    width: 1.6,
    depth: 0.9,
    type: 'dining',
    name: 'dining_table_1',
  });
  group.add(table1);

  // Chairs for Table 01 (4 chairs with stand-up assist armrests)
  const t1Chairs = [
    { pos: new THREE.Vector3(-1.3, 0, 4.2), rot: Math.PI / 2, color: 'green' as const },
    { pos: new THREE.Vector3(-0.3, 0, 4.2), rot: -Math.PI / 2, color: 'blue' as const },
    { pos: new THREE.Vector3(-0.8, 0, 3.5), rot: 0, color: 'green' as const },
    { pos: new THREE.Vector3(-0.8, 0, 4.9), rot: Math.PI, color: 'beige' as const },
  ];
  for (let i = 0; i < t1Chairs.length; i++) {
    const c = t1Chairs[i];
    group.add(createChair({
      position: c.pos,
      rotationY: c.rot,
      type: 'kaigo',
      color: c.color,
      name: `dining_chair_t1_${i}`,
    }));
  }
  group.add(createTissueBox(new THREE.Vector3(-0.8, 0.72, 4.2)));

  // 2. Dining Table 02 (Center of dining hall: X = 2.4, Z = 4.2)
  const table2 = createTable({
    position: new THREE.Vector3(2.4, 0, 4.2),
    width: 1.6,
    depth: 0.9,
    type: 'dining',
    name: 'dining_table_2',
  });
  group.add(table2);

  const t2Chairs = [
    { pos: new THREE.Vector3(1.9, 0, 4.2), rot: Math.PI / 2, color: 'blue' as const },
    { pos: new THREE.Vector3(2.9, 0, 4.2), rot: -Math.PI / 2, color: 'green' as const },
    { pos: new THREE.Vector3(2.4, 0, 3.5), rot: 0, color: 'beige' as const },
    { pos: new THREE.Vector3(2.4, 0, 4.9), rot: Math.PI, color: 'blue' as const },
  ];
  for (let i = 0; i < t2Chairs.length; i++) {
    const c = t2Chairs[i];
    group.add(createChair({
      position: c.pos,
      rotationY: c.rot,
      type: 'kaigo',
      color: c.color,
      name: `dining_chair_t2_${i}`,
    }));
  }

  // 3. Dining Table 03 (East side: X = 5.6, Z = 4.2)
  const table3 = createTable({
    position: new THREE.Vector3(5.6, 0, 4.2),
    width: 1.6,
    depth: 0.9,
    type: 'dining',
    name: 'dining_table_3',
  });
  group.add(table3);

  const t3Chairs = [
    { pos: new THREE.Vector3(5.1, 0, 4.2), rot: Math.PI / 2, color: 'green' as const },
    { pos: new THREE.Vector3(6.1, 0, 4.2), rot: -Math.PI / 2, color: 'beige' as const },
    { pos: new THREE.Vector3(5.6, 0, 3.5), rot: 0, color: 'blue' as const },
    { pos: new THREE.Vector3(5.6, 0, 4.9), rot: Math.PI, color: 'green' as const },
  ];
  for (let i = 0; i < t3Chairs.length; i++) {
    const c = t3Chairs[i];
    group.add(createChair({
      position: c.pos,
      rotationY: c.rot,
      type: 'kaigo',
      color: c.color,
      name: `dining_chair_t3_${i}`,
    }));
  }

  // 4. Relaxation Lounge Area (East corner: X = 7.6, Z = 5.8)
  const sofa = createChair({
    position: new THREE.Vector3(7.4, 0, 5.8),
    rotationY: -Math.PI / 2, // facing west towards TV
    type: 'sofa',
    color: 'beige',
    name: 'lounge_sofa',
  });
  group.add(sofa);

  // TV Console & Flat Screen against East wall (X = 8.4, Z = 4.2)
  const tvConsole = createCabinet({
    position: new THREE.Vector3(8.4, 0, 4.2),
    type: 'tv_console',
    rotationY: -Math.PI / 2,
    name: 'tv_console',
  });
  group.add(tvConsole);

  // 5. Water Dispenser & Tea Station (X = -2.2, Z = 3.2)
  const waterServer = createWaterDispenser(new THREE.Vector3(-2.2, 0, 3.2), 0);
  group.add(waterServer);

  // Tea cup storage cabinet beside water dispenser
  const teaCupCabinet = createCabinet({
    position: new THREE.Vector3(-2.2, 0, 4.2),
    type: 'wardrobe',
    rotationY: Math.PI / 2,
    name: 'tea_cup_cabinet',
  });
  group.add(teaCupCabinet);

  // 6. South Exterior Windows looking out to garden (Z = 6.8)
  const windowXPositions = [-0.8, 2.4, 5.6];
  for (const wx of windowXPositions) {
    const windowMesh = createWindow({
      position: new THREE.Vector3(wx, 1.4, 6.78),
      width: 2.2,
      height: 1.5,
      rotationY: 0,
      hasCurtains: true,
    });
    group.add(windowMesh);
  }

  // 7. Hall Wall Clock on North wall (Z = 2.62)
  const clock = createWallClock(new THREE.Vector3(2.4, 2.0, 2.62), Math.PI);
  group.add(clock);

  // 8. Weekly Recreation & Menu Board on North wall
  const menuBoard = createNoticeBoard(new THREE.Vector3(4.5, 1.5, 2.62), 1.8, 0.9, Math.PI);
  group.add(menuBoard);

  // 9. Potted Plants in corners
  const plant1 = createPottedPlant(new THREE.Vector3(-2.2, 0, 6.2));
  group.add(plant1);

  const plant2 = createPottedPlant(new THREE.Vector3(8.2, 0, 6.2));
  group.add(plant2);

  return group;
}
