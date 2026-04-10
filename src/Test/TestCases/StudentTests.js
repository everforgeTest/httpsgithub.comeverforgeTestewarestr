const { connectClient, assertEqual, delay } = require('../test-utils');
//trtrytuty
//hghgjhj
async function runStudentTests() {
  const url = 'ws://localhost:8081';
  const { client, outputs } = await connectClient(url);
//ghhjgjhguytyut
  const sendWithPromise = (payload) => {
    return new Promise((resolve, reject) => {
      const promiseId = Math.random().toString(36).slice(2) + Date.now().toString(36);
      const body = { promiseId, ...payload };
      const buf = Buffer.from(JSON.stringify(body));
      client.submitContractInput(buf).then((input) => {
        input?.submissionStatus?.then((s) => {
          if (s.status !== 'accepted') {
            reject(new Error(`Ledger_Rejection: ${s.reason}`));
          }
        });
      });
      const start = Date.now();
      const interval = setInterval(() => {
        for (let i = 0; i < outputs.length; i++) {
          const out = outputs[i];
          if (out && out.promiseId === promiseId) {
            clearInterval(interval);
            if (out.error) reject(out.error);
            else resolve(out.success || out);
            return;
          }
        }
        if (Date.now() - start > 10000) {
          clearInterval(interval);
          reject(new Error('Timeout waiting for contract output'));
        }
      }, 200);
    });
  };

  // Create
  const createRes = await sendWithPromise({
    Service: 'Student',
    Action: 'CreateStudent',
    data: { Name: 'Alice', Email: 'alice@example.com', Age: 21 }
  });
  if (!createRes || !createRes.id) throw new Error('CreateStudent failed');
  const studentId = createRes.id;

  // GetById
  const getRes = await sendWithPromise({ Service: 'Student', Action: 'GetStudentById', data: { Id: studentId } });
  assertEqual(getRes.Id, studentId, 'GetStudentById should return correct Id');
  assertEqual(getRes.Name, 'Alice', 'Name should be Alice');

  // Update
  const updRes = await sendWithPromise({ Service: 'Student', Action: 'UpdateStudent', data: { Id: studentId, Age: 22 } });
  if (!updRes || typeof updRes.changes === 'undefined') throw new Error('UpdateStudent failed');

  // GetAll
  const allRes = await sendWithPromise({ Service: 'Student', Action: 'GetAllStudents' });
  if (!Array.isArray(allRes)) throw new Error('GetAllStudents should return an array');

  // Delete
  const delRes = await sendWithPromise({ Service: 'Student', Action: 'DeleteStudent', data: { Id: studentId } });
  if (!delRes || typeof delRes.changes === 'undefined') throw new Error('DeleteStudent failed');

  await delay(500);
  client.disconnect();
}

module.exports = { runStudentTests };
