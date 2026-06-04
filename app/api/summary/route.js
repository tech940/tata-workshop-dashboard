import { NextResponse } from 'next/server';
import { bigquery } from '../../../lib/bigquery';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate') || '2022-01-01';
        const endDate = searchParams.get('endDate') || new Date().toISOString().slice(0, 10);

        const projectDataset = 'tata-one-setup.workshop';

        // 1. KPI Query
        const kpiQuery = `
            SELECT 
                COUNT(DISTINCT \`Invoice Number\`) as total_invoices,
                COALESCE(SUM(Labour_Amount), 0) as total_labour,
                COALESCE(SUM(Spare_Sale), 0) as total_spares,
                COALESCE(SUM(Labour_Amount + Spare_Sale), 0) as total_revenue,
                COALESCE(SUM(WA_Count), 0) as total_wa,
                COALESCE(SUM(WB_COUNT), 0) as total_wb,
                COALESCE(SUM(VAS_AMOUNT), 0) as total_vas
            FROM \`${projectDataset}.Workshop_Revenue_Report\`
            WHERE \`Invoice Date\` >= SAFE_CAST(@startDate AS DATE)
              AND \`Invoice Date\` <= SAFE_CAST(@endDate AS DATE)
        `;

        // 2. Monthly Trend Query
        const trendQuery = `
            SELECT 
                FORMAT_DATE('%Y-%m', \`Invoice Date\`) as month_key,
                ANY_VALUE(FORMAT_DATE('%b %Y', \`Invoice Date\`)) as month_label,
                COALESCE(SUM(Labour_Amount), 0) as labour_revenue,
                COALESCE(SUM(Spare_Sale), 0) as spares_revenue,
                COALESCE(SUM(Labour_Amount + Spare_Sale), 0) as total_revenue
            FROM \`${projectDataset}.Workshop_Revenue_Report\`
            WHERE \`Invoice Date\` >= SAFE_CAST(@startDate AS DATE)
              AND \`Invoice Date\` <= SAFE_CAST(@endDate AS DATE)
            GROUP BY month_key
            ORDER BY month_key ASC
        `;

        // 3. Advisor Performance Query
        const advisorQuery = `
            SELECT 
                COALESCE(\`Assigned To\`, 'UNASSIGNED') as advisor_name,
                COUNT(DISTINCT \`Invoice Number\`) as jc_count,
                COALESCE(SUM(Labour_Amount + Spare_Sale), 0) as total_revenue,
                COALESCE(ROUND(AVG(Labour_Amount + Spare_Sale), 2), 0) as avg_ticket,
                COALESCE(SUM(WA_Count), 0) as wa_count,
                COALESCE(SUM(WB_COUNT), 0) as wb_count,
                COALESCE(SUM(VAS_AMOUNT), 0) as vas_revenue
            FROM \`${projectDataset}.Workshop_Revenue_Report\`
            WHERE \`Invoice Date\` >= SAFE_CAST(@startDate AS DATE)
              AND \`Invoice Date\` <= SAFE_CAST(@endDate AS DATE)
              AND \`Assigned To\` IS NOT NULL AND \`Assigned To\` != ''
            GROUP BY advisor_name
            ORDER BY total_revenue DESC
            LIMIT 15
        `;

        // 4. Bot Status (Last Sync time)
        const statusQuery = `
            SELECT Last_Run, Status 
            FROM \`${projectDataset}.bot_status\` 
            ORDER BY Last_Run DESC 
            LIMIT 1
        `;

        const options = {
            params: { startDate, endDate },
            types: { startDate: 'STRING', endDate: 'STRING' }
        };

        // Run queries in parallel
        const [
            [kpiRows],
            [trendRows],
            [advisorRows],
            [statusRows]
        ] = await Promise.all([
            bigquery.query({ query: kpiQuery, ...options }),
            bigquery.query({ query: trendQuery, ...options }),
            bigquery.query({ query: advisorQuery, ...options }),
            bigquery.query({ query: statusQuery })
        ]);

        return NextResponse.json({
            kpi: kpiRows[0] || {},
            trends: trendRows,
            advisors: advisorRows,
            lastSync: statusRows[0] || null
        });

    } catch (e) {
        console.error('API Error /api/summary:', e.message);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
