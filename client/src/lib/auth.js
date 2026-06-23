import { pb } from './pocketbase';

export async function checkScurity() {
  const user = pb.authStore.model;
  if (!user) return false;
  try {
    await pb.collection('scurity').getFirstListItem(`user="${user.id}"`);
    return true;
  } catch {
    return false;
  }
}