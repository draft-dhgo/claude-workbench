import { safeStorage } from 'electron';
import fs = require('fs');
import path = require('path');

/**
 * GitHub PAT 암호화 저장소
 * Electron safeStorage API를 사용하여 OS 키체인 기반 암호화
 * 파일: {userData}/github-token.enc
 */
class GitHubTokenStore {
  private _filePath: string;

  constructor(userDataPath: string) {
    this._filePath = path.join(userDataPath, 'github-token.enc');
  }

  /**
   * PAT을 암호화하여 저장
   * @throws safeStorage를 사용할 수 없는 경우
   */
  setToken(token: string): void {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Encryption is not available. Please ensure a system keyring is installed.');
    }
    const encrypted = safeStorage.encryptString(token);
    const dir = path.dirname(this._filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this._filePath, encrypted);
  }

  /**
   * 저장된 PAT을 복호화하여 반환
   * @returns 토큰 문자열 또는 null (저장된 토큰이 없는 경우)
   */
  getToken(): string | null {
    if (!this.hasToken()) return null;
    if (!safeStorage.isEncryptionAvailable()) return null;
    try {
      const encrypted = fs.readFileSync(this._filePath);
      return safeStorage.decryptString(encrypted);
    } catch {
      return null;
    }
  }

  /** 저장된 토큰 삭제 */
  removeToken(): void {
    try {
      if (fs.existsSync(this._filePath)) {
        fs.unlinkSync(this._filePath);
      }
    } catch {
      // ignore
    }
  }

  /** 토큰 파일 존재 여부 */
  hasToken(): boolean {
    return fs.existsSync(this._filePath);
  }
}

export = GitHubTokenStore;
