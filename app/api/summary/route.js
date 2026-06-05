import { NextResponse } from 'next/server';
import { bigquery } from '../../../lib/bigquery';
import { getMappedLocation } from '../../../lib/locationMapper';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate') || '2024-01-01';
        const endDate = searchParams.get('endDate') || new Date().toISOString().slice(0, 10);

        const projectDataset = 'tata-one-setup.workshop';

        // 1. Get the max date from the database to use as the default end date if needed
        const maxDateQuery = `
            SELECT CAST(MAX(\`Invoice Date\`) AS STRING) as max_date 
            FROM \`${projectDataset}.Workshop_Revenue_Report\` 
            WHERE UPPER(\`Invoice Status\`) = 'NEW'
        `;
        const [maxDateRows] = await bigquery.query({ query: maxDateQuery });
        const globalLastDate = maxDateRows[0]?.max_date || endDate;

        // Use the selected dates (or fallbacks)
        const activeEndDate = endDate || globalLastDate;
        const activeStartDate = startDate || activeEndDate.substring(0, 8) + '01';

        // 2. Summary Query (CY vs LY for MTD, QTD, YTD)
        const summaryQuery = `
            WITH Base AS (
                SELECT 
                    \`Division\` as loc, 
                    \`Service Type\` as type, 
                    \`Invoice Date\` as invoice_date, 
                    TRIM(UPPER(\`Assigned To\`)) as sa,
                    SAFE_CAST(Labour_Amount AS FLOAT64) as lab, 
                    SAFE_CAST(Spare_Sale AS FLOAT64) as part,
                    SAFE_CAST(WA_AMOUNT AS FLOAT64) as wa, 
                    SAFE_CAST(WB_AMOUNT AS FLOAT64) as wb, 
                    SAFE_CAST(VAS_AMOUNT AS FLOAT64) as vas,
                    SAFE_CAST(WA_Count AS FLOAT64) as wa_cnt, 
                    SAFE_CAST(WB_COUNT AS FLOAT64) as wb_cnt,
                    SAFE_CAST(Job_Discount AS FLOAT64) as disc
                FROM \`${projectDataset}.Workshop_Revenue_Report\`
                WHERE UPPER(\`Invoice Status\`) = 'NEW' AND \`Invoice Date\` IS NOT NULL
                  AND \`Invoice Date\` >= DATE_SUB(DATE_TRUNC(SAFE_CAST(@endDate AS DATE), YEAR), INTERVAL 1 YEAR)
            ),
            FinalBase AS (
                SELECT *,
                    CASE 
                        WHEN SAFE_CAST(@endDate AS DATE) = CURRENT_DATE('Asia/Kolkata') THEN 
                            CASE WHEN invoice_date = DATE_SUB(SAFE_CAST(@endDate AS DATE), INTERVAL 1 DAY) THEN 1 ELSE 0 END
                        ELSE 
                            CASE WHEN invoice_date = SAFE_CAST(@endDate AS DATE) THEN 1 ELSE 0 END
                    END as is_td,
                    CASE WHEN invoice_date BETWEEN SAFE_CAST(@startDate AS DATE) AND SAFE_CAST(@endDate AS DATE) THEN 1 ELSE 0 END as is_range_cy,
                    CASE WHEN invoice_date BETWEEN DATE_SUB(SAFE_CAST(@startDate AS DATE), INTERVAL 1 YEAR) AND DATE_SUB(SAFE_CAST(@endDate AS DATE), INTERVAL 1 YEAR) THEN 1 ELSE 0 END as is_range_ly,
                    CASE WHEN invoice_date BETWEEN DATE_TRUNC(SAFE_CAST(@endDate AS DATE), MONTH) AND SAFE_CAST(@endDate AS DATE) THEN 1 ELSE 0 END as is_mtd_cy,
                    CASE WHEN invoice_date BETWEEN DATE_SUB(DATE_TRUNC(SAFE_CAST(@endDate AS DATE), MONTH), INTERVAL 1 YEAR) AND DATE_SUB(SAFE_CAST(@endDate AS DATE), INTERVAL 1 YEAR) THEN 1 ELSE 0 END as is_mtd_ly,
                    CASE WHEN invoice_date BETWEEN DATE_SUB(DATE_TRUNC(SAFE_CAST(@endDate AS DATE), MONTH), INTERVAL 1 YEAR) AND LAST_DAY(DATE_SUB(DATE_TRUNC(SAFE_CAST(@endDate AS DATE), MONTH), INTERVAL 1 YEAR)) THEN 1 ELSE 0 END as is_fm_ly,
                    CASE WHEN invoice_date BETWEEN DATE_TRUNC(SAFE_CAST(@endDate AS DATE), QUARTER) AND SAFE_CAST(@endDate AS DATE) THEN 1 ELSE 0 END as is_qtd_cy,
                    CASE WHEN invoice_date BETWEEN DATE_SUB(DATE_TRUNC(SAFE_CAST(@endDate AS DATE), QUARTER), INTERVAL 1 YEAR) AND DATE_SUB(SAFE_CAST(@endDate AS DATE), INTERVAL 1 YEAR) THEN 1 ELSE 0 END as is_qtd_ly,
                    CASE WHEN invoice_date BETWEEN DATE_TRUNC(SAFE_CAST(@endDate AS DATE), YEAR) AND SAFE_CAST(@endDate AS DATE) THEN 1 ELSE 0 END as is_ytd_cy,
                    CASE WHEN invoice_date BETWEEN DATE_SUB(DATE_TRUNC(SAFE_CAST(@endDate AS DATE), YEAR), INTERVAL 1 YEAR) AND DATE_SUB(SAFE_CAST(@endDate AS DATE), INTERVAL 1 YEAR) THEN 1 ELSE 0 END as is_ytd_ly
                FROM Base
            )
            SELECT 
                loc as Location, 
                type as Type, 
                sa as SA,
                SUM(is_td) as td, 
                SUM(is_td * lab) as lab_td, 
                SUM(is_td * part) as part_td,
                SUM(is_range_cy) as rcy, 
                SUM(is_range_ly) as rly,
                SUM(is_mtd_cy) as cy, 
                SUM(is_mtd_ly) as ly, 
                SUM(is_fm_ly) as fmly, 
                SUM(is_fm_ly * lab) as lab_fmly, 
                SUM(is_fm_ly * part) as part_fmly,
                SUM(is_qtd_cy) as qcy, 
                SUM(is_qtd_ly) as qly,
                SUM(is_ytd_cy) as ycy, 
                SUM(is_ytd_ly) as yly,
                SUM(is_range_cy * lab) as lab_rcy, 
                SUM(is_range_ly * lab) as lab_rly,
                SUM(is_mtd_cy * lab) as lab_cy, 
                SUM(is_mtd_ly * lab) as lab_ly,
                SUM(is_qtd_cy * lab) as lab_qcy, 
                SUM(is_qtd_ly * lab) as lab_qly,
                SUM(is_ytd_cy * lab) as lab_ycy, 
                SUM(is_ytd_ly * lab) as lab_yly,
                SUM(is_range_cy * part) as part_rcy, 
                SUM(is_range_ly * part) as part_rly,
                SUM(is_mtd_cy * part) as part_cy, 
                SUM(is_mtd_ly * part) as part_ly,
                SUM(is_qtd_cy * part) as part_qcy, 
                SUM(is_qtd_ly * part) as part_qly,
                SUM(is_ytd_cy * part) as part_ycy, 
                SUM(is_ytd_ly * part) as part_yly,
                SUM(is_range_cy * wa) as wa_rcy, 
                SUM(is_range_cy * wb) as wb_rcy, 
                SUM(is_range_cy * vas) as vas_rcy,
                SUM(is_range_cy * wa_cnt) as wa_count_rcy, 
                SUM(is_range_cy * wb_cnt) as wb_count_rcy,
                SUM(is_range_cy * disc) as disc_rcy,
                SUM(is_mtd_cy * wa) as wa_cy, 
                SUM(is_mtd_cy * wb) as wb_cy, 
                SUM(is_mtd_cy * vas) as vas_cy,
                SUM(is_mtd_cy * wa_cnt) as wa_count_cy, 
                SUM(is_mtd_cy * wb_cnt) as wb_count_cy,
                SUM(is_mtd_cy * disc) as disc_cy
            FROM FinalBase 
            GROUP BY 1, 2, 3
        `;

        // 3. FY Trends Query
        const fyTrendsQuery = `
            SELECT 
                CASE 
                    WHEN EXTRACT(MONTH FROM \`Invoice Date\`) >= 4 THEN CONCAT(CAST(EXTRACT(YEAR FROM \`Invoice Date\`) AS STRING), "-", CAST(EXTRACT(YEAR FROM \`Invoice Date\`) + 1 AS STRING)) 
                    ELSE CONCAT(CAST(EXTRACT(YEAR FROM \`Invoice Date\`) - 1 AS STRING), "-", CAST(EXTRACT(YEAR FROM \`Invoice Date\`) AS STRING)) 
                END as fy,
                Division as Location, 
                COUNT(*) as load, 
                SUM(SAFE_CAST(Labour_Amount AS FLOAT64)) as labour, 
                SUM(SAFE_CAST(Spare_Sale AS FLOAT64)) as part
            FROM \`${projectDataset}.Workshop_Revenue_Report\` 
            WHERE UPPER(\`Invoice Status\`) = "NEW" 
            GROUP BY 1, 2
        `;

        // 4. Day Trends Query (for the trend chart)
        const dayTrendsQuery = `
            SELECT 
                CAST(\`Invoice Date\` AS STRING) as d, 
                Division as Location, 
                \`Service Type\` as Type,
                SUM(CASE WHEN EXTRACT(YEAR FROM \`Invoice Date\`) = EXTRACT(YEAR FROM SAFE_CAST(@endDate AS DATE)) THEN 1 ELSE 0 END) as cy,
                SUM(CASE WHEN EXTRACT(YEAR FROM \`Invoice Date\`) = EXTRACT(YEAR FROM DATE_SUB(SAFE_CAST(@endDate AS DATE), INTERVAL 1 YEAR)) THEN 1 ELSE 0 END) as ly,
                SUM(CASE WHEN EXTRACT(YEAR FROM \`Invoice Date\`) = EXTRACT(YEAR FROM SAFE_CAST(@endDate AS DATE)) THEN SAFE_CAST(Labour_Amount AS FLOAT64) ELSE 0 END) as lab_cy,
                SUM(CASE WHEN EXTRACT(YEAR FROM \`Invoice Date\`) = EXTRACT(YEAR FROM DATE_SUB(SAFE_CAST(@endDate AS DATE), INTERVAL 1 YEAR)) THEN SAFE_CAST(Labour_Amount AS FLOAT64) ELSE 0 END) as lab_ly,
                SUM(CASE WHEN EXTRACT(YEAR FROM \`Invoice Date\`) = EXTRACT(YEAR FROM SAFE_CAST(@endDate AS DATE)) THEN SAFE_CAST(Spare_Sale AS FLOAT64) ELSE 0 END) as part_cy,
                SUM(CASE WHEN EXTRACT(YEAR FROM \`Invoice Date\`) = EXTRACT(YEAR FROM DATE_SUB(SAFE_CAST(@endDate AS DATE), INTERVAL 1 YEAR)) THEN SAFE_CAST(Spare_Sale AS FLOAT64) ELSE 0 END) as part_ly
            FROM \`${projectDataset}.Workshop_Revenue_Report\`
            WHERE UPPER(\`Invoice Status\`) = "NEW" AND \`Invoice Date\` IS NOT NULL
              AND (
                (EXTRACT(YEAR FROM \`Invoice Date\`) = EXTRACT(YEAR FROM SAFE_CAST(@endDate AS DATE)) AND EXTRACT(MONTH FROM \`Invoice Date\`) = EXTRACT(MONTH FROM SAFE_CAST(@endDate AS DATE)))
                OR (EXTRACT(YEAR FROM \`Invoice Date\`) = EXTRACT(YEAR FROM DATE_SUB(SAFE_CAST(@endDate AS DATE), INTERVAL 1 YEAR)) AND EXTRACT(MONTH FROM \`Invoice Date\`) = EXTRACT(MONTH FROM DATE_SUB(SAFE_CAST(@endDate AS DATE), INTERVAL 1 YEAR)))
              )
            GROUP BY 1, 2, 3 
            ORDER BY 1
        `;

        // 5. Bot Status (Last Sync time)
        const statusQuery = `
            SELECT Last_Run, Status 
            FROM \`${projectDataset}.bot_status\` 
            ORDER BY Last_Run DESC 
            LIMIT 1
        `;

        const options = {
            params: { startDate: activeStartDate, endDate: activeEndDate },
            types: { startDate: 'STRING', endDate: 'STRING' }
        };

        // Run queries in parallel
        const [
            [summaryRows],
            [fyTrendsRows],
            [dayTrendsRows],
            [statusRows]
        ] = await Promise.all([
            bigquery.query({ query: summaryQuery, ...options }),
            bigquery.query({ query: fyTrendsQuery }),
            bigquery.query({ query: dayTrendsQuery, params: { endDate: activeEndDate }, types: { endDate: 'STRING' } }),
            bigquery.query({ query: statusQuery })
        ]);

        return NextResponse.json({
            systemToday: activeEndDate,
            globalLastDate: globalLastDate,
            results: summaryRows.map(r => ({ ...r, Location: getMappedLocation(r.Location) })),
            fyTrends: fyTrendsRows.map(f => ({ ...f, Location: getMappedLocation(f.Location) })),
            dayTrends: dayTrendsRows.map(d => ({ ...d, Location: getMappedLocation(d.Location) })),
            lastSync: statusRows[0] || null
        });

    } catch (e) {
        console.error('API Error /api/summary:', e.message);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
