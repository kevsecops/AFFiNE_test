import { Field, ObjectType } from '@nestjs/graphql';
import { SafeIntResolver } from 'graphql-scalars';

import { Paginated } from '../../../base';
import { CopilotWorkspaceFile } from '../../../models';

declare global {
  interface Events {
    'workspace.file.embedding.finished': {
      jobId: string;
    };
    'workspace.file.embedding.failed': {
      jobId: string;
    };
  }
  interface Jobs {
    'copilot.workspace.embedding.files': {
      userId: string;
      workspaceId: string;
      blobId: string;
      fileId: string;
      fileName: string;
    };
  }
}

@ObjectType('CopilotWorkspaceIgnoredDoc')
export class CopilotWorkspaceIgnoredDocType {
  @Field(() => String)
  docId!: string;

  @Field(() => Date)
  createdAt!: Date;
}

@ObjectType()
export class PaginatedIgnoredDocsType extends Paginated(
  CopilotWorkspaceIgnoredDocType
) {}

@ObjectType('CopilotWorkspaceFile')
export class CopilotWorkspaceFileType implements CopilotWorkspaceFile {
  @Field(() => String)
  workspaceId!: string;

  @Field(() => String)
  fileId!: string;

  @Field(() => String)
  fileName!: string;

  @Field(() => String)
  mimeType!: string;

  @Field(() => SafeIntResolver)
  size!: number;

  @Field(() => Date)
  createdAt!: Date;
}

@ObjectType()
export class PaginatedCopilotWorkspaceFileType extends Paginated(
  CopilotWorkspaceFileType
) {}
