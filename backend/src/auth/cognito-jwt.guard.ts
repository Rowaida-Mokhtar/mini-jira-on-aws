import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { Request } from 'express';
import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';
import { DYNAMODB_DOCUMENT_CLIENT } from '../aws/aws.constants';
import { AppConfigService } from '../config/app-config.service';
import { AuthUser } from './auth-user.type';
import { UserRole } from './user-role.enum';

type RequestWithUser = Request & {
  user?: AuthUser;
};

type DynamoDbDocumentClient = {
  send(command: GetCommand): Promise<unknown>;
};

@Injectable()
export class CognitoJwtGuard implements CanActivate {
  private readonly cognitoIssuer: string;
  private readonly cognitoClientId: string;
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;
  private readonly usersTableName: string;

  constructor(
    config: AppConfigService,
    @Inject(DYNAMODB_DOCUMENT_CLIENT)
    private readonly documentClient: DynamoDbDocumentClient,
  ) {
    this.cognitoIssuer = `https://cognito-idp.${config.awsRegion}.amazonaws.com/${config.cognitoUserPoolId}`;
    this.cognitoClientId = config.cognitoClientId;
    this.usersTableName = config.get('USERS_TABLE');
    this.jwks = createRemoteJWKSet(
      new URL(`${this.cognitoIssuer}/.well-known/jwks.json`),
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = this.getBearerToken(request);

    if (token) {
      request.user = await this.enrichWithStoredProfile(
        await this.verifyCognitoToken(token),
      );
      return true;
    }

    const demoUser = this.getDevelopmentDemoUser(request);

    if (demoUser) {
      request.user = demoUser;
      return true;
    }

    throw new UnauthorizedException('Missing bearer token');
  }

  private async verifyCognitoToken(token: string): Promise<AuthUser> {
    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.cognitoIssuer,
      });

      this.assertExpectedCognitoClient(payload);
      return this.mapClaimsToAuthUser(payload);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Invalid Cognito token');
    }
  }

  private assertExpectedCognitoClient(payload: JWTPayload): void {
    const tokenUse = this.getStringClaim(payload, 'token_use');

    if (tokenUse === 'id') {
      if (!this.audienceMatchesClientId(payload.aud)) {
        throw new UnauthorizedException('Invalid Cognito token audience');
      }

      return;
    }

    if (tokenUse === 'access') {
      const clientId = this.getStringClaim(payload, 'client_id');

      if (clientId !== this.cognitoClientId) {
        throw new UnauthorizedException('Invalid Cognito access token client');
      }

      return;
    }

    throw new UnauthorizedException('Unsupported Cognito token type');
  }

  private mapClaimsToAuthUser(payload: JWTPayload): AuthUser {
    const userId = this.getRequiredStringClaim(payload, 'sub');
    const email = this.getRequiredStringClaim(payload, 'email');
    const role = this.getRequiredStringClaim(payload, 'custom:role');
    const teamId = this.getStringClaim(payload, 'custom:teamId');

    if (!this.isUserRole(role)) {
      throw new UnauthorizedException('Invalid or missing user role');
    }

    return {
      userId,
      email,
      role,
      teamId,
    };
  }

  private async enrichWithStoredProfile(user: AuthUser): Promise<AuthUser> {
    const result = (await this.documentClient.send(
      new GetCommand({
        TableName: this.usersTableName,
        Key: { id: user.userId },
      }),
    )) as {
      Item?: {
        role?: string;
        teamId?: string;
      };
    };

    const storedRole = result.Item?.role;

    return {
      ...user,
      role: this.isUserRole(storedRole) ? storedRole : user.role,
      teamId: result.Item?.teamId || user.teamId,
    };
  }

  private audienceMatchesClientId(audience: JWTPayload['aud']): boolean {
    if (Array.isArray(audience)) {
      return audience.includes(this.cognitoClientId);
    }

    return audience === this.cognitoClientId;
  }

  private getRequiredStringClaim(payload: JWTPayload, name: string): string {
    const value = this.getStringClaim(payload, name);

    if (!value) {
      throw new UnauthorizedException(`Missing Cognito claim: ${name}`);
    }

    return value;
  }

  private getStringClaim(
    payload: JWTPayload,
    name: string,
  ): string | undefined {
    const value = payload[name];
    return typeof value === 'string' ? value : undefined;
  }

  private getBearerToken(request: Request): string | undefined {
    const authorization = this.getHeaderValue(request, 'authorization');

    if (!authorization) {
      return undefined;
    }

    const [scheme, token] = authorization.split(' ');
    return scheme?.toLowerCase() === 'bearer' && token ? token : undefined;
  }

  private getDevelopmentDemoUser(request: Request): AuthUser | undefined {
    if (process.env.NODE_ENV === 'production') {
      return undefined;
    }

    const userId = this.getHeaderValue(request, 'x-demo-user-id');
    const email = this.getHeaderValue(request, 'x-demo-email');
    const role = this.getHeaderValue(request, 'x-demo-role');
    const teamId = this.getHeaderValue(request, 'x-demo-team-id');

    if (!userId || !email || !this.isUserRole(role)) {
      return undefined;
    }

    return {
      userId,
      email,
      role,
      teamId,
    };
  }

  private getHeaderValue(request: Request, name: string): string | undefined {
    const value = request.headers[name];

    if (Array.isArray(value)) {
      return value[0];
    }

    return value;
  }

  private isUserRole(value: string | undefined): value is UserRole {
    return value === UserRole.MANAGER || value === UserRole.EMPLOYEE;
  }
}
