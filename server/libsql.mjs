export function makeDatabase(client) {
  const changes = result => ({ meta: { changes: result.rowsAffected } });
  function prepare(sql, args = []) {
    const query = { sql, args };
    return {
      query,
      bind: (...values) => prepare(sql, values),
      first: async () => (await client.execute(query)).rows[0] ?? null,
      all: async () => ({ results: (await client.execute(query)).rows }),
      run: async () => changes(await client.execute(query)),
    };
  }
  return {prepare, batch: async statements =>
    (await client.batch(statements.map(s => s.query),"write")).map(changes)};
}
