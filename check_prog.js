const { bigquery } = require('./lib/bigquery');

async function checkPrograms() {
    try {
        const query1 = `SELECT DISTINCT COALESCE(Agreement_Name, Mwmbership) as prog FROM \`tata-one-setup.workshop.memberships_detailed1\``;
        const [rows1] = await bigquery.query({ query: query1 });
        console.log("Memberships:", rows1.map(r => r.prog).join(", "));
        
        const query2 = `SELECT DISTINCT Product FROM \`tata-one-setup.workshop.extended_warranty\``;
        const [rows2] = await bigquery.query({ query: query2 });
        console.log("EW Products:", rows2.map(r => r.Product).join(", "));
    } catch (e) {
        console.error(e);
    }
}
checkPrograms();
