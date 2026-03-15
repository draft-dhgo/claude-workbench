// SettingsStore unit tests

import os = require('os');
import fs = require('fs');
import path = require('path');
import SettingsStore = require('../../../src/main/services/settingsStore');

let tmpDir: string;
let store: InstanceType<typeof SettingsStore>;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cwb-test-settings-'));
  store = new SettingsStore(tmpDir);
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('SettingsStore.get', () => {
  it('returns defaults merged with _defaultProjectPath when no file exists', () => {
    const settings = store.get();
    expect(settings.version).toBe(1);
    expect(settings.dockerSocketPath).toBe('/var/run/docker.sock');
    expect(settings.maxGlobalContainers).toBe(10);
    expect(settings.theme).toBe('system');
    expect(settings.lang).toBe('ko');
    // defaultProjectPath should be the computed default
    expect(settings.defaultProjectPath).toBe(path.join(os.homedir(), 'claude-workbench-projects'));
  });

  it('returns stored values when settings file exists', () => {
    const data = {
      version: 1,
      defaultProjectPath: '/custom/path',
      dockerSocketPath: '/custom/docker.sock',
      maxGlobalContainers: 5,
      theme: 'dark' as const,
      lang: 'en' as const,
    };
    fs.writeFileSync(path.join(tmpDir, 'settings.json'), JSON.stringify(data), 'utf-8');
    const settings = store.get();
    expect(settings.defaultProjectPath).toBe('/custom/path');
    expect(settings.dockerSocketPath).toBe('/custom/docker.sock');
    expect(settings.maxGlobalContainers).toBe(5);
    expect(settings.theme).toBe('dark');
    expect(settings.lang).toBe('en');
  });

  it('merges defaults for missing fields in stored file', () => {
    // Stored file has only partial fields
    fs.writeFileSync(
      path.join(tmpDir, 'settings.json'),
      JSON.stringify({ version: 1, theme: 'light' }),
      'utf-8'
    );
    const settings = store.get();
    expect(settings.theme).toBe('light');
    // Other fields should come from DEFAULT_APP_SETTINGS
    expect(settings.maxGlobalContainers).toBe(10);
    expect(settings.lang).toBe('ko');
  });

  it('returns defaults when file contains invalid JSON', () => {
    fs.writeFileSync(path.join(tmpDir, 'settings.json'), 'not json!!!', 'utf-8');
    const settings = store.get();
    expect(settings.version).toBe(1);
    expect(settings.defaultProjectPath).toBe(path.join(os.homedir(), 'claude-workbench-projects'));
  });
});

describe('SettingsStore.update', () => {
  it('persists partial updates and returns merged settings', () => {
    const result = store.update({ theme: 'dark' });
    expect(result.theme).toBe('dark');
    // Verify persistence
    const reloaded = store.get();
    expect(reloaded.theme).toBe('dark');
  });

  it('preserves existing values when updating other fields', () => {
    store.update({ theme: 'light', lang: 'en' });
    const result = store.update({ maxGlobalContainers: 20 });
    expect(result.theme).toBe('light');
    expect(result.lang).toBe('en');
    expect(result.maxGlobalContainers).toBe(20);
  });

  it('creates directory if it does not exist', () => {
    const nestedDir = path.join(tmpDir, 'nested', 'dir');
    const nestedStore = new SettingsStore(nestedDir);
    nestedStore.update({ theme: 'dark' });
    expect(fs.existsSync(path.join(nestedDir, 'settings.json'))).toBe(true);
  });

  it('writes valid JSON to disk', () => {
    store.update({ defaultProjectPath: '/my/projects' });
    const raw = fs.readFileSync(path.join(tmpDir, 'settings.json'), 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed.defaultProjectPath).toBe('/my/projects');
  });
});

describe('SettingsStore.getDefaultProjectPath', () => {
  it('returns stored defaultProjectPath when set', () => {
    store.update({ defaultProjectPath: '/stored/path' });
    expect(store.getDefaultProjectPath()).toBe('/stored/path');
  });

  it('returns computed default when defaultProjectPath is empty string', () => {
    store.update({ defaultProjectPath: '' });
    expect(store.getDefaultProjectPath()).toBe(path.join(os.homedir(), 'claude-workbench-projects'));
  });

  it('returns computed default when no settings file exists', () => {
    expect(store.getDefaultProjectPath()).toBe(path.join(os.homedir(), 'claude-workbench-projects'));
  });
});

describe('SettingsStore multiple updates', () => {
  it('handles sequential updates correctly', () => {
    store.update({ theme: 'light' });
    store.update({ lang: 'en' });
    store.update({ maxGlobalContainers: 15 });
    const final = store.get();
    expect(final.theme).toBe('light');
    expect(final.lang).toBe('en');
    expect(final.maxGlobalContainers).toBe(15);
  });
});
