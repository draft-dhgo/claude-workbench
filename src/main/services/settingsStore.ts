import fs = require('fs');
import path = require('path');
import os = require('os');
import { AppSettings, DEFAULT_APP_SETTINGS } from '../../shared/types/settings';

/**
 * 앱 전역 설정 영속 스토어
 * 파일: {userData}/settings.json
 */
class SettingsStore {
  private _filePath: string;

  constructor(userDataPath: string) {
    this._filePath = path.join(userDataPath, 'settings.json');
  }

  get(): AppSettings {
    try {
      const raw = fs.readFileSync(this._filePath, 'utf-8');
      const data = JSON.parse(raw);
      // 기본값과 병합 (새 필드 추가 시 대응)
      return { ...DEFAULT_APP_SETTINGS, ...data };
    } catch {
      return { ...DEFAULT_APP_SETTINGS, defaultProjectPath: this._defaultProjectPath() };
    }
  }

  update(updates: Partial<AppSettings>): AppSettings {
    const current = this.get();
    const merged = { ...current, ...updates };
    this._save(merged);
    return merged;
  }

  getDefaultProjectPath(): string {
    const settings = this.get();
    return settings.defaultProjectPath || this._defaultProjectPath();
  }

  private _save(data: AppSettings): void {
    const dir = path.dirname(this._filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this._filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  private _defaultProjectPath(): string {
    return path.join(os.homedir(), 'claude-workbench-projects');
  }
}

export = SettingsStore;
