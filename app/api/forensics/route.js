import { NextResponse } from 'next/server';
import { bigquery } from '../../../lib/bigquery';
import { getMappedLocation } from '../../../lib/locationMapper';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate') || '2024-01-01';
        const endDate = searchParams.get('endDate') || new Date().toISOString().slice(0, 10);
        const limit = parseInt(searchParams.get('limit') || '20', 10);
        const offset = parseInt(searchParams.get('offset') || '0', 10);

        const projectDataset = 'tata-one-setup.workshop';

        // Base CTE definition to avoid repetition
        const baseCte = `
            WITH Base AS (
                SELECT 
                    \`Invoice Number\` as invoice_number,
                    \`Invoice Date\` as invoice_date,
                    \`Registration No\` as reg_no,
                    \`Chassis No\` as chassis_no,
                    \`Assigned To\` as advisor,
                    Labour_Amount as labour_amount,
                    Spare_Sale as spare_sale,
                    Job_Discount as discount,
                    PPL as ppl,
                    \`Service Type\` as service_type,
                    Division as Location,
                    AVG(Labour_Amount) OVER(PARTITION BY PPL, \`Service Type\`, DATE_TRUNC(\`Invoice Date\`, MONTH)) as model_avg_labour,
                    AVG(Spare_Sale) OVER(PARTITION BY PPL, \`Service Type\`, DATE_TRUNC(\`Invoice Date\`, MONTH)) as model_avg_parts,
                    AVG(Labour_Amount) OVER(PARTITION BY \`Service Type\`, DATE_TRUNC(\`Invoice Date\`, MONTH)) as global_avg_labour,
                    AVG(Spare_Sale) OVER(PARTITION BY \`Service Type\`, DATE_TRUNC(\`Invoice Date\`, MONTH)) as global_avg_parts,
                    LAG(\`Invoice Date\`) OVER(PARTITION BY \`Chassis No\` ORDER BY \`Invoice Date\`) as prev_date
                FROM \`${projectDataset}.Workshop_Revenue_Report\`
                WHERE UPPER(\`Invoice Status\`) = 'NEW'
            ),
            Alerts AS (
                SELECT *,
                    CASE WHEN discount > 20 THEN 1 ELSE 0 END as alert_discount,
                    CASE WHEN chassis_no IS NOT NULL AND chassis_no != ''
                         AND prev_date IS NOT NULL AND DATE_DIFF(invoice_date, prev_date, DAY) <= 30 THEN 1 ELSE 0 END as alert_rework,
                    CASE WHEN spare_sale > 1000 AND labour_amount = 0 THEN 1 ELSE 0 END as alert_leak,
                    CASE WHEN labour_amount < (0.5 * model_avg_labour) THEN 1 ELSE 0 END as alert_low_lab,
                    CASE WHEN spare_sale < (0.5 * model_avg_parts) THEN 1 ELSE 0 END as alert_low_part,
                    CASE WHEN labour_amount < (0.5 * global_avg_labour) THEN 1 ELSE 0 END as alert_low_lab_global,
                    CASE WHEN spare_sale < (0.5 * global_avg_parts) THEN 1 ELSE 0 END as alert_low_part_global
                FROM Base
            ),
            Scored AS (
                SELECT *,
                    (100 - (alert_rework * 25) - (alert_discount * 10) - (alert_leak * 20) - (alert_low_lab * 10) - (alert_low_part * 10) - (alert_low_lab_global * 5) - (alert_low_part_global * 5)) as advisor_score
                FROM Alerts
            )
        `;

        // 1. Overall Summary Metrics Query
        const summaryQuery = `
            ${baseCte}
            SELECT 
                COUNT(1) as total_checked,
                COALESCE(ROUND(AVG(advisor_score), 1), 0) as avg_global_score,
                COALESCE(SUM(alert_rework), 0) as total_rework,
                COALESCE(SUM(alert_discount), 0) as total_discount_alerts,
                COALESCE(SUM(alert_leak), 0) as total_leak_alerts,
                COALESCE(SUM(alert_low_lab_global), 0) as total_low_lab_global,
                COALESCE(SUM(alert_low_part_global), 0) as total_low_part_global,
                COALESCE(SUM(CASE WHEN alert_rework = 1 OR alert_discount = 1 OR alert_leak = 1 OR alert_low_lab = 1 OR alert_low_part = 1 OR alert_low_lab_global = 1 OR alert_low_part_global = 1 THEN 1 ELSE 0 END), 0) as total_flagged
            FROM Scored
            WHERE invoice_date >= SAFE_CAST(@startDate AS DATE)
              AND invoice_date <= SAFE_CAST(@endDate AS DATE)
        `;

        // 2. Advisor Leaderboard Query
        const leaderboardQuery = `
            ${baseCte}
            SELECT 
                COALESCE(advisor, 'UNASSIGNED') as advisor_name,
                COUNT(1) as total_invoices,
                COALESCE(ROUND(AVG(advisor_score), 1), 0) as avg_score,
                COALESCE(SUM(alert_rework), 0) as rework_count,
                COALESCE(SUM(alert_discount), 0) as discount_count,
                COALESCE(SUM(alert_leak), 0) as leak_count,
                COALESCE(SUM(alert_low_lab + alert_low_part + alert_low_lab_global + alert_low_part_global), 0) as low_pricing_count
            FROM Scored
            WHERE invoice_date >= SAFE_CAST(@startDate AS DATE)
              AND invoice_date <= SAFE_CAST(@endDate AS DATE)
            GROUP BY advisor_name
            ORDER BY avg_score DESC, total_invoices DESC
            LIMIT 30
        `;

        // 3. Flagged Detailed Invoices Query
        const invoicesQuery = `
            ${baseCte}
            SELECT 
                invoice_number,
                invoice_date,
                prev_date,
                reg_no,
                chassis_no,
                Location,
                service_type,
                ppl,
                COALESCE(advisor, 'UNASSIGNED') as advisor_name,
                labour_amount,
                spare_sale,
                discount,
                alert_rework,
                alert_discount,
                alert_leak,
                alert_low_lab,
                alert_low_part,
                alert_low_lab_global,
                alert_low_part_global,
                advisor_score
            FROM Scored
            WHERE invoice_date >= SAFE_CAST(@startDate AS DATE)
              AND invoice_date <= SAFE_CAST(@endDate AS DATE)
              AND (alert_rework = 1 OR alert_discount = 1 OR alert_leak = 1 OR alert_low_lab = 1 OR alert_low_part = 1 OR alert_low_lab_global = 1 OR alert_low_part_global = 1)
            ORDER BY invoice_date DESC, invoice_number DESC
            LIMIT @limit OFFSET @offset
        `;

        const options = {
            params: { startDate, endDate, limit, offset },
            types: { startDate: 'STRING', endDate: 'STRING', limit: 'INT64', offset: 'INT64' }
        };

        // Run queries in parallel
        const [
            [summaryRows],
            [leaderboardRows],
            [invoicesRows]
        ] = await Promise.all([
            bigquery.query({ query: summaryQuery, params: { startDate, endDate }, types: { startDate: 'STRING', endDate: 'STRING' } }),
            bigquery.query({ query: leaderboardQuery, params: { startDate, endDate }, types: { startDate: 'STRING', endDate: 'STRING' } }),
            bigquery.query({ query: invoicesQuery, ...options })
        ]);

        return NextResponse.json({
            summary: summaryRows[0] || { total_checked: 0, avg_global_score: 100, total_rework: 0, total_discount_alerts: 0, total_leak_alerts: 0, total_flagged: 0 },
            advisors: leaderboardRows,
            flaggedInvoices: invoicesRows.map(r => ({ ...r, Location: getMappedLocation(r.Location) }))
        });

    } catch (e) {
        console.error('API Error /api/forensics:', e.message);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
