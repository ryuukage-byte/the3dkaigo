/**
 * FacilityLayout.ts
 * Exact human-scale spatial coordinates, room bounding boxes, and door portals
 * for the 18m x 14m Japanese Kaigo facility.
 */

import * as THREE from 'three';

export interface RoomDefinition {
  id: string;
  nameJa: string;
  nameEn: string;
  min: THREE.Vector3;
  max: THREE.Vector3;
  colorTag: string;
  center: THREE.Vector3;
}

export interface DoorOpening {
  wallId: string;
  center: THREE.Vector3;
  width: number;
  height: number;
  axis: 'x' | 'z'; // wall runs along x or z
  labelJa: string;
  labelEn: string;
}

export const FACILITY_ROOMS: RoomDefinition[] = [
  {
    id: 'locker',
    nameJa: '更衣室',
    nameEn: 'LOCKER ROOM',
    min: new THREE.Vector3(-8.8, 0, -6.8),
    max: new THREE.Vector3(-4.8, 2.5, -2.8),
    center: new THREE.Vector3(-6.8, 1.25, -4.8),
    colorTag: '#3B82F6',
  },
  {
    id: 'office',
    nameJa: '事務室・NS',
    nameEn: 'OFFICE & NURSE STATION',
    min: new THREE.Vector3(-4.8, 0, -6.8),
    max: new THREE.Vector3(3.0, 2.5, -2.8),
    center: new THREE.Vector3(-0.9, 1.25, -4.8),
    colorTag: '#10B981',
  },
  {
    id: 'utility',
    nameJa: 'リネン・倉庫',
    nameEn: 'UTILITY & LINEN',
    min: new THREE.Vector3(3.0, 0, -6.8),
    max: new THREE.Vector3(8.8, 2.5, -2.8),
    center: new THREE.Vector3(5.9, 1.25, -4.8),
    colorTag: '#64748B',
  },
  {
    id: 'corridor',
    nameJa: '廊下',
    nameEn: 'CORRIDOR',
    min: new THREE.Vector3(-8.8, 0, -2.8),
    max: new THREE.Vector3(8.8, 2.5, -1.0),
    center: new THREE.Vector3(0, 1.25, -1.9),
    colorTag: '#F59E0B',
  },
  {
    id: 'hallway_south',
    nameJa: '中央通路',
    nameEn: 'CENTRAL HALLWAY',
    min: new THREE.Vector3(-1.2, 0, -1.0),
    max: new THREE.Vector3(1.2, 2.5, 2.6),
    center: new THREE.Vector3(0, 1.25, 0.8),
    colorTag: '#F59E0B',
  },
  {
    id: 'room01',
    nameJa: '居室 01',
    nameEn: 'RESIDENT ROOM 01',
    min: new THREE.Vector3(-8.8, 0, -1.0),
    max: new THREE.Vector3(-5.0, 2.5, 2.6),
    center: new THREE.Vector3(-6.9, 1.25, 0.8),
    colorTag: '#06B6D4',
  },
  {
    id: 'room02',
    nameJa: '居室 02',
    nameEn: 'RESIDENT ROOM 02',
    min: new THREE.Vector3(-5.0, 0, -1.0),
    max: new THREE.Vector3(-1.2, 2.5, 2.6),
    center: new THREE.Vector3(-3.1, 1.25, 0.8),
    colorTag: '#06B6D4',
  },
  {
    id: 'room03',
    nameJa: '居室 03',
    nameEn: 'RESIDENT ROOM 03',
    min: new THREE.Vector3(1.2, 0, -1.0),
    max: new THREE.Vector3(5.0, 2.5, 2.6),
    center: new THREE.Vector3(3.1, 1.25, 0.8),
    colorTag: '#06B6D4',
  },
  {
    id: 'toilet',
    nameJa: '多機能トイレ',
    nameEn: 'ACCESSIBLE TOILET',
    min: new THREE.Vector3(5.0, 0, -1.0),
    max: new THREE.Vector3(8.8, 2.5, 2.6),
    center: new THREE.Vector3(6.9, 1.25, 0.8),
    colorTag: '#8B5CF6',
  },
  {
    id: 'bathroom',
    nameJa: '浴室',
    nameEn: 'BATHROOM',
    min: new THREE.Vector3(-8.8, 0, 2.6),
    max: new THREE.Vector3(-2.8, 2.5, 6.8),
    center: new THREE.Vector3(-5.8, 1.25, 4.7),
    colorTag: '#0EA5E9',
  },
  {
    id: 'dining',
    nameJa: '食堂・デイルーム',
    nameEn: 'COMMON DINING & HALL',
    min: new THREE.Vector3(-2.8, 0, 2.6),
    max: new THREE.Vector3(8.8, 2.5, 6.8),
    center: new THREE.Vector3(3.0, 1.25, 4.7),
    colorTag: '#EC4899',
  },
];

export const DOOR_OPENINGS: DoorOpening[] = [
  // Locker room door
  {
    wallId: 'locker_door',
    center: new THREE.Vector3(-6.8, 1.05, -2.8),
    width: 0.95,
    height: 2.1,
    axis: 'x',
    labelJa: '更衣室',
    labelEn: 'LOCKER ROOM',
  },
  // Office door
  {
    wallId: 'office_door',
    center: new THREE.Vector3(-2.6, 1.05, -2.8),
    width: 0.95,
    height: 2.1,
    axis: 'x',
    labelJa: '事務室',
    labelEn: 'OFFICE',
  },
  // Utility room door
  {
    wallId: 'utility_door',
    center: new THREE.Vector3(5.5, 1.05, -2.8),
    width: 0.95,
    height: 2.1,
    axis: 'x',
    labelJa: 'リネン・倉庫',
    labelEn: 'UTILITY',
  },
  // Resident Room 01 door
  {
    wallId: 'room01_door',
    center: new THREE.Vector3(-6.9, 1.05, -1.0),
    width: 0.95,
    height: 2.1,
    axis: 'x',
    labelJa: '居室 01',
    labelEn: 'ROOM 01',
  },
  // Resident Room 02 door
  {
    wallId: 'room02_door',
    center: new THREE.Vector3(-3.1, 1.05, -1.0),
    width: 0.95,
    height: 2.1,
    axis: 'x',
    labelJa: '居室 02',
    labelEn: 'ROOM 02',
  },
  // Resident Room 03 door
  {
    wallId: 'room03_door',
    center: new THREE.Vector3(3.1, 1.05, -1.0),
    width: 0.95,
    height: 2.1,
    axis: 'x',
    labelJa: '居室 03',
    labelEn: 'ROOM 03',
  },
  // Accessible Toilet door
  {
    wallId: 'toilet_door',
    center: new THREE.Vector3(6.9, 1.05, -1.0),
    width: 1.0,
    height: 2.1,
    axis: 'x',
    labelJa: '多機能トイレ',
    labelEn: 'TOILET',
  },
  // Bathroom entrance door
  {
    wallId: 'bathroom_door',
    center: new THREE.Vector3(-2.8, 1.05, 3.8),
    width: 1.0,
    height: 2.1,
    axis: 'z',
    labelJa: '浴室',
    labelEn: 'BATHROOM',
  },
  // Dining room main entrance (wide arch / opening)
  {
    wallId: 'dining_entrance',
    center: new THREE.Vector3(0, 1.1, 2.6),
    width: 2.0,
    height: 2.2,
    axis: 'x',
    labelJa: '食堂・デイルーム',
    labelEn: 'DINING & HALL',
  },
];
