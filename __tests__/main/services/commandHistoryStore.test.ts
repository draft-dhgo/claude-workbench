// TC-CHS-01 ~ TC-CHS-10: CommandHistoryStore 단위 테스트
// SDD-0004: 커맨드 히스토리 및 재실행

import path = require('path');
import os = require('os');
import fs = require('fs');

let CommandHistoryStore: any;
let tmpDir: string;

function makeTmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chs-test-'));
  return dir;
}

function makeEntry(overrides: Record<string, any> = {}): any {
  return {
    id: 'uuid-' + Math.random().toString(36).slice(2),
    command: '/teams',
    args: 'Input: wiki/prd/0001.md',
    cwd: '/workspace',
    status: 'success',
    executedAt: new Date().toISOString(),
    costUsd: 0.01,
    durationMs: 1000,
    numTurns: 5,
    ...overrides,
  };
}

beforeEach(() => {
  jest.resetModules();
  tmpDir = makeTmpDir();
  CommandHistoryStore = require('../../../src/main/services/commandHistoryStore');
});

afterEach(() => {
  // clean up temp directory
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

describe('TC-CHS-01: add() — 항목을 추가하면 list()에 최신순으로 반환된다', () => {
  it('add() 후 list()가 추가된 항목을 포함한다', () => {
    const store = new CommandHistoryStore(tmpDir);
    const entry = makeEntry({ id: 'entry-1' });
    store.add(entry);

    const entries = store.list();
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe('entry-1');
  });

  it('두 항목을 add하면 나중에 추가된 항목이 배열 앞에 위치한다(최신순)', () => {
    const store = new CommandHistoryStore(tmpDir);
    store.add(makeEntry({ id: 'old-1' }));
    store.add(makeEntry({ id: 'new-2' }));

    const entries = store.list();
    expect(entries).toHaveLength(2);
    expect(entries[0].id).toBe('new-2');
    expect(entries[1].id).toBe('old-1');
  });
});

describe('TC-CHS-02: list() — 빈 스토어는 빈 배열을 반환한다', () => {
  it('아무것도 추가하지 않으면 list()는 []를 반환한다', () => {
    const store = new CommandHistoryStore(tmpDir);
    expect(store.list()).toEqual([]);
  });
});

describe('TC-CHS-03: delete() — 존재하는 id 삭제 시 true 반환 및 목록에서 제거된다', () => {
  it('add 후 delete(id)를 호출하면 true를 반환하고 list에서 제거된다', () => {
    const store = new CommandHistoryStore(tmpDir);
    const entry = makeEntry({ id: 'del-1' });
    store.add(entry);

    const result = store.delete('del-1');
    expect(result).toBe(true);
    expect(store.list()).toHaveLength(0);
  });
});

describe('TC-CHS-04: delete() — 존재하지 않는 id 삭제 시 false 반환', () => {
  it('존재하지 않는 id로 delete()를 호출하면 false를 반환한다', () => {
    const store = new CommandHistoryStore(tmpDir);
    const result = store.delete('non-existent');
    expect(result).toBe(false);
  });
});

describe('TC-CHS-05: clear() — 전체 삭제 후 list()는 빈 배열을 반환한다', () => {
  it('clear() 호출 후 list()가 빈 배열을 반환한다', () => {
    const store = new CommandHistoryStore(tmpDir);
    store.add(makeEntry({ id: 'a-1' }));
    store.add(makeEntry({ id: 'a-2' }));
    store.clear();
    expect(store.list()).toEqual([]);
  });
});

describe('TC-CHS-06: maxEntries — 초과 시 오래된 항목이 자동 제거된다', () => {
  it('maxEntries=3인 스토어에 4번째 항목 추가 시 가장 오래된 항목이 제거된다', () => {
    const store = new CommandHistoryStore(tmpDir, 3);
    store.add(makeEntry({ id: 'old-1' }));
    store.add(makeEntry({ id: 'old-2' }));
    store.add(makeEntry({ id: 'old-3' }));
    store.add(makeEntry({ id: 'new-4' }));

    const entries = store.list();
    expect(entries).toHaveLength(3);
    // 가장 오래된 항목(old-1)이 제거되어야 함
    expect(entries.map((e: any) => e.id)).not.toContain('old-1');
    expect(entries[0].id).toBe('new-4');
  });
});

describe('TC-CHS-07: 파일 영속화 — add 후 새 인스턴스에서도 데이터가 유지된다', () => {
  it('add 후 동일 경로로 새 CommandHistoryStore 생성 시 데이터가 로드된다', () => {
    const store1 = new CommandHistoryStore(tmpDir);
    store1.add(makeEntry({ id: 'persist-1', command: '/teams' }));

    // 새 인스턴스
    const store2 = new CommandHistoryStore(tmpDir);
    const entries = store2.list();
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe('persist-1');
  });
});

describe('TC-CHS-08: _loadFromDisk — queue-history.json 없거나 파싱 실패 시 빈 배열로 시작', () => {
  it('파일이 없는 경우 list()는 빈 배열을 반환한다', () => {
    const store = new CommandHistoryStore(tmpDir);
    expect(store.list()).toEqual([]);
  });

  it('잘못된 JSON이 있는 경우 빈 배열로 fallback된다', () => {
    const historyPath = path.join(tmpDir, 'queue-history.json');
    fs.writeFileSync(historyPath, 'not valid json', 'utf-8');

    const store = new CommandHistoryStore(tmpDir);
    expect(store.list()).toEqual([]);
  });
});

describe('TC-CHS-09: list() — 반환된 배열을 수정해도 내부 상태에 영향을 주지 않는다', () => {
  it('list()의 반환값을 수정해도 내부 _entries가 영향받지 않는다', () => {
    const store = new CommandHistoryStore(tmpDir);
    store.add(makeEntry({ id: 'safe-1' }));

    const list1 = store.list();
    list1.push(makeEntry({ id: 'injected' }));

    const list2 = store.list();
    expect(list2).toHaveLength(1);
    expect(list2[0].id).toBe('safe-1');
  });
});

describe('TC-CHS-10: add() — failed/aborted 상태 항목도 저장된다', () => {
  it('status가 failed인 항목도 add/list 가능하다', () => {
    const store = new CommandHistoryStore(tmpDir);
    store.add(makeEntry({ id: 'fail-1', status: 'failed', errorMessage: 'error detail' }));

    const entries = store.list();
    expect(entries).toHaveLength(1);
    expect(entries[0].status).toBe('failed');
  });

  it('status가 aborted인 항목도 add/list 가능하다', () => {
    const store = new CommandHistoryStore(tmpDir);
    store.add(makeEntry({ id: 'abort-1', status: 'aborted' }));

    const entries = store.list();
    expect(entries).toHaveLength(1);
    expect(entries[0].status).toBe('aborted');
  });
});
