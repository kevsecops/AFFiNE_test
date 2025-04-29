import type { BlockCaptionEditor } from '@blocksuite/affine-components/caption';
import { Peekable } from '@blocksuite/affine-components/peek';
import type { ImageBlockModel } from '@blocksuite/affine-model';
import { ThemeProvider } from '@blocksuite/affine-shared/services';
import { GfxBlockComponent } from '@blocksuite/std';
import type { BlobState } from '@blocksuite/sync';
import { effect, signal } from '@preact/signals-core';
import { css, html } from 'lit';
import { property, query, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import { when } from 'lit/directives/when.js';

import type { ImageBlockFallbackCard } from './components/image-block-fallback';
import {
  copyImageBlob,
  downloadImageBlob,
  refreshData,
  turnImageIntoCardView,
} from './utils';

@Peekable()
export class ImageEdgelessBlockComponent extends GfxBlockComponent<ImageBlockModel> {
  static override styles = css`
    affine-edgeless-image .resizable-img,
    affine-edgeless-image .resizable-img img {
      width: 100%;
      height: 100%;
    }
  `;

  blobState$ = signal<Partial<BlobState>>({});

  convertToCardView = () => {
    turnImageIntoCardView(this).catch(console.error);
  };

  copy = () => {
    copyImageBlob(this).catch(console.error);
  };

  download = () => {
    downloadImageBlob(this).catch(console.error);
  };

  refreshData = () => {
    refreshData(this.std, this).catch(console.error);
  };

  updateBlobState(state: Partial<BlobState>) {
    this.blobState$.value = { ...this.blobState$.value, ...state };
  }

  private _handleError(error: Error) {
    this.dispatchEvent(new CustomEvent('error', { detail: error }));
  }

  override connectedCallback() {
    super.connectedCallback();

    this.contentEditable = 'false';

    this.refreshData();

    this.disposables.add(
      effect(() => {
        const blobId = this.model.props.sourceId$.value;
        if (!blobId) return;

        const blobState$ = this.std.store.blobSync.blobState$(blobId);
        if (!blobState$) return;

        const subscription = blobState$.subscribe(state => {
          if (state.overSize || state.errorMessage) {
            state.uploading = false;
            state.downloading = false;
          }

          this.updateBlobState(state);
        });

        return () => subscription.unsubscribe();
      })
    );
  }

  override disconnectedCallback() {
    if (this.blobUrl) {
      URL.revokeObjectURL(this.blobUrl);
    }
    super.disconnectedCallback();
  }

  override renderGfxBlock() {
    const rotate = this.model.rotate ?? 0;
    const containerStyleMap = styleMap({
      position: 'relative',
      width: '100%',
      transform: `rotate(${rotate}deg)`,
      transformOrigin: 'center',
    });
    const theme = this.std.get(ThemeProvider).theme$.value;

    return html`
      <div class="affine-image-container" style=${containerStyleMap}>
        ${when(
          this.loading || this.error || !this.blobUrl,
          () =>
            html`<affine-image-fallback-card
              .error=${this.error}
              .loading=${this.loading}
              .mode="${'edgeless'}"
              .theme=${theme}
            ></affine-image-fallback-card>`,
          () => html`
            <div class="resizable-img">
              <img
                class="drag-target"
                src=${this.blobUrl ?? ''}
                draggable="false"
                @error=${this._handleError}
                loading="lazy"
              />
            </div>
          `
        )}
        <affine-block-selection .block=${this}></affine-block-selection>
      </div>
      <block-caption-editor></block-caption-editor>

      ${Object.values(this.widgets)}
    `;
  }

  override updated() {
    this.fallbackCard?.requestUpdate();
  }

  @property({ attribute: false })
  accessor blob: Blob | undefined = undefined;

  @property({ attribute: false })
  accessor blobUrl: string | undefined = undefined;

  @query('block-caption-editor')
  accessor captionEditor!: BlockCaptionEditor | null;

  @property({ attribute: false })
  accessor downloading = false;

  @property({ attribute: false })
  accessor error = false;

  @query('affine-image-fallback-card')
  accessor fallbackCard: ImageBlockFallbackCard | null = null;

  @state()
  accessor lastSourceId!: string;

  @property({ attribute: false })
  accessor loading = false;

  @query('.resizable-img')
  accessor resizableImg!: HTMLDivElement;

  @property({ attribute: false })
  accessor retryCount = 0;
}

declare global {
  interface HTMLElementTagNameMap {
    'affine-edgeless-image': ImageEdgelessBlockComponent;
  }
}
