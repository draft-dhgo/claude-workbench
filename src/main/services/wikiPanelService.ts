import { BrowserView, BrowserWindow } from 'electron';

class WikiPanelService {
  private _view: BrowserView | null = null;
  private _visible: boolean = false;
  private _resizeListener: (() => void) | null = null;

  /** 패널 너비 (픽셀). 기본값 400. */
  readonly panelWidth: number = 400;

  /** 패널을 연다. BrowserView가 없으면 생성 후 url을 로드한다. */
  open(win: BrowserWindow, url: string): void {
    if (this._visible) {
      // 이미 열린 상태: bounds만 갱신
      this.updateBounds(win);
      return;
    }

    if (!this._view) {
      this._view = new BrowserView({
        webPreferences: { contextIsolation: true },
      });
      this._view.setAutoResize({ width: false, height: true, horizontal: false, vertical: true });
    }

    win.addBrowserView(this._view);
    this.updateBounds(win);
    this._view.webContents.loadURL(url);
    this._visible = true;

    // resize 리스너 등록 (중복 방지)
    if (!this._resizeListener) {
      this._resizeListener = () => this.updateBounds(win);
      win.on('resize', this._resizeListener);
    }
  }

  /** 패널을 숨기고 BrowserView를 BrowserWindow에서 제거한다. 메모리는 유지. */
  hide(win: BrowserWindow): void {
    if (!this._visible || !this._view) return;
    win.removeBrowserView(this._view);
    this._visible = false;
  }

  /** BrowserView를 완전히 소멸시켜 메모리를 해제한다. */
  destroy(): void {
    if (!this._view) return;
    this._view = null;
    this._visible = false;
    this._resizeListener = null;
  }

  /** 현재 패널 표시 여부를 반환한다. */
  isVisible(): boolean {
    return this._visible;
  }

  /** 메인 창 크기 변경 시 BrowserView bounds를 재계산하여 갱신한다. */
  updateBounds(win: BrowserWindow): void {
    if (!this._view) return;
    const { width, height } = win.getBounds();
    this._view.setBounds({
      x: width - this.panelWidth,
      y: 0,
      width: this.panelWidth,
      height,
    });
  }
}

export = WikiPanelService;
