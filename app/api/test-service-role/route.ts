import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = getServerSupabase()
    
    // Test 1: Check if we can connect to Supabase
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('id')
      .limit(1)
    
    if (testError) {
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        details: testError.message,
        testError
      }, { status: 500 })
    }

    // Test 2: Try to list storage buckets (requires service role)
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()
    
    if (bucketError) {
      return NextResponse.json({
        success: false,
        error: 'Storage access failed - likely not using service role key',
        details: bucketError.message,
        bucketError,
        hint: 'This usually means SUPABASE_SERVICE_ROLE_KEY is not a real service role key'
      }, { status: 500 })
    }

    // Test 3: Try to upload a test file to storage
    const testFileName = `test-${Date.now()}.txt`
    const testContent = new TextEncoder().encode('Test file for service role verification')
    
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(`test/${testFileName}`, testContent, {
        contentType: 'text/plain',
        upsert: true
      })

    if (uploadError) {
      return NextResponse.json({
        success: false,
        error: 'Storage upload failed - RLS policy blocking',
        details: uploadError.message,
        uploadError,
        hint: 'This is the same error you\'re getting in file uploads'
      }, { status: 500 })
    }

    // Clean up test file
    await supabase.storage.from('documents').remove([`test/${testFileName}`])

    return NextResponse.json({
      success: true,
      message: 'Service role key is working correctly!',
      tests: {
        database: 'Connected successfully',
        storage_buckets: `Found ${buckets?.length || 0} buckets`,
        storage_upload: 'Upload test passed - RLS bypassed successfully'
      },
      buckets: buckets?.map(b => b.name) || []
    })

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: 'Unexpected error',
      details: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}