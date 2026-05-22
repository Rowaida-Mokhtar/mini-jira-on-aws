import { PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { Inject, Injectable } from '@nestjs/common';
import { DYNAMODB_DOCUMENT_CLIENT } from '../aws/aws.constants';
import { AppConfigService } from '../config/app-config.service';
import { ActivityLog } from './activity-log.entity';

type DynamoDbDocumentClient = {
  send(command: PutCommand | ScanCommand): Promise<unknown>;
};

@Injectable()
export class ActivityLogRepository {
  private readonly tableName: string;

  constructor(
    @Inject(DYNAMODB_DOCUMENT_CLIENT)
    private readonly documentClient: DynamoDbDocumentClient,
    config: AppConfigService,
  ) {
    this.tableName = config.get('ACTIVITY_LOG_TABLE');
  }

  async create(activityLog: ActivityLog): Promise<ActivityLog> {
    await this.documentClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: activityLog,
      }),
    );

    return activityLog;
  }

  async findAll(): Promise<ActivityLog[]> {
    const result = (await this.documentClient.send(
      new ScanCommand({
        TableName: this.tableName,
      }),
    )) as { Items?: ActivityLog[] };

    return this.sortNewestFirst(result.Items ?? []);
  }

  async findByTeamId(teamId: string): Promise<ActivityLog[]> {
    const result = (await this.documentClient.send(
      new ScanCommand({
        TableName: this.tableName,
        FilterExpression: 'teamId = :teamId',
        ExpressionAttributeValues: {
          ':teamId': teamId,
        },
      }),
    )) as { Items?: ActivityLog[] };

    return this.sortNewestFirst(result.Items ?? []);
  }

  private sortNewestFirst(items: ActivityLog[]) {
    return items.sort((left, right) =>
      (right.timestamp || right.createdAt).localeCompare(
        left.timestamp || left.createdAt,
      ),
    );
  }
}
