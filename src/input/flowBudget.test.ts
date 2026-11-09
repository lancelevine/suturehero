import { expect, it } from 'vitest';
import { FlowBudget, MAX_FLOW_INTERVAL_MS } from './flowBudget';

it('keeps the full camera rate when flow requests are cheap', () => {
  const budget = new FlowBudget();
  expect(budget.intervalMs(4)).toBe(4);
  for (let i = 0; i < 20; i++) budget.record(0.3);
  expect(budget.intervalMs(4)).toBe(4);
});

it('backs off so flow uses about 15% of the main thread, but not below ~30 Hz', () => {
  const budget = new FlowBudget();
  for (let i = 0; i < 40; i++) budget.record(2);
  expect(budget.intervalMs(4)).toBeCloseTo(2 / 0.15, 1);
  for (let i = 0; i < 40; i++) budget.record(20);
  expect(budget.intervalMs(4)).toBe(MAX_FLOW_INTERVAL_MS);
});

it('ignores invalid measurements, recovers when costs drop, and resets', () => {
  const budget = new FlowBudget();
  budget.record(Number.NaN);
  budget.record(-1);
  expect(budget.costMs).toBeUndefined();
  for (let i = 0; i < 40; i++) budget.record(5);
  for (let i = 0; i < 60; i++) budget.record(0.2);
  expect(budget.intervalMs(4)).toBe(4);
  budget.reset();
  expect(budget.costMs).toBeUndefined();
});

it('never asks for more frequent flow than the scheduling minimum', () => {
  const budget = new FlowBudget();
  budget.record(1);
  expect(budget.intervalMs(20)).toBe(20);
});
