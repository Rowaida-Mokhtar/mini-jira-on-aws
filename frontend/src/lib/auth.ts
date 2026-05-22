"use client";

import {
  AuthenticationDetails,
  CognitoRefreshToken,
  CognitoUser,
  CognitoUserAttribute,
  CognitoUserPool,
  CognitoUserSession,
} from "amazon-cognito-identity-js";

export type Role = "MANAGER" | "EMPLOYEE";

export type AuthSession = {
  username: string;
  userId: string;
  email: string;
  role: Role;
  teamId?: string;
  idToken: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

export type RegisterInput = {
  email: string;
  password: string;
  role: Role;
  teamId?: string;
};

const AUTH_STORAGE_KEY = "mini-jira-auth-session";

const cognitoConfig = {
  region: process.env.NEXT_PUBLIC_COGNITO_REGION || "us-east-1",
  userPoolId:
    process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || "us-east-1_MnU14fJhg",
  clientId:
    process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || "38hfjgaegfe0agdqn2n6a41pmh",
};

const userPool = new CognitoUserPool({
  UserPoolId: cognitoConfig.userPoolId,
  ClientId: cognitoConfig.clientId,
});

export function getStoredSession(): AuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawSession = window.localStorage.getItem(AUTH_STORAGE_KEY);

  if (!rawSession) {
    return null;
  }

  try {
    return JSON.parse(rawSession) as AuthSession;
  } catch {
    clearStoredSession();
    return null;
  }
}

export function clearStoredSession() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  }

  userPool.getCurrentUser()?.signOut();
}

export async function refreshStoredSession() {
  const currentSession = getStoredSession();

  if (!currentSession?.refreshToken) {
    return null;
  }

  const cognitoUser = new CognitoUser({
    Username: currentSession.username,
    Pool: userPool,
  });
  const refreshToken = new CognitoRefreshToken({
    RefreshToken: currentSession.refreshToken,
  });

  return new Promise<AuthSession | null>((resolve) => {
    cognitoUser.refreshSession(refreshToken, (error, session) => {
      if (error || !session) {
        clearStoredSession();
        resolve(null);
        return;
      }

      resolve(saveSession(currentSession.username, session));
    });
  });
}

export function signIn(email: string, password: string) {
  const cognitoUser = new CognitoUser({
    Username: email,
    Pool: userPool,
  });
  const details = new AuthenticationDetails({
    Username: email,
    Password: password,
  });

  return new Promise<AuthSession>((resolve, reject) => {
    cognitoUser.authenticateUser(details, {
      onSuccess: (session) => resolve(saveSession(email, session)),
      onFailure: reject,
      newPasswordRequired: () => {
        reject(
          new Error(
            "This account requires a password reset before it can sign in.",
          ),
        );
      },
    });
  });
}

export function registerUser(input: RegisterInput) {
  const attributes = [
    new CognitoUserAttribute({ Name: "email", Value: input.email }),
    new CognitoUserAttribute({ Name: "custom:role", Value: input.role }),
  ];

  if (input.teamId?.trim()) {
    attributes.push(
      new CognitoUserAttribute({
        Name: "custom:teamId",
        Value: input.teamId.trim(),
      }),
    );
  }

  return new Promise<void>((resolve, reject) => {
    userPool.signUp(
      input.email,
      input.password,
      attributes,
      [],
      (error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      },
    );
  });
}

export function confirmRegistration(email: string, code: string) {
  const cognitoUser = new CognitoUser({
    Username: email,
    Pool: userPool,
  });

  return new Promise<void>((resolve, reject) => {
    cognitoUser.confirmRegistration(code, true, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

export function isSessionExpired(session: AuthSession) {
  return session.expiresAt <= Date.now() + 30_000;
}

function saveSession(username: string, session: CognitoUserSession) {
  const idToken = session.getIdToken().getJwtToken();
  const accessToken = session.getAccessToken().getJwtToken();
  const refreshToken = session.getRefreshToken().getToken();
  const claims = decodeJwtPayload(idToken);
  const role = claims["custom:role"];

  if (role !== "MANAGER" && role !== "EMPLOYEE") {
    throw new Error("Your Cognito account is missing a valid custom:role claim.");
  }

  const authSession: AuthSession = {
    username,
    userId: readStringClaim(claims, "sub"),
    email: readStringClaim(claims, "email"),
    role,
    teamId: readOptionalStringClaim(claims, "custom:teamId"),
    idToken,
    accessToken,
    refreshToken,
    expiresAt: session.getIdToken().getExpiration() * 1000,
  };

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authSession));
  return authSession;
}

function decodeJwtPayload(token: string) {
  const payload = token.split(".")[1];

  if (!payload) {
    throw new Error("Invalid Cognito token.");
  }

  const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
  const json = window.atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  return JSON.parse(json) as Record<string, unknown>;
}

function readStringClaim(claims: Record<string, unknown>, name: string) {
  const value = claims[name];

  if (typeof value !== "string" || !value) {
    throw new Error(`Your Cognito account is missing ${name}.`);
  }

  return value;
}

function readOptionalStringClaim(claims: Record<string, unknown>, name: string) {
  const value = claims[name];
  return typeof value === "string" && value ? value : undefined;
}
