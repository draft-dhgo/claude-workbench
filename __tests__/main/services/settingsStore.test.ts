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
  it('returns defaults with dataRootPath when no file exists', () => {
    const settings = store.get();
    expect(settings.version).toBe(1);
    expect(settings.dockerSocketPath).toBe('/var/run/docker.sock');
    expect(settings.maxGlobalContainers).toBe(10);
    expect(settings.theme).toBe('system');
    expect(settings.lang).toBe('ko');
    expect(settings.dataRootPath).toBe(path.join(os.homedir(), 'claude-workbench-data'));
  });

  it('returns stored values when settings file exists', () => {
    const data = {
      version: 1,
      dataRootPath: '/custom/path',
      dockerSocketPath: '/custom/docker.sock',
      maxGlobalContainers: 5,
      theme: 'dark' as const,
      lang: 'en' as const,
    };
    fs.writeFileSync(path.join(tmpDir, 'settings.json'), JSON.stringify(data), 'utf-8');
    const settings = store.get();
    expect(settings.dataRootPath).toBe('/custom/path');
    expect(settings.dockerSocketPath).toBe('/custom/docker.sock');
    expect(settings.maxGlobalContainers).toBe(5);
  });

  it('merges defaults for missing fields in stored file', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'settings.json'),
      JSON.stringify({ version: 1, theme: 'light' }),
      'utf-8'
    );
    const settings = store.get();
    expect(settings.theme).toBe('light');
    expect(settings.maxGlobalContainers).toBe(10);
  });

  it('returns defaults when file contains invalid JSON', () => {
    fs.writeFileSync(path.join(tmpDir, 'settings.json'), 'not json!!!', 'utf-8');
    const settings = store.get();
    expect(settings.version).toBe(1);
    expect(settings.dataRootPath).toBe(path.join(os.homedir(), 'claude-workbench-data'));
  });
});

describe('SettingsStore.update', () => {
  it('persists partial updates and returns merged settings', () => {
    const result = store.update({ theme: 'dark' });
    expect(result.theme).toBe('dark');
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
    store.update({ dataRootPath: '/my/data' });
    const raw = fs.readFileSync(path.join(tmpDir, 'settings.json'), 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed.dataRootPath).toBe('/my/data');
  });
});

describe('SettingsStore.getDataRootPath', () => {
  it('returns stored dataRootPath when set', () => {
    store.update({ dataRootPath: '/stored/path' });
    expect(store.getDataRootPath()).toBe('/stored/path');
  });

  it('returns computed default when dataRootPath is empty string', () => {
    store.update({ dataRootPath: '' });
    expect(store.getDataRootPath()).toBe(path.join(os.homedir(), 'claude-workbench-data'));
  });

  it('returns computed default when no settings file exists', () => {
    expect(store.getDataRootPath()).toBe(path.join(os.homedir(), 'claude-workbench-data'));
  });
});

describe('SettingsStore.getProjectsPath', () => {
  it('returns projects subdirectory of data root', () => {
    store.update({ dataRootPath: '/my/data' });
    expect(store.getProjectsPath()).toBe('/my/data/projects');
  });
});

describe('SettingsStore.getContainersPath', () => {
  it('returns containers subdirectory of data root', () => {
    store.update({ dataRootPath: '/my/data' });
    expect(store.getContainersPath()).toBe('/my/data/containers');
  });
});
