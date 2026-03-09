import fs = require('fs');
import path = require('path');
import { CommandHistoryEntry } from '../../shared/types/models';

const DEFAULT_MAX_ENTRIES = 200;
const HISTORY_FILE_NAME = 'queue-history.json';

class CommandHistoryStore {
  private _persistPath: string;
  private _maxEntries: number;
  private _entries: CommandHistoryEntry[];

  constructor(userDataPath: string, maxEntries: number = DEFAULT_MAX_ENTRIES) {
    this._persistPath = path.join(userDataPath, HISTORY_FILE_NAME);
    this._maxEntries = maxEntries;
    this._entries = [];
    this._loadFromDisk();
  }

  /** 항목 추가. maxEntries 초과 시 가장 오래된 항목 제거 후 추가. */
  add(entry: CommandHistoryEntry): void {
    this._entries.unshift(entry);
    if (this._entries.length > this._maxEntries) {
      this._entries.splice(this._maxEntries);
    }
    this._saveToDisk();
  }

  /** 전체 히스토리 반환 (최신순 정렬) */
  list(): CommandHistoryEntry[] {
    return [...this._entries];
  }

  /** 특정 항목 삭제. 존재하지 않으면 false 반환. */
  delete(id: string): boolean {
    const idx = this._entries.findIndex(e => e.id === id);
    if (idx === -1) return false;
    this._entries.splice(idx, 1);
    this._saveToDisk();
    return true;
  }

  /** 전체 삭제 */
  clear(): void {
    this._entries = [];
    this._saveToDisk();
  }

  private _loadFromDisk(): void {
    try {
      const raw = fs.readFileSync(this._persistPath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        this._entries = parsed;
      }
    } catch {
      // 파일 없거나 파싱 실패 시 빈 배열로 시작
      this._entries = [];
    }
  }

  private _saveToDisk(): void {
    try {
      fs.writeFileSync(this._persistPath, JSON.stringify(this._entries, null, 2), 'utf-8');
    } catch {
      // 저장 실패는 무시 (메모리 상태는 유지)
    }
  }
}

export = CommandHistoryStore;
