/**
 * API Route for Legal & Terms Generation
 * Generates GDPR-compliant legal documents for new SaaS applications
 */

import { NextRequest, NextResponse } from 'next/server';
import { LegalTermsGenerator } from '@/factory-brain/src/legal-terms-generator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      companyName,
      companyEmail,
      companyAddress,
      appName,
      appDescription,
      dataProcessing,
      thirdPartyServices,
      jurisdiction = 'EU',
    } = body;

    // Validate required fields
    if (!companyName || !companyEmail || !appName) {
      return NextResponse.json(
        { error: 'Missing required fields: companyName, companyEmail, appName' },
        { status: 400 }
      );
    }

    // Generate legal documents
    const documents = LegalTermsGenerator.generateAllDocuments({
      companyName,
      companyEmail,
      companyAddress: companyAddress || 'Not provided',
      appName,
      appDescription: appDescription || 'A SaaS application',
      dataProcessing: dataProcessing || ['user_emails', 'usage_analytics'],
      thirdPartyServices: thirdPartyServices || ['stripe', 'supabase'],
      jurisdiction: jurisdiction as 'EU' | 'US' | 'UK' | 'GLOBAL',
    });

    // Return generated documents
    return NextResponse.json({
      success: true,
      documents: documents.map(doc => ({
        type: doc.type,
        content: doc.content,
        lastUpdated: doc.lastUpdated,
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error generating legal documents:', error);
    return NextResponse.json(
      { error: 'Failed to generate legal documents' },
      { status: 500 }
    );
  }
}
