fetch('http://127.0.0.1:4040/api/tunnels')
  .then(res => res.json())
  .then(data => console.log(JSON.stringify(data, null, 2)))
  .catch(err => console.error(err.message));
