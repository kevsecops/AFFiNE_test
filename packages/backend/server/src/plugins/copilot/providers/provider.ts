import { Inject, Injectable, Logger } from '@nestjs/common';

import { Config, CopilotPromptInvalid, OnEvent } from '../../../base';
import { CopilotProviderFactory } from './factory';
import {
  ChatMessageRole,
  type CopilotChatOptions,
  type CopilotEmbeddingOptions,
  type CopilotImageOptions,
  CopilotProviderModel,
  CopilotProviderType,
  ModelCapability,
  ModelConditions,
  ModelInputType,
  ModelOutputType,
  type PromptMessage,
} from './types';

@Injectable()
export abstract class CopilotProvider<C = any> {
  protected readonly logger = new Logger(this.constructor.name);
  abstract readonly type: CopilotProviderType;
  abstract readonly models: CopilotProviderModel[];
  abstract configured(): boolean;

  @Inject() protected readonly AFFiNEConfig!: Config;
  @Inject() protected readonly factory!: CopilotProviderFactory;

  get config(): C {
    return this.AFFiNEConfig.copilot.providers[this.type] as C;
  }

  isModelAvailable(
    conditions: ModelConditions = {}
  ): Promise<boolean> | boolean {
    const { modelId, outputType, inputType } = conditions;
    if (!this.configured()) {
      return false;
    }

    if (modelId) {
      const foundModel = this.models.find(m => m.id === modelId);
      if (!foundModel) {
        return false;
      }

      return foundModel.capabilities.some(
        cap =>
          (!outputType || cap.output.includes(outputType)) &&
          (!inputType || cap.input.includes(inputType))
      );
    }

    if (outputType) {
      return this.models.some(model =>
        model.capabilities.some(
          cap =>
            cap.output.includes(outputType) &&
            (!inputType || cap.input.includes(inputType))
        )
      );
    }

    return false;
  }

  @OnEvent('config.init')
  async onConfigInit() {
    this.setup();
  }

  @OnEvent('config.changed')
  async onConfigChanged(event: Events['config.changed']) {
    if ('copilot' in event.updates) {
      this.setup();
    }
  }

  protected setup() {
    if (this.configured()) {
      this.factory.register(this);
    } else {
      this.factory.unregister(this);
    }
  }

  getModelsByOutputType(outputType: ModelOutputType): CopilotProviderModel[] {
    return this.models.filter(model =>
      model.capabilities.some(cap => cap.output.includes(outputType))
    );
  }

  getDefaultModelForOutputType(
    outputType: ModelOutputType,
    inputType?: ModelInputType
  ): CopilotProviderModel | undefined {
    // find the default model that matches both capability and input type
    if (inputType) {
      const modelWithInputType = this.models.find(model =>
        model.capabilities.some(
          cap =>
            cap.output.includes(outputType) &&
            cap.defaultForOutputType === true &&
            cap.input.includes(inputType)
        )
      );

      if (modelWithInputType) {
        return modelWithInputType;
      }
    }

    // if no input type is specified, find the default model for the capability
    const defaultModel = this.models.find(model =>
      model.capabilities.some(
        cap =>
          cap.output.includes(outputType) && cap.defaultForOutputType === true
      )
    );

    if (defaultModel) {
      return defaultModel;
    }

    // if no default model is found, return the first model that supports the capability
    // this is a fallback and may not be the intended behavior
    const firstSupportingModel = this.getModelsByOutputType(outputType)[0];
    return firstSupportingModel;
  }

  protected validateModelOutputType(
    model: CopilotProviderModel,
    outputType?: ModelOutputType,
    inputType?: ModelInputType
  ): ModelCapability | undefined {
    if (!outputType && !inputType) {
      return model.capabilities[0];
    }

    const matchingCapability = model.capabilities.find(
      cap =>
        (!outputType || cap.output.includes(outputType)) &&
        (!inputType || cap.input.includes(inputType))
    );

    if (!matchingCapability) {
      throw new CopilotPromptInvalid(
        `Model ${model.id} does not support ${outputType} capability with ${inputType} input type`
      );
    }

    return matchingCapability;
  }

  protected selectModel(cond: ModelConditions): CopilotProviderModel {
    if (cond.modelId) {
      const model = this.models.find(m => m.id === cond.modelId);
      if (!model) {
        throw new CopilotPromptInvalid(
          `Model ${cond.modelId} not found for provider ${this.type}`
        );
      }

      this.validateModelOutputType(model, cond.outputType, cond.inputType);
      return model;
    }

    if (!cond.outputType) {
      throw new CopilotPromptInvalid(
        `Capability is required when modelId is not provided`
      );
    }

    const defaultModel = this.getDefaultModelForOutputType(
      cond.outputType,
      cond.inputType
    );
    if (!defaultModel) {
      throw new CopilotPromptInvalid(
        `No model found supporting ${cond.outputType} capability with ${cond.inputType} input type for provider ${this.type}`
      );
    }

    return defaultModel;
  }

  protected async checkParams({
    cond,
    messages,
    embeddings,
    options = {},
  }: {
    cond: ModelConditions;
    messages?: PromptMessage[];
    embeddings?: string[];
    options?: CopilotChatOptions;
  }) {
    if (!(await this.isModelAvailable(cond))) {
      throw new CopilotPromptInvalid(
        `Model not available: ${JSON.stringify(cond)}`
      );
    }

    const model = this.selectModel(cond);
    const multimodal = model.capabilities.some(
      c =>
        c.input.includes(ModelInputType.Image) ||
        c.input.includes(ModelInputType.Audio)
    );
    const requireContent = options?.requireContent ?? true;
    const requireAttachment = options?.requireAttachment ?? false;

    if (Array.isArray(messages) && messages.length > 0) {
      if (
        messages.some(
          m =>
            // check non-object
            typeof m !== 'object' ||
            !m ||
            // check content
            (requireContent &&
              (typeof m.content !== 'string' ||
                !m.content ||
                !m.content.trim())) ||
            // check attachment
            (multimodal &&
              m.attachments &&
              (!Array.isArray(m.attachments) ||
                (!!requireAttachment &&
                  m.role === 'user' &&
                  !m.attachments.length)))
        )
      ) {
        throw new CopilotPromptInvalid('Empty message content');
      }
      if (
        messages.some(
          m =>
            typeof m.role !== 'string' ||
            !m.role ||
            !ChatMessageRole.includes(m.role)
        )
      ) {
        throw new CopilotPromptInvalid('Invalid message role');
      }

      // json mode need 'json' keyword in content
      // ref: https://platform.openai.com/docs/api-reference/chat/create#chat-create-response_format
      if (
        'jsonMode' in options &&
        options.jsonMode &&
        !messages.some(m => m.content.toLowerCase().includes('json'))
      ) {
        throw new CopilotPromptInvalid('Prompt not support json mode');
      }
    }
    if (
      Array.isArray(embeddings) &&
      embeddings.some(e => typeof e !== 'string' || !e || !e.trim())
    ) {
      throw new CopilotPromptInvalid('Invalid embedding');
    }
  }

  abstract text(
    model: ModelConditions,
    messages: PromptMessage[],
    options?: CopilotChatOptions | CopilotEmbeddingOptions | CopilotImageOptions
  ): Promise<string>;

  abstract streamText(
    model: ModelConditions,
    messages: PromptMessage[],
    options?: CopilotChatOptions | CopilotImageOptions
  ): AsyncIterable<string>;
}
