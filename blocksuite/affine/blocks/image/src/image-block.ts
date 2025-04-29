import { CaptionedBlockComponent } from '@blocksuite/affine-components/caption';
import { whenHover } from '@blocksuite/affine-components/hover';
import { Peekable } from '@blocksuite/affine-components/peek';
import type { ImageBlockModel } from '@blocksuite/affine-model';
import {
  ThemeProvider,
  ToolbarRegistryIdentifier,
} from '@blocksuite/affine-shared/services';
import { IS_MOBILE } from '@blocksuite/global/env';
import { BlockSelection } from '@blocksuite/std';
import type { BlobState } from '@blocksuite/sync';
import { effect, signal } from '@preact/signals-core';
import { html } from 'lit';
import { property, query, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import { when } from 'lit/directives/when.js';

import type { ImageBlockFallbackCard } from './components/image-block-fallback';
import type { ImageBlockPageComponent } from './components/page-image-block';
import {
  copyImageBlob,
  downloadImageBlob,
  refreshData,
  turnImageIntoCardView,
} from './utils';

@Peekable({
  enableOn: () => !IS_MOBILE,
})
export class ImageBlockComponent extends CaptionedBlockComponent<ImageBlockModel> {
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

  get resizableImg() {
    return this.pageImage?.resizeImg;
  }

  private _handleClick(event: MouseEvent) {
    // the peek view need handle shift + click
    if (event.defaultPrevented) return;

    event.stopPropagation();
    const selectionManager = this.host.selection;
    const blockSelection = selectionManager.create(BlockSelection, {
      blockId: this.blockId,
    });
    selectionManager.setGroup('note', [blockSelection]);
  }

  private _initHover() {
    const { setReference, setFloating, dispose } = whenHover(
      hovered => {
        const message$ = this.std.get(ToolbarRegistryIdentifier).message$;
        if (hovered) {
          message$.value = {
            flavour: this.model.flavour,
            element: this,
            setFloating,
          };
          return;
        }

        // Clears previous bindings
        message$.value = null;
        setFloating();
      },
      { enterDelay: 500 }
    );
    setReference(this.hoverableContainer);
    this._disposables.add(dispose);
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

  override firstUpdated() {
    // lazy bindings
    this.disposables.addFromEvent(this, 'click', this._handleClick);
    this._initHover();
  }

  override renderBlock() {
    const containerStyleMap = styleMap({
      position: 'relative',
      width: '100%',
    });
    const theme = this.std.get(ThemeProvider).theme$.value;

    return html`
      <div class="affine-image-container" style=${containerStyleMap}>
        ${when(
          this.loading || this.error,
          () =>
            html`<affine-image-fallback-card
              .error=${this.error}
              .loading=${this.loading}
              .mode="${'page'}"
              .theme=${theme}
            ></affine-image-fallback-card>`,
          () => html`<affine-page-image .block=${this}></affine-page-image>`
        )}
      </div>

      ${Object.values(this.widgets)}
    `;
  }

  // override updated() {
  //   this.fallbackCard?.requestUpdate();
  // }

  @property({ attribute: false })
  accessor blobUrl: string | null = null;

  override accessor blockContainerStyles = { margin: '18px 0' };

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

  @query('affine-page-image')
  private accessor pageImage: ImageBlockPageComponent | null = null;

  @query('.affine-image-container')
  accessor hoverableContainer!: HTMLDivElement;

  @property({ attribute: false })
  accessor retryCount = 0;

  override accessor useCaptionEditor = true;

  override accessor useZeroWidth = true;
}

declare global {
  interface HTMLElementTagNameMap {
    'affine-image': ImageBlockComponent;
  }
}
