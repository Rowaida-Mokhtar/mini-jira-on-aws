# Mini-Jira on AWS

Mini-Jira on AWS is a university Software Cloud Computing project: a lightweight Jira/Trello-style task management app built phase by phase for AWS.

## Stack

- Frontend: Next.js with TypeScript
- Backend: NestJS with TypeScript
- Database: AWS DynamoDB
- Auth: AWS Cognito JWT validation in the backend
- Storage: Amazon S3 for task image attachments
- Events: Amazon SNS, Amazon SQS, and AWS Lambda
- Scheduling: Amazon EventBridge daily digest Lambda
- Monitoring: Amazon CloudWatch custom metrics, dashboard, and alarm
- Deployment target: AWS `us-east-1` N. Virginia region

## Free-Tier Warning

This project must stay free-tier friendly. Do not create AWS resources until the relevant phase, and always review pricing, retention settings, alarms, and cleanup steps before deploying anything.

## Phase-Based Roadmap

1. Monorepo base: create the backend, frontend, lambdas, infrastructure, and docs structure.
2. Backend API foundation: add NestJS modules, environment configuration, validation, and server-side authorization structure.
3. DynamoDB data layer: add tables and access code for users, teams, projects, tasks, comments, and activity log.
4. Authentication: validate AWS Cognito JWTs in the backend.
5. Core app features: implement projects, tasks, comments, task status flow, and status-change audit logging.
6. Frontend app: add manager and employee views with team-aware task visibility.
7. S3 attachments: support task image uploads while retaining old image versions.
8. Event pipeline: add SNS, SQS, and Lambda assignment notifications.
9. Scheduled digest: add EventBridge daily digest Lambda.
10. Monitoring: add CloudWatch custom metrics, dashboard, and alarm.
11. Deployment: add VPC, subnets, ALB, EC2 Auto Scaling Group, CloudFront, and deployment documentation.

## Required AWS Services

- Amazon Cognito
- Amazon DynamoDB
- Amazon S3
- Amazon SNS
- Amazon SQS
- AWS Lambda
- Amazon EventBridge
- Amazon CloudWatch
- Amazon EC2
- Elastic Load Balancing
- Amazon CloudFront
- Amazon VPC

## Local Development

Backend and frontend apps are scaffolded but no business logic or AWS integration code has been added yet.

```bash
cd backend
npm run start:dev
```

```bash
cd frontend
npm run dev
```
