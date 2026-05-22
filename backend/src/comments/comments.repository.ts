import { PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { Inject, Injectable } from '@nestjs/common';
import { DYNAMODB_DOCUMENT_CLIENT } from '../aws/aws.constants';
import { AppConfigService } from '../config/app-config.service';
import { Comment } from './comment.entity';

type DynamoDbDocumentClient = {
  send(command: PutCommand | ScanCommand): Promise<unknown>;
};

@Injectable()
export class CommentsRepository {
  private readonly tableName: string;

  constructor(
    @Inject(DYNAMODB_DOCUMENT_CLIENT)
    private readonly documentClient: DynamoDbDocumentClient,
    config: AppConfigService,
  ) {
    this.tableName = config.get('COMMENTS_TABLE');
  }

  async create(comment: Comment): Promise<Comment> {
    await this.documentClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: comment,
      }),
    );

    return comment;
  }

  async findByTaskId(taskId: string): Promise<Comment[]> {
    const result = (await this.documentClient.send(
      new ScanCommand({
        TableName: this.tableName,
        FilterExpression: 'taskId = :taskId',
        ExpressionAttributeValues: {
          ':taskId': taskId,
        },
      }),
    )) as { Items?: Comment[] };

    return (result.Items ?? []).sort((left, right) =>
      left.createdAt.localeCompare(right.createdAt),
    );
  }
}
