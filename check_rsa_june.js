const { bigquery } = require('./lib/bigquery');

async function checkRSA() {
    const q = `
        SELECT 
            Division, Agreement_Name, Mwmbership, Agreement_Created_Date
        FROM \`tata-one-setup.workshop.memberships_detailed1\`
        WHERE SAFE_CAST(Agreement_Created_Date AS DATE) >= '2026-06-01'
        LIMIT 5
    `;
    const [rows] = await bigquery.query({ query: q });
    console.log("RSA Data:", rows);
}
checkRSA();
