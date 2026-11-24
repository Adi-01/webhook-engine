import prisma from '../src/lib/db.js';
import 'dotenv/config';

async function main() {
  console.log('Testing PostgreSQL connection with Prisma...');
  
  // Clean up any test endpoint
  await prisma.endpoint.deleteMany({
    where: { url: 'http://localhost:3000/api/mock-receiver/test' },
  });

  // Create a test endpoint
  const endpoint = await prisma.endpoint.create({
    data: {
      name: 'Test Endpoint',
      url: 'http://localhost:3000/api/mock-receiver/test',
      secret: 'whsec_test1234567890abcdef',
    },
  });

  console.log('Successfully created endpoint:', endpoint.id, endpoint.name);

  // Read it back
  const fetched = await prisma.endpoint.findUnique({
    where: { id: endpoint.id },
  });

  if (!fetched || fetched.secret !== 'whsec_test1234567890abcdef') {
    throw new Error('Endpoint verification failed!');
  }

  console.log('Verified endpoint in database:', fetched.name);

  // Clean up
  await prisma.endpoint.delete({ where: { id: endpoint.id } });
  console.log('Cleaned up test record. DB connection & schema are 100% verified!');
}

main()
  .catch((e) => {
    console.error('Database test failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
