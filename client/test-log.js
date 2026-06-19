import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8090');
async function run() {
  try {
    const authData = await pb.collection('users').authWithPassword('a01@warga.local', 'a01@warga.local');
    const w = await pb.collection('warga').getFirstListItem(`user="${pb.authStore.model.id}"`);
    console.log("Found warga:", w.id);
    const res = await pb.collection('aktivitas_warga').create({
      warga: w.id,
      aktivitas: "Test",
      detail: "Test Detail"
    });
    console.log("Success! Log ID:", res.id);
  } catch (err) {
    console.error("Error Message:", err.message);
    if (err.response) {
      console.error(JSON.stringify(err.response, null, 2));
    }
  }
}
run();
