import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { Provider } from '@nestjs/common';
import { DYNAMODB_DOCUMENT_CLIENT } from './aws.constants';
import { AppConfigService } from '../config/app-config.service';

export const dynamoDbDocumentClientProvider: Provider = {
  provide: DYNAMODB_DOCUMENT_CLIENT,
  inject: [AppConfigService],
  useFactory: (config: AppConfigService) => {
    const client = new DynamoDBClient({
      region: config.awsRegion,
    });

    return DynamoDBDocumentClient.from(client, {
      marshallOptions: {
        removeUndefinedValues: true,
      },
    });
  },
};
