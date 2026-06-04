import { NextResponse } from 'next/server';
import { bigquery } from '../../../lib/bigquery';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate') || '2022-01-01';
        const endDate = searchParams.get('endDate') || new Date().toISOString().slice(0, 10);
        const search = searchParams.get('search') || '';
        const limit = parseInt(searchParams.get('limit') || '50', 10);
        const offset = parseInt(searchParams.get('offset') || '0', 10);

        const projectDataset = 'tata-one-setup.workshop';

        let whereClause = `
            WHERE \`Invoice Date\` >= SAFE_CAST(@startDate AS DATE)
              AND \`Invoice Date\` <= SAFE_CAST(@endDate AS DATE)
        `;
        
        const params = { startDate, endDate, limit, offset };
        const types = { startDate: 'STRING', endDate: 'STRING', limit: 'INT64', offset: 'INT64' };

        if (search) {
            whereClause += `
                AND (
                    LOWER(\`Invoice Number\`) LIKE @search
                    OR LOWER(\`Registration No\`) LIKE @search
                    OR LOWER(\`Chassis No\`) LIKE @search
                    OR LOWER(\`Assigned To\`) LIKE @search
                )
            `;
            params.search = `%${search.toLowerCase()}%`;
            types.search = 'STRING';
        }

        const dataQuery = `
            SELECT 
                \`Invoice Number\` as invoice_number,
                \`Invoice Date\` as invoice_date,
                \`Registration No\` as reg_no,
                \`Chassis No\` as chassis_no,
                \`Assigned To\` as advisor,
                Labour_Amount as labour_amount,
                Discount as discount,
                Spare_Sale as spare_sale,
                WA_Count as wa_count,
                WA_AMOUNT as wa_amount,
                WB_COUNT as wb_count,
                WB_AMOUNT as wb_amount,
                VAS_AMOUNT as vas_amount,
                VAS_WA_WB as vas_wa_wb,
                available
            FROM \`${projectDataset}.Workshop_Revenue_Report\`
            ${whereClause}
            ORDER BY \`Invoice Date\` DESC, \`Invoice Number\` DESC
            LIMIT @limit OFFSET @offset
        `;

        const countQuery = `
            SELECT COUNT(1) as total_count
            FROM \`${projectDataset}.Workshop_Revenue_Report\`
            ${whereClause}
        `;

        const [
            [dataRows],
            [countRows]
        ] = await Promise.all([
            bigquery.query({ query: dataQuery, params, types }),
            bigquery.query({ query: countQuery, params, types })
        ]);

        return NextResponse.json({
            invoices: dataRows,
            total: countRows[0] ? countRows[0].total_count : 0
        });

    } catch (e) {
        console.error('API Error /api/invoices:', e.message);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
