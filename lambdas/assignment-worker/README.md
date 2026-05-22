# mini-jira-worker-v2

This folder represents the active AWS Lambda function:

```text
mini-jira-worker-v2
```

## Event Flow

- Source event: SNS topic `mini-jira-task-assignments`
- Queue trigger: SQS queue `mini-jira-assignment-queue`
- Lambda output:
  - DynamoDB table `MiniJiraActivityLog`
  - CloudWatch custom metric `MiniJira/TasksAssignedPerTeam`

## Runtime Behavior

The Lambda receives SQS records whose bodies contain SNS messages. Each SNS `Message` is parsed as a task assignment JSON payload from the backend.

For each assignment, the worker writes an activity log item:

```text
id
taskId
title
action = ASSIGNED
assigneeId
teamId
projectId
assignedBy
timestamp
```

It also publishes a CloudWatch metric:

```text
Namespace: MiniJira
MetricName: TasksAssignedPerTeam
Dimension: TeamId = taskData.teamId
Value: 1
Unit: Count
```

## Environment Variables

```env
ACTIVITY_LOG_TABLE=MiniJiraActivityLog
```

If `ACTIVITY_LOG_TABLE` is not set, the worker defaults to `MiniJiraActivityLog`.

## Package

Install dependencies:

```powershell
npm install
```

Create deployment ZIP:

```powershell
npm run zip
```

Output:

```text
mini-jira-worker-v2.zip
```

## Deployment Note

To update the existing AWS Lambda, upload `mini-jira-worker-v2.zip` to the existing function `mini-jira-worker-v2`. Do not create a new function. Keep the existing SQS trigger connected to `mini-jira-assignment-queue`.
