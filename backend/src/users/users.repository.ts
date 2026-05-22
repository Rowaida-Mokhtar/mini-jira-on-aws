import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { Inject, Injectable } from '@nestjs/common';
import { DYNAMODB_DOCUMENT_CLIENT } from '../aws/aws.constants';
import { AppConfigService } from '../config/app-config.service';
import { User } from './user.entity';

type DynamoDbDocumentClient = {
  send(command: GetCommand | PutCommand): Promise<unknown>;
};

@Injectable()
export class UsersRepository {
  private readonly tableName: string;

  constructor(
    @Inject(DYNAMODB_DOCUMENT_CLIENT)
    private readonly documentClient: DynamoDbDocumentClient,
    config: AppConfigService,
  ) {
    this.tableName = config.get('USERS_TABLE');
  }

  async put(user: User): Promise<User> {
    await this.documentClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: user,
      }),
    );

    return user;
  }

  async findById(id: string): Promise<User | undefined> {
    const result = (await this.documentClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { id },
      }),
    )) as { Item?: User };

    return result.Item;
  }
}
