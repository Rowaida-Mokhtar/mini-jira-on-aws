import { Injectable } from '@nestjs/common';

const DEFAULTS = {
  PORT: '3001',
  AWS_REGION: 'us-east-1',
  COGNITO_USER_POOL_ID: 'us-east-1_MnU14fJhg',
  COGNITO_CLIENT_ID: '38hfjgaegfe0agdqn2n6a41pmh',
  USERS_TABLE: 'MiniJiraUsers',
  TEAMS_TABLE: 'MiniJiraTeams',
  PROJECTS_TABLE: 'MiniJiraProjects',
  TASKS_TABLE: 'MiniJiraTasks',
  COMMENTS_TABLE: 'MiniJiraComments',
  ACTIVITY_LOG_TABLE: 'MiniJiraActivityLog',
  TASK_IMAGES_BUCKET: 'mini-jira-swprojectgiu-2026-originals',
  RESIZED_IMAGES_BUCKET: 'mini-jira-swprojectgiu-2026-resized',
} as const;

type DefaultEnvKey = keyof typeof DEFAULTS;

@Injectable()
export class AppConfigService {
  get(key: DefaultEnvKey): string {
    return process.env[key] || DEFAULTS[key];
  }

  getOptional(key: string): string | undefined {
    const value = process.env[key];
    return value && value.trim().length > 0 ? value : undefined;
  }

  getNumber(key: DefaultEnvKey): number {
    const value = Number(this.get(key));

    if (!Number.isFinite(value)) {
      throw new Error(`Environment variable ${key} must be a number`);
    }

    return value;
  }

  get port(): number {
    return this.getNumber('PORT');
  }

  get awsRegion(): string {
    return this.get('AWS_REGION');
  }

  get cognitoUserPoolId(): string {
    return this.get('COGNITO_USER_POOL_ID');
  }

  get cognitoClientId(): string {
    return this.get('COGNITO_CLIENT_ID');
  }

  get taskImagesBucket(): string {
    return this.get('TASK_IMAGES_BUCKET');
  }
}
