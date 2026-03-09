// TC-CQS-HIST-01 ~ TC-CQS-HIST-04: CommandQueueService.setCompletionCallback 테스트
// SDD-0004: 커맨드 히스토리 및 재실행

const mockSend = jest.fn();
const mockGetAllWindows = jest.fn(() => [{ webContents: { send: mockSend } }]);
const mockQuery = jest.fn();

let uuidCounter = 0;

function createMockConversation(messages: any[]): AsyncIterable<any> {
  return {
    async *[Symbol.asyncIterator]() {
      for (const msg of messages) {
        yield msg;
      }
    }
  };
}

async function flushPromises(rounds = 5): Promise<void> {
  for (let i = 0; i < rounds; i++) {
    await new Promise(resolve => process.nextTick(resolve));
    await new Promise(resolve => setImmediate(resolve));
  }
}

let CommandQueueService: any;
let service: any;

beforeEach(() => {
  jest.resetModules();
  uuidCounter = 0;
  mockQuery.mockReset();
  mockSend.mockReset();
  mockGetAllWindows.mockReset();
  mockGetAllWindows.mockReturnValue([{ webContents: { send: mockSend } }]);

  jest.doMock('crypto', () => ({
    randomUUID: jest.fn(() => `test-uuid-${++uuidCounter}`)
  }));

  jest.doMock('electron', () => ({
    BrowserWindow: {
      getAllWindows: mockGetAllWindows
    }
  }));

  jest.doMock('@anthropic-ai/claude-agent-sdk', () => ({
    query: mockQuery
  }));

  CommandQueueService = require('../../../src/main/services/commandQueueService');
  service = new CommandQueueService();
  service._setQueryFn(mockQuery);
});

afterEach(() => {
  if (service) service._reset();
  jest.restoreAllMocks();
});

describe('TC-CQS-HIST-01: setCompletionCallback() — 콜백을 등록하면 성공 완료 시 호출된다', () => {
  it('성공 완료된 항목으로 컴플리션 콜백이 호출된다', async () => {
    mockQuery.mockReturnValue(createMockConversation([
      { type: 'result', sessionId: 'sess-1', costUsd: 0.01, numTurns: 3 }
    ]));

    const completionCallback = jest.fn();
    service.setCompletionCallback(completionCallback);

    const item = service.enqueue('/teams', 'arg', '/workspace');
    await flushPromises();

    expect(item.status).toBe('success');
    expect(completionCallback).toHaveBeenCalledTimes(1);
    expect(completionCallback.mock.calls[0][0]).toMatchObject({
      id: item.id,
      command: '/teams',
      args: 'arg',
      cwd: '/workspace',
      status: 'success',
    });
  });
});

describe('TC-CQS-HIST-02: setCompletionCallback() — 실패 완료 시 콜백이 호출된다', () => {
  it('에러로 failed된 항목으로 컴플리션 콜백이 호출된다', async () => {
    mockQuery.mockImplementation(() => {
      throw new Error('NETWORK_ERROR');
    });

    const completionCallback = jest.fn();
    service.setCompletionCallback(completionCallback);

    const item = service.enqueue('/teams', '', '/workspace');
    await flushPromises();

    expect(item.status).toBe('failed');
    expect(completionCallback).toHaveBeenCalledTimes(1);
    expect(completionCallback.mock.calls[0][0].status).toBe('failed');
  });
});

describe('TC-CQS-HIST-03: setCompletionCallback() — 콜백 미등록 시 정상 실행', () => {
  it('setCompletionCallback()을 호출하지 않아도 enqueue/완료 흐름이 정상 작동한다', async () => {
    mockQuery.mockReturnValue(createMockConversation([
      { type: 'result', sessionId: 'sess-2', costUsd: 0.02, numTurns: 2 }
    ]));

    const item = service.enqueue('/add-req', 'test', '/ws');
    await flushPromises();

    expect(item.status).toBe('success');
  });
});

describe('TC-CQS-HIST-04: setCompletionCallback() — 콜백 내 예외가 발생해도 큐 흐름에 영향이 없다', () => {
  it('콜백에서 예외가 발생해도 큐 처리가 계속된다', async () => {
    mockQuery.mockReturnValue(createMockConversation([
      { type: 'result', sessionId: 'sess-3', costUsd: 0.03, numTurns: 4 }
    ]));

    const throwingCallback = jest.fn().mockImplementation(() => {
      throw new Error('callback error');
    });
    service.setCompletionCallback(throwingCallback);

    const item = service.enqueue('/teams', '', '/ws');
    await flushPromises();

    // 콜백은 호출됐어야 함
    expect(throwingCallback).toHaveBeenCalledTimes(1);
    // 항목 상태는 success여야 함 (콜백 예외로 영향받지 않음)
    expect(item.status).toBe('success');
  });
});
