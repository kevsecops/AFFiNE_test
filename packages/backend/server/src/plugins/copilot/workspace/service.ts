import { createHash } from 'node:crypto';

import { Injectable, OnApplicationBootstrap } from '@nestjs/common';

import { FileUpload, JobQueue, PaginationInput } from '../../../base';
import { Models } from '../../../models';
import { CopilotStorage } from '../storage';
import { readStream } from '../utils';

@Injectable()
export class CopilotWorkspaceService implements OnApplicationBootstrap {
  private supportEmbedding = false;

  constructor(
    private readonly models: Models,
    private readonly queue: JobQueue,
    private readonly storage: CopilotStorage
  ) {}

  async onApplicationBootstrap() {
    const supportEmbedding =
      await this.models.copilotContext.checkEmbeddingAvailable();
    if (supportEmbedding) {
      this.supportEmbedding = true;
    }
  }

  get canEmbedding() {
    return this.supportEmbedding;
  }

  async updateIgnoredDocs(
    workspaceId: string,
    add?: string[],
    remove?: string[]
  ) {
    return await this.models.copilotWorkspace.updateIgnoredDocs(
      workspaceId,
      add,
      remove
    );
  }

  async listIgnoredDocs(
    workspaceId: string,
    pagination?: {
      includeRead?: boolean;
    } & PaginationInput
  ) {
    return await Promise.all([
      this.models.copilotWorkspace.listIgnoredDocs(workspaceId, pagination),
      this.models.copilotWorkspace.countIgnoredDocs(workspaceId),
    ]);
  }

  async addWorkspaceFile(
    userId: string,
    workspaceId: string,
    content: FileUpload
  ) {
    const fileName = content.filename;
    const buffer = await readStream(content.createReadStream());
    const blobId = createHash('sha256').update(buffer).digest('base64url');
    await this.storage.put(userId, workspaceId, blobId, buffer);
    const file = await this.models.copilotWorkspace.addFile(workspaceId, {
      fileName,
      mimeType: content.mimetype,
      size: buffer.length,
    });
    return { blobId, file };
  }

  async getWorkspaceFile(workspaceId: string, fileId: string) {
    return await this.models.copilotWorkspace.getFile(workspaceId, fileId);
  }

  async listWorkspaceFiles(
    workspaceId: string,
    pagination?: {
      includeRead?: boolean;
    } & PaginationInput
  ) {
    return await Promise.all([
      this.models.copilotWorkspace.listWorkspaceFiles(workspaceId, pagination),
      this.models.copilotWorkspace.countIgnoredDocs(workspaceId),
    ]);
  }

  async addWorkspaceFileEmbeddingQueue(
    file: Jobs['copilot.workspace.embedding.files']
  ) {
    if (!this.supportEmbedding) return;

    const { userId, workspaceId, blobId, fileId, fileName } = file;
    await this.queue.add('copilot.workspace.embedding.files', {
      userId,
      workspaceId,
      blobId,
      fileId,
      fileName,
    });
  }

  async removeWorkspaceFile(workspaceId: string, fileId: string) {
    return await this.models.copilotWorkspace.removeWorkspaceFile(
      workspaceId,
      fileId
    );
  }
}
