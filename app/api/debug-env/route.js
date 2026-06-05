import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        hasGcpCreds: !!process.env.GCP_CREDENTIALS,
        gcpCredsLength: process.env.GCP_CREDENTIALS ? process.env.GCP_CREDENTIALS.length : 0,
        envKeys: Object.keys(process.env).filter(k => !k.startsWith('VERCEL') && !k.startsWith('AWS') && !k.startsWith('NODE'))
    });
}
