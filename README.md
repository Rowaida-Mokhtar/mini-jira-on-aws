# Mini-Jira on AWS

> Event-driven task management platform deployed on AWS with high availability across 2 Availability Zones

## Live Application
[CloudFront URL](https://your-cloudfront-url.cloudfront.net) *(Update after deployment)*

## Architecture
![Architecture Diagram](./diagrams/architecture.png)

### AWS Services Used
| Service | Purpose |
|---------|---------|
| EC2 + Auto Scaling | Host Node.js backend across 2 AZs |
| Application Load Balancer | Distribute traffic + health checks |
| CloudFront | CDN for low-latency delivery |
| DynamoDB | Store Tasks, Projects, Comments, Users, Teams |
| S3 (2 buckets) | Original images + resized thumbnails |
| Lambda (3 functions) | Image resize, assignment worker, daily digest |
| SNS + SQS | Event fan-out + decoupled processing |
| EventBridge | Scheduled daily digest (9:00 AM) |
| Cognito | Authentication + role/team attributes |
| CloudWatch | Dashboard + alarms + custom metrics |
| VPC | Public/private subnets across 2 AZs + NAT gateway |

## Features
- Role-based access (Manager / Employee)
- Team isolation enforced server-side (GSI on teamId)
- Task lifecycle: To Do → In Progress → In Review → Done
- Image upload + automatic resizing (Lambda trigger)
- Event-driven notifications (SNS → Email + SQS)
- Daily digest of due tasks (EventBridge → Lambda)
- Kanban board with drag-and-drop
- Comments thread + audit log
- CloudWatch monitoring dashboard

## Tech Stack
- **Frontend**: React 18 + Tailwind CSS + shadcn/ui
- **Backend**: Node.js + Express (TypeScript)
- **Database**: DynamoDB (GSIs on teamId, assigneeId)
- **Auth**: AWS Cognito
- **Infrastructure**: AWS (see architecture above)

## Project Structure
mini-jira-on-aws/
├── backend/
│ ├── src/
│ │ ├── controllers/ # API logic + team isolation
│ │ ├── models/ # DynamoDB schemas
│ │ ├── routes/ # Express routes
│ │ ├── middleware/ # Cognito token validation
│ │ ├── services/ # S3, SNS, DynamoDB clients
│ │ └── lambdas/ # 3 Lambda functions
│ ├── package.json
│ └── tsconfig.json
├── frontend/
│ ├── src/
│ │ ├── components/ # Kanban, TaskModal, Comments
│ │ ├── pages/ # Login, Dashboard, TeamView
│ │ └── hooks/ # useAuth, useTasks
│ └── package.json
├── infrastructure/
│ ├── terraform/ # IaC (optional)
│ └── scripts/ # Deployment scripts
├── diagrams/
│ └── architecture.png # Architecture diagram
└── .gitignore

## Environment Variables
Create `.env` files from `.env.example` in backend and frontend folders.

## Demo Credentials
| Role | Email | Password |
|------|-------|----------|
| Manager | manager@example.com | Demo123! |
| Employee (Frontend) | sara@example.com | Demo123! |
| Employee (Backend) | omar@example.com | Demo123! |

## Demo Video
[Link to demo video] *(Add after recording)*

## Team
- Rowaida Mokhtar
- Rana Abouraia
- Mohamed Serag
- Seif Zaky
- Youssef 

## Course
Software Cloud Computing 2026 - Dr. John Zaki

## Deadline
22/5/2026