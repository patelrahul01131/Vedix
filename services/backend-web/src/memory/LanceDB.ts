import * as lancedb from 'vectordb';

// Connect to local directory for LanceDB
const dbPath = './.lancedb';

/**
 * Initializes and returns a connection to the LanceDB table for semantic memories.
 * It uses a 1536 dimension vector (standard for OpenAI embeddings).
 */
export async function getSemanticMemoryTable() {
  const db = await lancedb.connect(dbPath);
  const tableName = 'user_semantic_memories';

  const tableNames = await db.tableNames();

  if (!tableNames.includes(tableName)) {
    console.log(`[Memory] Creating new LanceDB table: ${tableName}`);
    // Create the table by inserting a dummy record with the correct schema
    // and then immediately deleting it.
    await db.createTable(tableName, [{
      id: "dummy_init",
      user_id: "dummy",
      content: "dummy",
      source: "dummy",
      created_at: Date.now(),
      vector: Array(2048).fill(0.0) 
    }]);

    const table = await db.openTable(tableName);
    await table.delete("id = 'dummy_init'");
  }

  return await db.openTable(tableName);
}
