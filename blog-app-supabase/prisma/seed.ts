import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const posts = [
  {
    slug: "nextjs-postgresql-getting-started",
    title: "Next.js with PostgreSQL – Getting Started",
    excerpt:
      "Run a Next.js app with PostgreSQL and Prisma locally using Docker. Covers environment setup, migrations, seeding, and running the dev server.",
    content: `# Next.js with PostgreSQL – Getting Started

This is a [Next.js](https://nextjs.org/) project with a **PostgreSQL** backend and **Prisma**.

## What you need (local deploy)

- **Node.js** (v16+)
- **Docker & Docker Compose** (for PostgreSQL)
- **Environment**: \`DATABASE_URL\` in \`.env\` (see below)

## Local deployment (full)

### 1. Start PostgreSQL (Docker)

\`\`\`bash
docker-compose up -d
\`\`\`

Uses: user \`postgres\`, password \`postgres\`, port \`5432\`, DB \`postgres\`.

### 2. Environment

Copy \`.env.example\` to \`.env\` (or create \`.env\` with):

\`\`\`bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"
\`\`\`

### 3. Install dependencies and DB

\`\`\`bash
npm install
npx prisma generate
npx prisma migrate deploy
\`\`\`

### 4. Optional – seed sample posts

\`\`\`bash
npx prisma db seed
\`\`\`

### 5. Run the app

\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000).
`,
  },
  {
    slug: "how-to-install-docker-on-ubuntu-24-04",
    title: "How to Install Docker on Ubuntu 24.04",
    excerpt:
      "Step-by-step guide to install Docker Engine and Docker Compose on Ubuntu 24.04 LTS using the official repository.",
    content: `# How to Install Docker on Ubuntu 24.04

This guide walks you through installing Docker Engine and Docker Compose on Ubuntu 24.04 LTS.

## Prerequisites

- Ubuntu 24.04 LTS (Noble)
- sudo access

## Install Docker Engine

### 1. Add Docker's official GPG key and repository

\`\`\`bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
\`\`\`

### 2. Install Docker packages

\`\`\`bash
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
\`\`\`

### 3. Add your user to the docker group

\`\`\`bash
sudo usermod -aG docker $USER
newgrp docker
\`\`\`

### 4. Verify installation

\`\`\`bash
docker run hello-world
\`\`\`

You should see a message confirming Docker is working. For Docker Compose: \`docker compose version\`.
`,
  },
  {
    slug: "how-to-run-sonarqube-container-in-ubuntu",
    title: "How to Run SonarQube Container in Ubuntu",
    excerpt:
      "Run SonarQube in Docker on Ubuntu for code quality and security analysis. Includes PostgreSQL and basic configuration.",
    content: `# How to Run SonarQube Container in Ubuntu

Run SonarQube in Docker on Ubuntu for continuous code quality and security analysis.

## Prerequisites

- Docker and Docker Compose installed on Ubuntu
- At least 2GB RAM for SonarQube

## Quick start with Docker Compose

Create \`docker-compose.yml\`:

\`\`\`yaml
services:
  sonarqube-db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: sonar
      POSTGRES_PASSWORD: sonar
      POSTGRES_DB: sonar
    volumes:
      - sonarqube_db_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U sonar"]
      interval: 5s
      timeout: 5s
      retries: 5

  sonarqube:
    image: sonarqube:lts-community
    depends_on:
      sonarqube-db:
        condition: service_healthy
    environment:
      SONAR_JDBC_URL: jdbc:postgresql://sonarqube-db:5432/sonar
      SONAR_JDBC_USERNAME: sonar
      SONAR_JDBC_PASSWORD: sonar
    ports:
      - "9000:9000"
    volumes:
      - sonarqube_data:/opt/sonarqube/data
      - sonarqube_extensions:/opt/sonarqube/extensions
      - sonarqube_logs:/opt/sonarqube/logs

volumes:
  sonarqube_db_data:
  sonarqube_data:
  sonarqube_extensions:
  sonarqube_logs:
\`\`\`

## Run SonarQube

\`\`\`bash
docker compose up -d
\`\`\`

Open **http://localhost:9000**. Default login: \`admin\` / \`admin\` (change on first login).

## Run a scan

\`\`\`bash
docker run --rm -v $(pwd):/usr/src sonarsource/sonar-scanner-cli
\`\`\`

Configure \`sonar-project.properties\` in your project or pass \`-Dsonar.host.url=http://host.docker.internal:9000\` when scanning from another container.
`,
  },
  {
    slug: "how-to-install-jenkins-in-ubuntu-24-04",
    title: "How to Install Jenkins in Ubuntu 24.04",
    excerpt:
      "Install Jenkins CI/CD server on Ubuntu 24.04 using the official package repository. Includes Java setup and first-run setup.",
    content: `# How to Install Jenkins in Ubuntu 24.04

Install and run Jenkins on Ubuntu 24.04 for CI/CD pipelines.

## Prerequisites

- Ubuntu 24.04 LTS
- sudo access

## 1. Install Java (required by Jenkins)

\`\`\`bash
sudo apt-get update
sudo apt-get install -y openjdk-17-jdk
java -version
\`\`\`

## 2. Add Jenkins repository and install

\`\`\`bash
curl -fsSL https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key | sudo tee /usr/share/keyrings/jenkins-keyring.asc > /dev/null
echo "deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] https://pkg.jenkins.io/debian-stable binary/" | sudo tee /etc/apt/sources.list.d/jenkins.list > /dev/null

sudo apt-get update
sudo apt-get install -y jenkins
\`\`\`

## 3. Start and enable Jenkins

\`\`\`bash
sudo systemctl start jenkins
sudo systemctl enable jenkins
sudo systemctl status jenkins
\`\`\`

## 4. Open Jenkins and complete setup

- Open **http://localhost:8080** (or your server IP:8080).
- Get the initial admin password:
  \`\`\`bash
  sudo cat /var/lib/jenkins/secrets/initialAdminPassword
  \`\`\`
- Paste the password, install suggested plugins, create an admin user, and start using Jenkins.

## Optional: Run behind Nginx

Use Nginx as a reverse proxy with HTTPS and proxy \`/\` to \`http://127.0.0.1:8080\`.
`,
  },
  {
    slug: "what-is-ebpf",
    title: "What is eBPF?",
    excerpt:
      "Introduction to eBPF (extended Berkeley Packet Filter): in-kernel programmable observability, networking, and security on Linux.",
    content: `# What is eBPF?

**eBPF** (extended Berkeley Packet Filter) is a technology in the Linux kernel that lets you run sandboxed programs in the kernel without changing kernel source or loading kernel modules.

## Why eBPF?

- **Safe**: Programs are verified before execution; invalid or unsafe code is rejected.
- **Efficient**: Runs in the kernel, so you can observe and act on events with low overhead.
- **Flexible**: Attach to many hook points: network packets, system calls, tracepoints, etc.

## Main use cases

1. **Observability** – Tracing, metrics, and profiling (e.g. BPF Compiler Collection (BCC), bpftrace).
2. **Networking** – Load balancing, DDoS mitigation, custom packet processing (e.g. Cilium).
3. **Security** – Runtime security, audit, and enforcement (e.g. Falco, Tracee).

## How it works (simplified)

1. You write a program in C or a higher-level language (e.g. bpftrace script).
2. It is compiled to BPF bytecode.
3. The kernel verifier checks it for safety (bounds, no loops that can’t be proven finite, etc.).
4. A JIT compiles it to native code and attaches it to a hook (e.g. kprobe, tracepoint, XDP).
5. When the hook fires, your program runs in the kernel and can submit data to user space via maps or perf buffers.

## Try it

\`\`\`bash
# bpftrace one-liner: count syscalls by process
sudo bpftrace -e 'tracepoint:syscalls:sys_enter_* { @[probe] = count(); }'
\`\`\`

## Learn more

- [eBPF.io](https://ebpf.io) – Overview and resources
- [BCC](https://github.com/iovisor/bcc) – Toolchain and libraries
- [bpftrace](https://github.com/bpftrace/bpftrace) – High-level tracing language
`,
  },
  {
    slug: "beginner-guide-for-docker-compose",
    title: "Beginner Guide for Docker Compose",
    excerpt:
      "Learn Docker Compose basics: define multi-container apps in YAML, run them with one command, and manage services and volumes.",
    content: `# Beginner Guide for Docker Compose

**Docker Compose** lets you define and run multi-container applications in a single file and with one command.

## Why Docker Compose?

- **One file**: Describe all services, networks, and volumes in \`docker-compose.yml\`.
- **One command**: \`docker compose up\` starts (and builds) everything.
- **Reproducible**: Same file works on any machine with Docker and Compose.

## Basic example

\`\`\`yaml
services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    depends_on:
      - db

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: app
    volumes:
      - db_data:/var/lib/postgresql/data

volumes:
  db_data:
\`\`\`

## Common commands

| Command | Description |
|--------|-------------|
| \`docker compose up -d\` | Start all services in the background |
| \`docker compose down\` | Stop and remove containers (add \`-v\` to remove volumes) |
| \`docker compose ps\` | List running services |
| \`docker compose logs -f\` | Follow logs from all services |
| \`docker compose build\` | Build images defined with \`build:\` |

## Key concepts

- **services**: Each container (e.g. \`web\`, \`db\`) is a service.
- **build**: Use \`build: .\` to build from a Dockerfile in the current directory.
- **image**: Use \`image: name:tag\` to use a pre-built image.
- **ports**: Map host port to container port (\`"HOST:CONTAINER\`).
- **environment**: Set environment variables for the container.
- **volumes**: Persist data; named volumes (e.g. \`db_data\`) are managed by Docker.
- **depends_on**: Start order; wait for listed services to be started (not “healthy” unless you use \`condition\`).

## Tips for beginners

1. Start with \`docker compose up\` (no \`-d\`) to see logs and Ctrl+C to stop.
2. Use \`docker compose config\` to validate your file.
3. Use \`depends_on\` with \`condition: service_healthy\` when a service must wait for another to be ready.
4. Put \`.env\` next to \`docker-compose.yml\` and reference variables with \`\${VAR}\`.

Once you’re comfortable, try adding a reverse proxy (e.g. Nginx) or multiple app services in the same Compose file.
`,
  },
  {
    slug: "introduction-to-kubernetes",
    title: "Introduction to Kubernetes",
    excerpt:
      "What is Kubernetes, why use it, and core concepts: pods, deployments, services, and kubectl basics.",
    content: `# Introduction to Kubernetes

**Kubernetes** (K8s) is an open-source system for automating deployment, scaling, and management of containerized applications.

## Why Kubernetes?

- **Scaling**: Scale apps up or down based on load.
- **Self-healing**: Restarts failed containers, replaces unhealthy nodes.
- **Declarative**: Describe desired state; K8s reconciles the actual state.
- **Portable**: Runs on cloud or on-prem; same manifests work everywhere.

## Core concepts

- **Pod**: Smallest deployable unit; one or more containers that share storage and network.
- **Deployment**: Manages a set of identical pods; handles rolling updates and rollbacks.
- **Service**: Stable network endpoint to access pods (ClusterIP, NodePort, LoadBalancer).
- **Namespace**: Virtual cluster for grouping resources (e.g. \`production\`, \`staging\`).

## Quick start (minikube)

\`\`\`bash
minikube start
kubectl run nginx --image=nginx --port=80
kubectl expose pod nginx --port=80 --type=NodePort
kubectl get pods,svc
\`\`\`

## Useful commands

| Command | Description |
|--------|-------------|
| \`kubectl get pods\` | List pods |
| \`kubectl describe pod <name>\` | Pod details |
| \`kubectl logs <pod>\` | Container logs |
| \`kubectl apply -f deploy.yaml\` | Apply a manifest |

Learn more at [kubernetes.io/docs](https://kubernetes.io/docs).
`,
  },
  {
    slug: "getting-started-with-terraform",
    title: "Getting Started with Terraform",
    excerpt:
      "Infrastructure as Code with Terraform: providers, resources, state, and a simple AWS or local example.",
    content: `# Getting Started with Terraform

**Terraform** by HashiCorp lets you define and manage infrastructure as code (IaC) using a declarative config language.

## Why Terraform?

- **Multi-cloud**: Same workflow for AWS, GCP, Azure, and many providers.
- **State**: Tracks what exists and only applies changes.
- **Plan**: \`terraform plan\` shows what will change before you apply.

## Basic example (local file)

\`\`\`hcl
terraform {
  required_providers {
    local = { source = "hashicorp/local", version = "~> 2.0" }
  }
}

resource "local_file" "hello" {
  content  = "Hello, Terraform!"
  filename = "\${path.module}/hello.txt"
}
\`\`\`

\`\`\`bash
terraform init
terraform plan
terraform apply -auto-approve
\`\`\`

## Key concepts

- **Provider**: Plugin for a cloud or service (e.g. \`aws\`, \`google\`).
- **Resource**: A piece of infrastructure (e.g. \`aws_instance\`, \`local_file\`).
- **State**: \`terraform.tfstate\` stores current state; keep it safe (e.g. remote backend).

Start with the [Terraform tutorials](https://developer.hashicorp.com/terraform/tutorials).
`,
  },
  {
    slug: "cicd-with-github-actions",
    title: "CI/CD with GitHub Actions",
    excerpt:
      "Automate build, test, and deploy with GitHub Actions: workflows, jobs, steps, and a simple Node.js example.",
    content: `# CI/CD with GitHub Actions

**GitHub Actions** lets you automate build, test, and deploy directly from your GitHub repository.

## Concepts

- **Workflow**: Defined in \`.github/workflows/*.yml\`; runs on events (push, PR, schedule).
- **Job**: Set of steps that run on the same runner.
- **Step**: A single task (run a script, use an action).

## Example: Node.js test on push

\`\`\`yaml
name: CI
on:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm test
      - run: npm run build
\`\`\`

## Common actions

- \`actions/checkout\` – clone repo
- \`actions/setup-node\` – Node.js
- \`actions/setup-python\` – Python
- \`docker/build-push-action\` – build and push images

Add this file under \`.github/workflows/ci.yml\` and push to trigger the workflow. Check the **Actions** tab for logs.
`,
  },
  {
    slug: "linux-commands-every-developer-should-know",
    title: "Linux Commands Every Developer Should Know",
    excerpt:
      "Essential Linux terminal commands for developers: files, processes, text, and permissions.",
    content: `# Linux Commands Every Developer Should Know

A short list of Linux commands that come up often in development and DevOps.

## Files and directories

| Command | Description |
|--------|-------------|
| \`pwd\` | Print working directory |
| \`ls -la\` | List files (long, include hidden) |
| \`cd <dir>\` | Change directory |
| \`mkdir -p a/b/c\` | Create directory tree |
| \`cp -r src dest\` | Copy recursively |
| \`mv a b\` | Move or rename |
| \`rm -rf dir\` | Remove directory (careful!) |

## Viewing and editing

| Command | Description |
|--------|-------------|
| \`cat file\` | Print file contents |
| \`less file\` | Paginated view |
| \`head -n 5 file\` | First 5 lines |
| \`tail -f log.txt\` | Follow log file |
| \`grep -r "pattern" .\` | Search in files |

## Processes and system

| Command | Description |
|--------|-------------|
| \`ps aux\` | List processes |
| \`kill -9 <PID>\` | Force kill process |
| \`top\` or \`htop\` | Interactive process list |
| \`df -h\` | Disk usage |
| \`free -h\` | Memory usage |

## Permissions

\`chmod +x script.sh\` – make executable  
\`chown user:group file\` – change owner

Combine with pipes: \`cat file | grep "error" | wc -l\`
`,
  },
  {
    slug: "understanding-docker-networking",
    title: "Understanding Docker Networking",
    excerpt:
      "Docker network types: bridge, host, none. How containers find each other and expose ports.",
    content: `# Understanding Docker Networking

How Docker connects containers and the host: default bridge, custom networks, and DNS.

## Default bridge

Every container can join the default \`bridge\` network. Containers get an IP and can ping each other by IP, but **not** by container name.

\`\`\`bash
docker run -d --name web nginx
docker run -d --name app myapp
docker exec app ping web   # fails by name on default bridge
docker network inspect bridge
\`\`\`

## User-defined bridge (recommended)

Create a network and attach containers. They can reach each other **by name** (Docker's built-in DNS).

\`\`\`bash
docker network create mynet
docker run -d --name web --network mynet nginx
docker run -d --name app --network mynet myapp
docker exec app ping web   # works
\`\`\`

## Exposing ports

- \`-p 8080:80\`: host port 8080 → container port 80.
- \`-P\`: publish all \`EXPOSE\` ports to random host ports.

In **Docker Compose**, services on the same network use the **service name** as hostname (e.g. \`http://db:5432\`).
`,
  },
];

async function main() {
  for (const post of posts) {
    const existing = await prisma.post.findUnique({ where: { slug: post.slug } });
    if (!existing) {
      await prisma.post.create({
        data: {
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt.slice(0, 600),
          content: post.content,
        },
      });
      console.log("Seeded:", post.title);
    } else {
      console.log("Skipped (exists):", post.title);
    }
  }
  console.log("Seed finished.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
