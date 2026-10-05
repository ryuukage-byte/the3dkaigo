/**
 * Chair.ts
 * Japanese care facility armchairs (肘付き介護椅子), office swivel chairs,
 * and specialized bath chairs (シャワーチェア).
 */

import * as THREE from 'three';
import { materials } from '../world/Materials.ts';
import { collisionWorld } from '../world/CollisionWorld.ts';
import { physicsWorld } from '../physics/PhysicsWorld.ts';

export interface ChairOptions {
  position: THREE.Vector3;
  rotationY?: number;
  type?: 'kaigo' | 'office' | 'shower' | 'sofa';
  color?: 'blue' | 'green' | 'beige';
  hasCollision?: boolean;
  movable?: boolean;
  mass?: number;
  name?: string;
}

export function createChair(options: ChairOptions): THREE.Group {
  const group = new THREE.Group();
  const type = options.type ?? 'kaigo';
  const color = options.color ?? 'green';

  const upholsteryMat = color === 'blue'
    ? materials.get('fabricBlue')
    : color === 'beige'
    ? materials.get('fabricBeige')
    : materials.get('fabricGreen');

  if (type === 'kaigo') {
    // Care armchair with stand-up assist armrests
    const seatW = 0.52;
    const seatD = 0.48;
    const seatH = 0.42;
    const backH = 0.82;
    const woodMat = materials.get('woodLight');

    // Seat cushion
    const seatGeo = new THREE.BoxGeometry(seatW - 0.04, 0.05, seatD - 0.04);
    const seatMesh = new THREE.Mesh(seatGeo, upholsteryMat);
    seatMesh.position.set(0, seatH, 0);
    seatMesh.castShadow = true;
    group.add(seatMesh);

    // Curved/angled backrest
    const backGeo = new THREE.BoxGeometry(seatW - 0.06, 0.38, 0.04);
    const backMesh = new THREE.Mesh(backGeo, upholsteryMat);
    backMesh.position.set(0, seatH + 0.22, -seatD / 2 + 0.02);
    backMesh.castShadow = true;
    group.add(backMesh);

    // 4 sturdy legs
    const legGeo = new THREE.BoxGeometry(0.04, seatH, 0.04);
    const legOffsets = [
      [-seatW / 2 + 0.02, -seatD / 2 + 0.02],
      [seatW / 2 - 0.02, -seatD / 2 + 0.02],
      [-seatW / 2 + 0.02, seatD / 2 - 0.02],
      [seatW / 2 - 0.02, seatD / 2 - 0.02],
    ];

    for (const [lx, lz] of legOffsets) {
      const leg = new THREE.Mesh(legGeo, woodMat);
      leg.position.set(lx, seatH / 2, lz);
      leg.castShadow = true;
      group.add(leg);
    }

    // Extended wooden armrests for stand-up support
    for (const side of [-1, 1]) {
      const armX = side * (seatW / 2 - 0.02);
      // Vertical support
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.2, 0.035), woodMat);
      post.position.set(armX, seatH + 0.1, seatD / 2 - 0.05);
      group.add(post);

      // Arm rail with rounded grip front
      const armRail = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.025, seatD + 0.04), woodMat);
      armRail.position.set(armX, seatH + 0.2, 0.02);
      group.add(armRail);
    }
  } else if (type === 'office') {
    // 5-star base office swivel chair
    const darkMat = materials.get('metalDark');
    const seatH = 0.46;

    // Center pneumatic cylinder
    const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.35, 8), darkMat);
    cylinder.position.set(0, 0.22, 0);
    group.add(cylinder);

    // 5 star legs
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.25), darkMat);
      leg.rotation.y = angle;
      leg.position.set(Math.sin(angle) * 0.12, 0.06, Math.cos(angle) * 0.12);
      group.add(leg);

      // Caster
      const caster = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.02, 8), darkMat);
      caster.position.set(Math.sin(angle) * 0.25, 0.025, Math.cos(angle) * 0.25);
      group.add(caster);
    }

    // Ergonomic seat
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.06, 0.46), darkMat);
    seat.position.set(0, seatH, 0);
    group.add(seat);

    // Breathable mesh back
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.46, 0.03), darkMat);
    back.position.set(0, seatH + 0.26, -0.2);
    group.add(back);
  } else if (type === 'sofa') {
    // Comfortable lounge sofa in Day Hall
    const sofaW = 1.6;
    const sofaD = 0.8;
    const seatH = 0.40;

    // Base body
    const base = new THREE.Mesh(new THREE.BoxGeometry(sofaW, 0.25, sofaD), materials.get('woodLight'));
    base.position.set(0, 0.15, 0);
    group.add(base);

    // Cushions
    const seat = new THREE.Mesh(new THREE.BoxGeometry(sofaW - 0.1, 0.16, sofaD - 0.15), upholsteryMat);
    seat.position.set(0, seatH, 0.05);
    group.add(seat);

    // Backrest
    const back = new THREE.Mesh(new THREE.BoxGeometry(sofaW - 0.1, 0.45, 0.18), upholsteryMat);
    back.position.set(0, seatH + 0.25, -sofaD / 2 + 0.12);
    group.add(back);

    // Armrests
    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.28, sofaD), upholsteryMat);
      arm.position.set(side * (sofaW / 2 - 0.06), seatH + 0.08, 0);
      group.add(arm);
    }
  }

  group.position.copy(options.position);
  if (options.rotationY) {
    group.rotation.y = options.rotationY;
  }

  const isMovable = options.movable ?? (type !== 'sofa');

  if (options.hasCollision !== false) {
    if (isMovable) {
      const mass = options.mass ?? (type === 'shower' ? 6 : type === 'office' ? 11 : 9.5);
      const radius = type === 'shower' ? 0.24 : 0.28;
      const height = type === 'shower' ? 0.70 : 0.85;

      const body = physicsWorld.register({
        id: options.name ?? `chair_${Math.round(options.position.x * 100)}_${Math.round(options.position.z * 100)}`,
        name: options.name ?? 'chair',
        group,
        movable: true,
        mass,
        radius,
        height,
        friction: 0.65,
        restitution: 0.15,
        linearDamping: 4.8,
        angularDamping: 5.5,
      });
      group.userData.physicalBody = body;
    } else {
      const size = 0.8;
      collisionWorld.addBox(
        new THREE.Vector3(options.position.x - size, 0, options.position.z - size),
        new THREE.Vector3(options.position.x + size, 0.85, options.position.z + size),
        options.name ?? 'sofa'
      );
    }
  }

  return group;
}
