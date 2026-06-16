import { NextResponse } from 'next/server';
import { bigquery } from '../../../lib/bigquery';
import { getMappedLocation } from '../../../lib/locationMapper';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate') || '2024-01-01';
        const endDate = searchParams.get('endDate') || new Date().toISOString().slice(0, 10);

        const projectDataset = 'tata-one-setup.workshop';

        // 1. Memberships Queries (detailed lists & summaries)
        const membershipSummaryQuery = `
            SELECT 
                COALESCE(Agreement_Name, Mwmbership, 'Standard Membership') as program_name,
                COUNT(1) as total_count,
                COUNT(CASE WHEN UPPER(Membership_Status) = 'ACTIVE' OR Membership_Status IS NULL THEN 1 END) as active_count
            FROM \`${projectDataset}.memberships_detailed1\`
            WHERE SAFE_CAST(Agreement_Created_Date AS DATE) >= SAFE_CAST(@startDate AS DATE)
              AND SAFE_CAST(Agreement_Created_Date AS DATE) <= SAFE_CAST(@endDate AS DATE)
            GROUP BY program_name
            ORDER BY total_count DESC
        `;

        const membershipRecentQuery = `
            SELECT 
                Agreement_Created_Date as created_date,
                COALESCE(First_Name, Contact_Name) as customer_name,
                Mwmbership as type,
                0 as amount,
                Registration_No as reg_no,
                Division as division
            FROM \`${projectDataset}.memberships_detailed1\`
            WHERE SAFE_CAST(Agreement_Created_Date AS DATE) >= SAFE_CAST(@startDate AS DATE)
              AND SAFE_CAST(Agreement_Created_Date AS DATE) <= SAFE_CAST(@endDate AS DATE)
            ORDER BY Agreement_Created_Date DESC
            LIMIT 15
        `;

        // 2. AMC Queries
        const amcSummaryQuery = `
            SELECT 
                Division as division,
                COUNT(1) as total_contracts,
                COALESCE(SUM(Amc_Payment_Amount), 0) as total_revenue,
                COALESCE(ROUND(AVG(Amc_Payment_Amount), 1), 0) as avg_price
            FROM \`${projectDataset}.Detail_AMC_Report\`
            WHERE SAFE_CAST(Amc_Start_Date AS DATE) >= SAFE_CAST(@startDate AS DATE)
              AND SAFE_CAST(Amc_Start_Date AS DATE) <= SAFE_CAST(@endDate AS DATE)
            GROUP BY division
            ORDER BY total_contracts DESC
        `;

        const amcRecentQuery = `
            SELECT 
                SAFE_CAST(Amc_Start_Date AS DATE) as start_date,
                AMC_Contract_No as contract_no,
                PPL as model,
                Amc_Payment_Amount as amount,
                Division as division,
                Chassis_No as chassis_no
            FROM \`${projectDataset}.Detail_AMC_Report\`
            WHERE SAFE_CAST(Amc_Start_Date AS DATE) >= SAFE_CAST(@startDate AS DATE)
              AND SAFE_CAST(Amc_Start_Date AS DATE) <= SAFE_CAST(@endDate AS DATE)
            ORDER BY Amc_Start_Date DESC
            LIMIT 15
        `;

        // 3. Extended Warranty Queries
        const ewSummaryQuery = `
            SELECT 
                COALESCE(Product, 'Extended Warranty') as product_name,
                COUNT(1) as total_contracts,
                COALESCE(SUM(Final_EW_Price_w_o_tax), 0) as total_revenue,
                COALESCE(SUM(Dealer_Margin), 0) as total_margin
            FROM \`${projectDataset}.extended_warranty\`
            WHERE SAFE_CAST(Sale_Date AS DATE) >= SAFE_CAST(@startDate AS DATE)
              AND SAFE_CAST(Sale_Date AS DATE) <= SAFE_CAST(@endDate AS DATE)
            GROUP BY product_name
            ORDER BY total_contracts DESC
        `;

        const ewSummaryByLocationQuery = `
            SELECT 
                Division as division,
                COUNT(1) as total_contracts
            FROM \`${projectDataset}.extended_warranty\`
            WHERE SAFE_CAST(Sale_Date AS DATE) >= SAFE_CAST(@startDate AS DATE)
              AND SAFE_CAST(Sale_Date AS DATE) <= SAFE_CAST(@endDate AS DATE)
            GROUP BY division
        `;

        const rsaSummaryByLocationQuery = `
            SELECT 
                Division as division,
                COUNT(1) as total_contracts
            FROM \`${projectDataset}.memberships_detailed1\`
            WHERE (UPPER(Agreement_Name) LIKE '%ASSISTANCE%' OR UPPER(Mwmbership) LIKE '%ASSISTANCE%')
              AND SAFE_CAST(Agreement_Created_Date AS DATE) >= SAFE_CAST(@startDate AS DATE)
              AND SAFE_CAST(Agreement_Created_Date AS DATE) <= SAFE_CAST(@endDate AS DATE)
            GROUP BY division
        `;

        const ewRecentQuery = `
            SELECT 
                Sale_Date as sale_date,
                Product as product_name,
                Final_EW_Price_w_o_tax as price,
                Dealer_Margin as margin,
                Division as division,
                Chassis_No as chassis_no
            FROM \`${projectDataset}.extended_warranty\`
            WHERE SAFE_CAST(Sale_Date AS DATE) >= SAFE_CAST(@startDate AS DATE)
              AND SAFE_CAST(Sale_Date AS DATE) <= SAFE_CAST(@endDate AS DATE)
            ORDER BY Sale_Date DESC
            LIMIT 15
        `;

        const options = {
            params: { startDate, endDate },
            types: { startDate: 'STRING', endDate: 'STRING' }
        };

        // Run queries in parallel
        const [
            [mSummary],
            [mRecent],
            [amcSummary],
            [amcRecent],
            [ewSummary],
            [ewSummaryByLocation],
            [rsaSummaryByLocation],
            [ewRecent]
        ] = await Promise.all([
            bigquery.query({ query: membershipSummaryQuery, ...options }),
            bigquery.query({ query: membershipRecentQuery, ...options }),
            bigquery.query({ query: amcSummaryQuery, ...options }),
            bigquery.query({ query: amcRecentQuery, ...options }),
            bigquery.query({ query: ewSummaryQuery, ...options }),
            bigquery.query({ query: ewSummaryByLocationQuery, ...options }),
            bigquery.query({ query: rsaSummaryByLocationQuery, ...options }),
            bigquery.query({ query: ewRecentQuery, ...options })
        ]);

        return NextResponse.json({
            memberships: {
                summary: mSummary,
                recent: mRecent
            },
            amc: {
                summary: amcSummary.map(a => ({ ...a, division: getMappedLocation(a.division) })),
                recent: amcRecent.map(a => ({ ...a, division: getMappedLocation(a.division) }))
            },
            ew: {
                summary: ewSummary,
                summaryByLocation: ewSummaryByLocation.map(e => ({ ...e, division: getMappedLocation(e.division) })),
                recent: ewRecent.map(e => ({ ...e, division: getMappedLocation(e.division) }))
            },
            rsa: {
                summaryByLocation: rsaSummaryByLocation.map(r => ({ ...r, division: getMappedLocation(r.division) }))
            }
        });

    } catch (e) {
        console.error('API Error /api/programs:', e.message);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
