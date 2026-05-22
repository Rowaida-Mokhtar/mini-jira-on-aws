import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { Inject, Injectable } from '@nestjs/common';
import { DYNAMODB_DOCUMENT_CLIENT } from '../aws/aws.constants';
import { AppConfigService } from '../config/app-config.service';
import { Team } from './team.entity';

type DynamoDbDocumentClient = {
  send(
    command: DeleteCommand | GetCommand | PutCommand | ScanCommand,
  ): Promise<unknown>;
};

@Injectable()
export class TeamsRepository {
  private readonly tableName: string;

  constructor(
    @Inject(DYNAMODB_DOCUMENT_CLIENT)
    private readonly documentClient: DynamoDbDocumentClient,
    config: AppConfigService,
  ) {
    this.tableName = config.get('TEAMS_TABLE');
  }

  async create(team: Team): Promise<Team> {
    await this.put(team);
    return team;
  }

  async put(team: Team): Promise<Team> {
    await this.documentClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: team,
      }),
    );

    return team;
  }

  async findAll(): Promise<Team[]> {
    const result = (await this.documentClient.send(
      new ScanCommand({
        TableName: this.tableName,
      }),
    )) as { Items?: Team[] };

    return result.Items ?? [];
  }

  async findById(id: string): Promise<Team | undefined> {
    const result = (await this.documentClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { id },
      }),
    )) as { Item?: Team };

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
