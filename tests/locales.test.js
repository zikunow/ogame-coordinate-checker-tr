import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as tr from '../site/core.js';
import * as ru from '../site/core.ru.js';

test('Russian and Turkish UI use identical status groups and availability priorities', () => {
  for (const status of ['', 'v', 'i', 'I', 'vi', 'vI', 'b', 'o', 'a', 'vIb', 'z']) {
    assert.equal(ru.classifyPlayer({ status }).group, tr.classifyPlayer({ status }).group);
  }
  for (const cells of [[], [{ kind: 'free' }], [{ kind: 'unavailable' }],
    [{ kind: 'occupied', group: 'inactive' }], [{ kind: 'occupied', group: 'vacation' }],
    [{ kind: 'occupied', group: 'active' }, { kind: 'occupied', group: 'vacation' }]]) {
    assert.deepEqual(ru.summarize(cells), tr.summarize(cells));
    assert.equal(ru.aggregateStatus(ru.summarize(cells)).key, tr.aggregateStatus(tr.summarize(cells)).key);
  }
  assert.equal(ru.aggregateStatus(ru.summarize([{ kind: 'free' }])).label, 'Свободен');
  assert.equal(ru.classifyPlayer({ status: 'vI' }).label, 'РО · Неактивен ≥28 дней');
});
