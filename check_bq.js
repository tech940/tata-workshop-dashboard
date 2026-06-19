const { bigquery } = require('./lib/bigquery');

async function checkTables() {
    try {
        const query = `
            SELECT table_name 
            FROM \`tata-one-setup.workshop.INFORMATION_SCHEMA.TABLES\`
        `;
        const [rows] = await bigquery.query({ query });
        console.log("Tables found:", rows.map(r => r.table_name).join(", "));
    } catch (e) {
        console.error(e);
    }
}
checkTables();
