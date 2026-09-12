async function run() {
  const params = { id: '123' };
  const { id } = await params;
  console.log('id is:', id);
}
run();
