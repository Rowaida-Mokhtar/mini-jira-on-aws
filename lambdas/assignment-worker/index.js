const { randomUUID } = require('crypto');
const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { CloudWatchClient, PutMetricDataCommand } = require('@aws-sdk/client-cloudwatch');

const dynamoDb = new DynamoDBClient({});
const cloudWatch = new CloudWatchClient({});

const ACTIVITY_LOG_TABLE = process.env.ACTIVITY_LOG_TABLE || 'MiniJiraActivityLog';
const METRIC_NAMESPACE = 'MiniJira';
const TASKS_ASSIGNED_METRIC = 'TasksAssignedPerTeam';

exports.handler = async (event) => {
  const records = event?.Records ?? [];
  console.log(`mini-jira-worker-v2 received ${records.length} SQS record(s)`);

  for (const record of records) {
    await processRecord(record);
  }

  console.log('mini-jira-worker-v2 finished processing batch');

  return {
    statusCode: 200,
    processedRecords: records.length,
  };
};

async function processRecord(record) {
  try {
    const taskData = parseTaskAssignment(record);
    console.log(`Processing TASK_ASSIGNED event for task ${taskData.taskId}`);

    await writeActivityLog(taskData);
    await publishTeamMetric(taskData);

    console.log(
      `Recorded assignment for task ${taskData.taskId}, team ${taskData.teamId}, assignee ${taskData.assigneeId}`,
    );
  } catch (error) {
    console.error('Failed processing SQS record', {
      messageId: record?.messageId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

function parseTaskAssignment(record) {
  if (!record?.body) {
    throw new Error('SQS record is missing body');
  }

  const snsMessage = JSON.parse(record.body);
  const rawTaskMessage = snsMessage.Message;

  if (!rawTaskMessage) {
    throw new Error('SQS record body does not contain SNS Message');
  }

  const taskData = JSON.parse(rawTaskMessage);
  validateTaskData(taskData);

  return taskData;
}

function validateTaskData(taskData) {
  const requiredFields = [
    'taskId',
    'title',
    'projectId',
    'teamId',
    'assigneeId',
    'assignedBy',
  ];

  for (const field of requiredFields) {
    if (!taskData[field]) {
      throw new Error(`Task assignment message is missing ${field}`);
    }
  }
}

async function writeActivityLog(taskData) {
  const timestamp = taskData.assignedAt || new Date().toISOString();
  const item = {
    id: { S: randomUUID() },
    taskId: { S: taskData.taskId },
    title: { S: taskData.title },
    action: { S: 'ASSIGNED' },
    assigneeId: { S: taskData.assigneeId },
    teamId: { S: taskData.teamId },
    projectId: { S: taskData.projectId },
    assignedBy: { S: taskData.assignedBy },
    timestamp: { S: timestamp },
  };

  console.log(`Writing activity log item to ${ACTIVITY_LOG_TABLE}`);

  await dynamoDb.send(
    new PutItemCommand({
      TableName: ACTIVITY_LOG_TABLE,
      Item: item,
    }),
  );
}

async function publishTeamMetric(taskData) {
  console.log(`Publishing CloudWatch metric for team ${taskData.teamId}`);

  await cloudWatch.send(
    new PutMetricDataCommand({
      Namespace: METRIC_NAMESPACE,
      MetricData: [
        {
          MetricName: TASKS_ASSIGNED_METRIC,
          Dimensions: [
            {
              Name: 'TeamId',
              Value: taskData.teamId,
            },
          ],
          Value: 1,
          Unit: 'Count',
        },
      ],
    }),
  );
}
