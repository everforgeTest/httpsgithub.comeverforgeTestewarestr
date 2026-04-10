const { runStudentTests } = require('./TestCases/StudentTests');

(async () => {
  try {
    await runStudentTests();
    console.log('All tests passed.');
    process.exit(0);
  } catch (e) {
    console.error('Tests failed:', e);
    process.exit(1);
  }
})();
