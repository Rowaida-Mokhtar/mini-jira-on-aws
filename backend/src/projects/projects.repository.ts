import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { Inject, Injectable } from '@nestjs/common';
import { DYNAMODB_DOCUMENT_CLIENT } from '../aws/aws.constants';
import { AppConfigService } from '../config/app-config.service';
import { Project } from './project.entity';

type DynamoDbDocumentClient = {
  send(
    command: DeleteCommand | GetCommand | PutCommand | ScanCommand,
  ): Promise<unknown>;
};

@Injectable()
export class ProjectsRepository {
  private readonly tableName: string;

  constructor(
    @Inject(DYNAMODB_DOCUMENT_CLIENT)
    private readonly documentClient: DynamoDbDocumentClient,
    config: AppConfigService,
  ) {
    this.tableName = config.get('PROJECTS_TABLE');
  }

  async create(project: Project): Promise<Project> {
    await this.put(project);
    return project;
  }

  async put(project: Project): Promise<Project> {
    await this.documentClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: project,
      }),
    );

    return project;
  }

  async findAll(): Promise<Project[]> {
    const result = (await this.documentClient.send(
      new ScanCommand({
        TableName: this.tableName,
      }),
    )) as { Items?: Project[] };

    return result.Items ?? [];
  }

  async findByTeamId(teamId: string): Promise<Project[]> {
    const result = (await this.documentClient.send(
      new ScanCommand({
        TableName: this.tableName,
        FilterExpression: 'teamId = :teamId',
        ExpressionAttributeValues: {
          ':teamId': teamId,
        },
      }),
    )) as { Items?: Project[] };

    return result.Items ?? [];
  }

  async findById(id: string): Promise<Project | undefined> {
    const result = (await this.documentClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { id },
      }),
    )) as { Item?: Project };

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
