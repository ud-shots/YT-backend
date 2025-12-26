import { Logs } from './src/models/logs';
import { db } from './src/config/db';
import Logger from './src/common/logger';

async function testLogging() {
  try {
    // Connect to database
    await db.authenticate();
    console.log('Database connected successfully.');

    // Test logging an error
    const mockReq: any = {
      method: 'GET',
      url: '/test-endpoint',
      headers: {
        'user-agent': 'Test Agent',
        'x-forwarded-for': '192.168.1.1'
      },
      body: { test: 'data' },
      user: { id: 'test-user-123' },
      userId: 'test-user-123'
    };

    await Logger.logError(
      new Error('Test error for logging system'),
      mockReq,
      'TestModule',
      'testAction',
      'Testing the error logging functionality'
    );

    console.log('Error logged successfully.');

    // Test logging info
    await Logger.logInfo(
      'TestModule',
      'testInfoAction',
      'Testing the info logging functionality',
      mockReq,
      'test-user-123'
    );

    console.log('Info logged successfully.');

    // Test logging a warning
    await Logger.logWarning(
      new Error('Test warning for logging system'),
      mockReq,
      'TestModule',
      'testWarningAction',
      'Testing the warning logging functionality'
    );

    console.log('Warning logged successfully.');

    // Fetch and display recent logs
    const recentLogs = await Logs.findAll({
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    console.log('\nRecent logs:');
    recentLogs.forEach(log => {
      console.log(`- ${log.module} | ${log.action} | ${log.error_message} | ${log.ip_address}`);
    });

    console.log('\nLogging system test completed successfully!');
  } catch (error) {
    console.error('Error during logging test:', error);
  } finally {
    // Close database connection
    await db.close();
  }
}

// Run the test
testLogging().catch(console.error);