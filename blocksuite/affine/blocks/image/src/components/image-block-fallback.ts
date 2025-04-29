import { getLoadingIconWith } from '@blocksuite/affine-components/icons';
import type { ColorScheme, ImageBlockModel } from '@blocksuite/affine-model';
import { unsafeCSSVarV2 } from '@blocksuite/affine-shared/theme';
import { humanFileSize } from '@blocksuite/affine-shared/utils';
import { WithDisposable } from '@blocksuite/global/lit';
import { BrokenImageIcon, ImageIcon } from '@blocksuite/icons/lit';
import { modelContext, ShadowlessElement } from '@blocksuite/std';
import { consume } from '@lit/context';
import { css, html } from 'lit';
import { property } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';

export const SURFACE_IMAGE_CARD_WIDTH = 220;
export const SURFACE_IMAGE_CARD_HEIGHT = 122;
export const NOTE_IMAGE_CARD_WIDTH = 752;
export const NOTE_IMAGE_CARD_HEIGHT = 78;

export class ImageBlockFallbackCard extends WithDisposable(ShadowlessElement) {
  static override styles = css`
    .affine-image-fallback-card-container {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      user-select: none;
    }

    .affine-image-fallback-card {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border-radius: 8px;
      border: 1px solid ${unsafeCSSVarV2('layer/background/tertiary')};
      background: ${unsafeCSSVarV2('layer/background/secondary')};
      padding: 12px;
    }

    .truncate {
      align-self: stretch;
      text-overflow: ellipsis;
      white-space: nowrap;
      overflow: hidden;
    }

    .affine-image-fallback-card-title {
      display: flex;
      flex-direction: row;
      gap: 8px;
      align-items: center;
      align-self: stretch;
    }

    .affine-image-fallback-card-title-icon {
      display: flex;
      width: 16px;
      height: 16px;
      align-items: center;
      justify-content: center;
      color: var(--affine-text-primary-color);
    }

    .affine-image-fallback-card-title-text {
      color: var(--affine-placeholder-color);
      font-family: var(--affine-font-family);
      font-size: var(--affine-font-sm);
      font-style: normal;
      font-weight: 600;
      line-height: 22px;
    }

    .affine-image-fallback-card-description {
      color: var(--affine-text-secondary-color);
      font-family: var(--affine-font-family);
      font-size: var(--affine-font-xs);
      font-style: normal;
      font-weight: 400;
      line-height: 20px;
    }
  `;

  override render() {
    const { theme, mode, loading, error, model } = this;

    const isEdgeless = mode === 'edgeless';
    const width = isEdgeless
      ? `${SURFACE_IMAGE_CARD_WIDTH}px`
      : `${NOTE_IMAGE_CARD_WIDTH}px`;
    const height = isEdgeless
      ? `${SURFACE_IMAGE_CARD_HEIGHT}px`
      : `${NOTE_IMAGE_CARD_HEIGHT}px`;

    const rotate = isEdgeless ? model.rotate : 0;

    const cardStyleMap = styleMap({
      transform: `rotate(${rotate}deg)`,
      transformOrigin: 'center',
      width,
      height,
    });

    const icon = loading
      ? getLoadingIconWith(theme)
      : error
        ? BrokenImageIcon()
        : ImageIcon();

    const title = loading
      ? 'Loading image...'
      : error
        ? 'Image loading failed.'
        : 'Image';

    const description = humanFileSize(model.props.size ?? 0, true, 0);

    return html`
      <div class="affine-image-fallback-card-container">
        <div
          class="affine-image-fallback-card drag-target"
          style=${cardStyleMap}
        >
          <div class="affine-image-fallback-card-title">
            <div class="affine-image-fallback-card-title-icon">${icon}</div>
            <div class="affine-image-fallback-card-title-text truncate">
              ${title}
            </div>
          </div>
          <div class="affine-image-fallback-card-description truncate">
            ${description}
          </div>
        </div>
      </div>
    `;
  }

  @property({ attribute: false })
  accessor error!: boolean;

  @property({ attribute: false })
  accessor loading!: boolean;

  @property({ attribute: false })
  accessor mode!: 'page' | 'edgeless';

  @property({ attribute: false })
  accessor theme!: ColorScheme;

  @consume({ context: modelContext })
  accessor model!: ImageBlockModel;
}

declare global {
  interface HTMLElementTagNameMap {
    'affine-image-fallback-card': ImageBlockFallbackCard;
  }
}
