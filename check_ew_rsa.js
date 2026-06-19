const { bigquery } = require('./lib/bigquery');

async function checkData() {
    try {
        console.log("Checking EW Divisions...");
        const q1 = `SELECT Division, COUNT(1) as count FROM \`tata-one-setup.workshop.extended_warranty\` GROUP BY Division`;
        const [rows1] = await bigquery.query({ query: q1 });
        console.log(rows1);

        console.log("\nChecking Memberships...");
        const q2 = `SELECT Mwmbership, Agreement_Name, COUNT(1) as count FROM \`tata-one-setup.workshop.memberships_detailed1\` GROUP BY 1, 2 LIMIT 10`;
        const [rows2] = await bigquery.query({ query: q2 });
        console.log(rows2);

        console.log("\nSearching for RSA in any table...");
        const q3 = `SELECT table_name, column_name FROM \`tata-one-setup.workshop.INFORMATION_SCHEMA.COLUMNS\` WHERE LOWER(column_name) LIKE '%rsa%'`;
        const [rows3] = await bigquery.query({ query: q3 });
        console.log(rows3);
    } catch (e) {
        console.error(e);
    }
}
checkData();
