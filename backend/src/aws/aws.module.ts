import { Module } from '@nestjs/common';
import { dynamoDbDocumentClientProvider } from './dynamodb.provider';
import { s3ClientProvider } from './s3.provider';

@Module({
  providers: [dynamoDbDocumentClientProvider, s3ClientProvider],
  exports: [dynamoDbDocumentClientProvider, s3ClientProvider],
})
export class AwsModule {}
