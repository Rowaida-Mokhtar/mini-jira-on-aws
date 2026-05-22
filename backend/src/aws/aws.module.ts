import { Module } from '@nestjs/common';
import { dynamoDbDocumentClientProvider } from './dynamodb.provider';
import { s3ClientProvider } from './s3.provider';
import { snsClientProvider } from './sns.provider';

@Module({
  providers: [
    dynamoDbDocumentClientProvider,
    s3ClientProvider,
    snsClientProvider,
  ],
  exports: [
    dynamoDbDocumentClientProvider,
    s3ClientProvider,
    snsClientProvider,
  ],
})
export class AwsModule {}
