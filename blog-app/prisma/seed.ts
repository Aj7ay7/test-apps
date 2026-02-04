import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const readmeBlogContent = `# Next.js with PostgreSQL – Getting Started

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

To stop Postgres: \`docker-compose down\` (add \`-v\` to remove the data volume).

## Getting Started (after deploy)

Run the development server:

\`\`\`bash
npm run dev
# or
yarn dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) with your browser.

You can start editing the page by modifying \`pages/index.tsx\`. The page auto-updates as you edit.

[API routes](https://nextjs.org/docs/api-routes/introduction) can be accessed at \`/api/*\`. Files in \`pages/api\` are treated as API routes.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs) – learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) – interactive Next.js tutorial.
- [Next.js GitHub repository](https://github.com/vercel/next.js/) – feedback and contributions welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new). Check out the [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
`;

async function main() {
  const slug = "nextjs-postgresql-getting-started";
  const existing = await prisma.post.findUnique({ where: { slug } });
  if (!existing) {
    await prisma.post.create({
      data: {
        title: "Next.js with PostgreSQL – Getting Started",
        slug,
        excerpt:
          "Run a Next.js app with PostgreSQL and Prisma locally using Docker. Covers environment setup, migrations, seeding, and running the dev server.",
        content: readmeBlogContent,
      },
    });
    console.log("Seeded blog post: Next.js with PostgreSQL – Getting Started");
  } else {
    console.log("Blog post already exists, skipping seed.");
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
