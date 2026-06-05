const { BigQuery } = require('@google-cloud/bigquery');
const path = require('path');
const fs = require('fs');

const PROJECT_ID = 'tata-one-setup';
const DATASET_ID = 'workshop';

// Determine the best path for gcp_credentials.json
let credPath = path.join(process.cwd(), 'gcp_credentials.json');
if (!fs.existsSync(credPath)) {
    credPath = path.join(process.cwd(), '..', 'gcp_credentials.json');
}
if (!fs.existsSync(credPath)) {
    // Fallback to absolute workspace path if running inside bundled directory
    credPath = 'c:\\Users\\tech\\OneDrive\\Documents\\New project\\tata_cloud_bot\\gcp_credentials.json';
}

const options = {
    projectId: PROJECT_ID
};

if (process.env.GCP_CREDENTIALS) {
    try {
        options.credentials = JSON.parse(process.env.GCP_CREDENTIALS);
    } catch (e) {
        console.error('❌ Failed to parse GCP_CREDENTIALS env var:', e.message);
    }
} else {
    options.keyFilename = credPath;
}

const bigquery = new BigQuery(options);

module.exports = {
    bigquery,
    PROJECT_ID,
    DATASET_ID
};
