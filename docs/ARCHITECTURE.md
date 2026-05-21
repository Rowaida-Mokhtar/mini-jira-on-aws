# Architecture

## Overview

Mini-Jira on AWS is a lightweight Jira/Trello-style application with a Next.js frontend and a NestJS backend. The backend will enforce all role and team authorization server-side, validate AWS Cognito JWTs, and store application data in DynamoDB.

Employees belong to exactly one team. Managers can see all projects and tasks, assign work to anyone, and filter tasks by team. Employees can only access tasks that belong to their own team, even if they guess another task ID.

## Required Services

- AWS Cognito for authentication and JWT issuance
- DynamoDB for Users, Teams, Projects, Tasks, Comments, and ActivityLog tables
- S3 for task image attachments
- SNS, SQS, and Lambda for assignment notification events
- EventBridge and Lambda for daily digest scheduling
- CloudWatch for custom metrics, dashboards, and alarms
- EC2 Auto Scaling Group, Application Load Balancer, CloudFront, VPC, and subnets for later deployment

## Free-Tier Notes

- Use the `us-east-1` N. Virginia region consistently.
- Avoid creating AWS resources before the matching implementation phase.
- Prefer low-capacity, on-demand, or free-tier-friendly defaults where appropriate.
- Keep logs, object versions, queues, and deployed compute under review to avoid accidental charges.
- Never hardcode AWS credentials in the repository.

## Demo Scenario Users

- Ali: manager who can see both frontend and backend team tasks.
- Sara: frontend employee who can only see tasks assigned within the Frontend team.
- Omar: backend employee who can only see tasks assigned within the Backend team.

Expected demo:

1. Ali creates Task A and assigns it to Sara on the Frontend team.
2. Ali creates Task B and assigns it to Omar on the Backend team.
3. Sara logs in and sees only Task A.
4. Omar logs in and sees only Task B.
5. Ali logs back in and sees both tasks and can filter by team.
