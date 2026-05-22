import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { Inject, Injectable } from '@nestjs/common';
import { DYNAMODB_DOCUMENT_CLIENT } from '../aws/aws.constants';
import { AppConfigService } from '../config/app-config.service';
import { Task } from './task.entity';

type DynamoDbDocumentClient = {
  send(
    command:
      | DeleteCommand
      | GetCommand
      | PutCommand
      | QueryCommand
      | ScanCommand,
  ): Promise<unknown>;
};

@Injectable()
export class TasksRepository {
  private readonly tableName: string;

  constructor(
    @Inject(DYNAMODB_DOCUMENT_CLIENT)
    private readonly documentClient: DynamoDbDocumentClient,
    config: AppConfigService,
  ) {
    this.tableName = config.get('TASKS_TABLE');
  }

  async create(task: Task): Promise<Task> {
    await this.put(task);
    return task;
  }

  async put(task: Task): Promise<Task> {
    await this.documentClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: task,
      }),
    );

    return task;
  }

  async findAll(): Promise<Task[]> {
    const result = (await this.documentClient.send(
      new ScanCommand({
        TableName: this.tableName,
      }),
    )) as { Items?: Task[] };

    return result.Items ?? [];
  }

  async findByTeamId(teamId: string): Promise<Task[]> {
    const result = (await this.documentClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: 'teamId-index',
        KeyConditionExpression: 'teamId = :teamId',
        ExpressionAttributeValues: {
          ':teamId': teamId,
        },
      }),
    )) as { Items?: Task[] };

    return result.Items ?? [];
  }

  async findByAssigneeId(assigneeId: string): Promise<Task[]> {
    const result = (await this.documentClient.send(
      new ScanCommand({
        TableName: this.tableName,
        FilterExpression: 'assigneeId = :assigneeId',
        ExpressionAttributeValues: {
          ':assigneeId': assigneeId,
        },
      }),
    )) as { Items?: Task[] };

    return result.Items ?? [];
  }

  async findById(id: string): Promise<Task | undefined> {
    const result = (await this.documentClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { id },
      }),
    )) as { Item?: Task };

    return result.Item;
  }

  async delete(id: string): Promise<void> {
    await this.documentClient.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: { id },
      }),
    );
  }
}
