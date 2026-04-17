import type { SyncableDocument } from "@/lib/rag-sync";

type RawQueryable = {
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number>;
  $queryRawUnsafe<T>(query: string, ...values: unknown[]): Promise<T>;
};

export async function getSyncableDocumentsByIds(
  db: RawQueryable,
  documentIds: string[],
): Promise<SyncableDocument[]> {
  if (documentIds.length === 0) {
    return [];
  }

  const placeholders = documentIds.map(() => "?").join(", ");
  return db.$queryRawUnsafe<SyncableDocument[]>(
    `SELECT "id", "status", "ragDocumentId" FROM "Document" WHERE "id" IN (${placeholders})`,
    ...documentIds,
  );
}

export async function getSyncableDocumentById(db: RawQueryable, documentId: string) {
  const documents = await getSyncableDocumentsByIds(db, [documentId]);
  return documents[0] ?? null;
}

export async function setDocumentRagDocumentId(
  db: RawQueryable,
  documentId: string,
  ragDocumentId: string,
) {
  await db.$executeRawUnsafe(
    `UPDATE "Document" SET "ragDocumentId" = ? WHERE "id" = ?`,
    ragDocumentId,
    documentId,
  );
}
