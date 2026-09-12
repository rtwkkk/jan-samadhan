// We provide a simple base utility to strip protected fields, but each repo explicitly defines its methods.
export function stripProtectedFields(update: Record<string, any>, protectedFields: string[] = ['accountId', '_id', 'createdAt', 'updatedAt']) {
  const safeUpdate = { ...update };
  for (const field of protectedFields) {
    delete safeUpdate[field];
  }
  return safeUpdate;
}
