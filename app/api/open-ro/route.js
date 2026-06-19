import { NextResponse } from 'next/server';
import { bigquery } from '../../../lib/bigquery';
import { getMappedLocation } from '../../../lib/locationMapper';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '50', 10);
        const offset = parseInt(searchParams.get('offset') || '0', 10);
        const search = searchParams.get('search') || '';
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        const projectDataset = 'tata-one-setup.workshop';

        let whereConditions = [];
        const params = { limit, offset };
        const types = { limit: 'INT64', offset: 'INT64' };

        if (search) {
            whereConditions.push(`(LOWER(JC_Number) LIKE @search OR LOWER(Chassis_No) LIKE @search OR LOWER(Registration_No) LIKE @search OR LOWER(Division) LIKE @search OR LOWER(PPL) LIKE @search OR LOWER(Job_Card_Delay_Reason) LIKE @search)`);
            params.search = `%${search.toLowerCase()}%`;
            types.search = 'STRING';
        }

        if (startDate && endDate) {
            whereConditions.push(`(Status = 'Open' OR (SAFE_CAST(Job_Card_Created_Date AS DATE) >= SAFE_CAST(@startDate AS DATE) AND SAFE_CAST(Job_Card_Created_Date AS DATE) <= SAFE_CAST(@endDate AS DATE)))`);
            params.startDate = startDate;
            params.endDate = endDate;
            types.startDate = 'STRING';
            types.endDate = 'STRING';
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // 1. Grouped Delay Reasons
        const delaysQuery = `
            SELECT 
                COALESCE(NULLIF(TRIM(Job_Card_Delay_Reason), ''), 'No Reason Specified') as delay_reason,
                COUNT(CASE WHEN UPPER(Service_Type) NOT LIKE '%ACCIDENT%' THEN 1 END) as mech_count,
                COUNT(CASE WHEN UPPER(Service_Type) LIKE '%ACCIDENT%' THEN 1 END) as acc_count,
                COUNT(1) as total,
                COALESCE(ROUND(AVG(SAFE_CAST(JC_Open_Days AS FLOAT64)), 1), 0) as avg_days
            FROM \`${projectDataset}.open_ro\`
            ${whereClause}
            GROUP BY delay_reason
            ORDER BY total DESC
        `;

        // 2. Ageing Buckets
        const ageingQuery = `
            SELECT 
                CASE 
                    WHEN SAFE_CAST(JC_Open_Days AS FLOAT64) <= 4 THEN '0-4 Days'
                    WHEN SAFE_CAST(JC_Open_Days AS FLOAT64) <= 7 THEN '5-7 Days'
                    WHEN SAFE_CAST(JC_Open_Days AS FLOAT64) <= 15 THEN '8-15 Days'
                    ELSE '>15 Days'
                END as age_bucket,
                COUNT(1) as total_count
            FROM \`${projectDataset}.open_ro\`
            ${whereClause}
            GROUP BY age_bucket
            ORDER BY 
                CASE 
                    WHEN age_bucket = '0-4 Days' THEN 1
                    WHEN age_bucket = '5-7 Days' THEN 2
                    WHEN age_bucket = '8-15 Days' THEN 3
                    ELSE 4
                END
        `;

        // 3. Detailed List Query with search filter
        const listQuery = `
            SELECT 
                JC_Number as jc_number,
                Job_Card_Created_Date as created_date,
                Status as status,
                COALESCE(SAFE_CAST(JC_Open_Days AS INT64), 0) as open_days,
                COALESCE(NULLIF(TRIM(Job_Card_Delay_Reason), ''), '-') as delay_reason,
                COALESCE(NULLIF(TRIM(Action_on_Delay_Reason), ''), '-') as action_taken,
                Division as division,
                Service_Type as service_type,
                Chassis_No as chassis_no,
                Registration_No as reg_no,
                PPL as model
            FROM \`${projectDataset}.open_ro\`
            ${whereClause}
            ORDER BY open_days DESC, created_date DESC
            LIMIT @limit OFFSET @offset
        `;

        const countQuery = `
            SELECT COUNT(1) as total_count
            FROM \`${projectDataset}.open_ro\`
            ${whereClause}
        `;

        const [
            [delaysRows],
            [ageingRows],
            [listRows],
            [countRows]
        ] = await Promise.all([
            bigquery.query({ query: delaysQuery, params, types }),
            bigquery.query({ query: ageingQuery, params, types }),
            bigquery.query({ query: listQuery, params, types }),
            bigquery.query({ query: countQuery, params, types })
        ]);

        return NextResponse.json({
            delays: delaysRows,
            ageing: ageingRows,
            openRos: listRows.map(r => ({ ...r, division: getMappedLocation(r.division) })),
            total: countRows[0] ? countRows[0].total_count : 0
        });

    } catch (e) {
        console.error('API Error /api/open-ro:', e.message);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
