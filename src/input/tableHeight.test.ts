import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { SKIN_SURFACE_Y, TABLE_POINTS, TableHeight, tableOffsetUnits, tableSpreadMm } from './tableHeight';
import { workspacePracticePosition, type StereoWorkspace } from './stereoWorkspace';

const memory = () => {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), removeItem: (k: string) => void data.delete(k) };
};
const workspace: StereoWorkspace = { origin: new Vector3(0, 0, 500), right: new Vector3(1, 0, 0), up: new Vector3(0, -1, 0), forward: new Vector3(0, 0, 1), unitsPerMm: 0.02 };

describe('table height as the skin surface', () => {
  it('shifts the table height onto the skin surface', () => {
    const table = [new Vector3(-50, 80, 480), new Vector3(40, 81, 520), new Vector3(0, 79, 500)];
    const offset = tableOffsetUnits(table, workspace);
    const onTable = workspacePracticePosition(new Vector3(10, 80, 500), workspace).y + offset;
    expect(onTable).toBeCloseTo(SKIN_SURFACE_Y, 6);
    expect(tableSpreadMm(table, workspace)).toBeCloseTo(2, 6);
    expect(tableOffsetUnits(table.slice(0, 2), workspace)).toBe(0);
  });

  it('works without a workspace (camera axes, 200 mm per unit)', () => {
    const table = [new Vector3(0, 60, 400), new Vector3(10, 60, 410), new Vector3(-10, 60, 390)];
    const onTable = workspacePracticePosition(new Vector3(0, 60, 400), null).y + tableOffsetUnits(table, null);
    expect(onTable).toBeCloseTo(SKIN_SURFACE_Y, 6);
  });

  it('saves after three touches for the current stereo calibration only', () => {
    const table = new TableHeight(memory());
    table.setCalibrationKey('rig-a');
    expect(table.addTouch(new Vector3(0, 1, 2))).toBe(1);
    table.addTouch(new Vector3(0, 1, 2));
    expect(table.addTouch(new Vector3(0, 1, 2))).toBe(TABLE_POINTS);
    expect(table.points()).toHaveLength(3);
    table.setCalibrationKey('rig-b');
    expect(table.points()).toHaveLength(0);
    table.setCalibrationKey('rig-a');
    table.clear();
    expect(table.points()).toHaveLength(0);
  });
});
