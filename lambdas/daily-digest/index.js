const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const awsRegion = process.env.AWS_REGION || 'us-east-1';
const tasksTable = process.env.TASKS_TABLE || 'MiniJiraTasks';
const digestTopicArn = process.env.DIGEST_TOPIC_ARN;

const dynamoDb = DynamoDBDocumentClient.from(
  new DynamoDBClient({
    region: awsRegion,
  }),
);
const sns = new SNSClient({
  region: awsRegion,
});

exports.handler = async () => {
  if (!digestTopicArn) {
    throw new Error('Missing required environment variable DIGEST_TOPIC_ARN');
  }

  const today = getTodayDate();
  console.log(`Running daily digest for ${today}`);
  console.log(`Scanning tasks table: ${tasksTable}`);

  const tasks = await scanAllTasks();
  const dueTasks = tasks.filter(
    (task) =>
      typeof task.deadline === 'string' &&
      task.deadline.startsWith(today) &&
      task.status !== 'DONE',
  );

  console.log(`Found ${dueTasks.length} due task(s) for ${today}`);

  if (dueTasks.length === 0) {
    console.log('No due tasks today');
    await publishDigest(`Mini-Jira Daily Digest - ${today}\n\nNo due tasks today.`);

    return {
      statusCode: 200,
      dueTasks: 0,
    };
  }

  const groupedTasks = groupByAssignee(dueTasks);
  const message = buildDigestMessage(today, groupedTasks);

  await publishDigest(message);
  console.log(`Published daily digest to SNS topic: ${digestTopicArn}`);

  return {
    statusCode: 200,
    dueTasks: dueTasks.length,
    assignees: Object.keys(groupedTasks).length,
  };
};

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

async function scanAllTasks() {
  const tasks = [];
  let ExclusiveStartKey;

  do {
    const result = await dynamoDb.send(
      new ScanCommand({
        TableName: tasksTable,
        ExclusiveStartKey,
      }),
    );

    tasks.push(...(result.Items ?? []));
    ExclusiveStartKey = result.LastEvaluatedKey;
  } while (ExclusiveStartKey);

  return tasks;
}

function groupByAssignee(tasks) {
  return tasks.reduce((groups, task) => {
    const assigneeId = task.assigneeId || 'UNASSIGNED';
    groups[assigneeId] = groups[assigneeId] || [];
    groups[assigneeId].push(task);
    return groups;
  }, {});
}

function buildDigestMessage(today, groupedTasks) {
  const lines = [`Mini-Jira Daily Digest - ${today}`, ''];

  for (const [assigneeId, tasks] of Object.entries(groupedTasks)) {
    lines.push(`Assignee: ${assigneeId}`);

    for (const task of tasks) {
      lines.push(`- ${task.title || '(untitled task)'}`);
      lines.push(`  Priority: ${task.priority || 'N/A'}`);
      lines.push(`  Status: ${task.status || 'N/A'}`);
      lines.push(`  Team: ${task.teamId || 'N/A'}`);
      lines.push(`  Deadline: ${task.deadline || 'N/A'}`);
      lines.push(`  Assignee: ${assigneeId}`);
    }

    lines.push('');
  }

  return lines.join('\n');
}

async function publishDigest(message) {
  console.log('Publishing daily digest message');

  await sns.send(
    new PublishCommand({
      TopicArn: digestTopicArn,
      Subject: 'Mini-Jira Daily Digest',
      Message: message,
    }),
  );
}
