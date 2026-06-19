const fs = require('fs');

async function check() {
  const pb = await fetch('http://127.0.0.1:8090/api/collections/iuran/records');
  const data = await pb.json();
  console.log(JSON.stringify(data, null, 2));
}

check();
