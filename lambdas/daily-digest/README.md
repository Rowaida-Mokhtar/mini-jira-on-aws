# mini-jira-daily-digest

EventBridge-triggered Lambda that scans Mini-Jira tasks due today and publishes a daily digest to SNS.

## Trigger

EventBridge scheduled rule:

```text
Daily at 9 AM
```

Recommended cron expression depends on the intended timezone. AWS EventBridge cron schedules are UTC unless using EventBridge Scheduler with a timezone.

## Reads

DynamoDB table:

```text
MiniJiraTasks
```

The function scans the table and selects tasks where:

- `deadline` starts with today's `YYYY-MM-DD`
- `status` is not `DONE`

## Publishes

SNS digest topic:

```text
DIGEST_TOPIC_ARN
```

The digest groups due tasks by `assigneeId` and includes:

- task title
- priority
- status
- teamId
- deadline
- assigneeId

## Required Environment Variables

```env
AWS_REGION=us-east-1
TASKS_TABLE=MiniJiraTasks
DIGEST_TOPIC_ARN=<set in AWS later>
```

## Required IAM Permissions

The Lambda execution role needs:

```text
dynamodb:Scan
sns:Publish
logs:CreateLogGroup
logs:CreateLogStream
logs:PutLogEvents
```

Scope `dynamodb:Scan` to the `MiniJiraTasks` table and `sns:Publish` to the digest topic ARN.

## Local Packaging

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
mini-jira-daily-digest.zip
```

## AWS Console Deployment Notes

1. Create or update Lambda function `mini-jira-daily-digest`.
2. Runtime: Node.js 22.x.
3. Handler:

```text
index.handler
```

4. Upload `mini-jira-daily-digest.zip`.
5. Configure required environment variables.
6. Attach IAM permissions listed above.
7. Add an EventBridge daily schedule for 9 AM.
