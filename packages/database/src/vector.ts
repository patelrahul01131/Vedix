import * as lancedb from 'vectordb';
import path from 'path';

// Store embeddings in a local .lancedb folder at the monorepo root
const dbPath = path.resolve(process.cwd(), '../../.lancedb');

let cachedDb: lancedb.Connection | null = null;

export async function getVectorDB() {
  if (cachedDb) return cachedDb;
  cachedDb = await lancedb.connect(dbPath);
  return cachedDb;
}

export async function getCodeSnippetsTable() {
  const db = await getVectorDB();
  const tableNames = await db.tableNames();
  
  let exists = tableNames.includes('code_snippets');
  if (exists) {
    const table = await db.openTable('code_snippets');
    const schema = await table.schema;
    const vectorField = schema.fields.find(f => f.name === 'vector');
    // If the dimension is not 2048, drop and recreate
    if (vectorField && vectorField.type.listSize !== 2048) {
      await db.dropTable('code_snippets');
      exists = false;
    }
  }

  if (!exists) {
    // Initial schema for the table. Using 2048 for OpenRouter model.
    return await db.createTable('code_snippets', [
      { id: 'dummy', vector: Array(2048).fill(0), text: 'dummy', path: 'dummy' }
    ]);
  }
  
  return await db.openTable('code_snippets');
}
