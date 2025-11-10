import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database'
import { verify } from 'jsonwebtoken'
import { calculateLeadDurationDays } from '@/lib/lead-duration-utils'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

interface DurationStats {
  source: string
  averageDays: number
  count: number
  minDays: number
  maxDays: number
}

interface MonthlyStats {
  month: string
  averageDays: number
  count: number
}

interface CommercialStats {
  commercial: string
  averageDays: number
  count: number
  conversionRate: number
}

/**
 * GET /api/leads/analytics/duration
 * 
 * Returns lead duration analytics including:
 * - Average duration by source
 * - Average duration by month
 * - Average duration by commercial
 * - Overall statistics
 * 
 * Query parameters:
 * - startDate: Filter leads created after this date (ISO string)
 * - endDate: Filter leads created before this date (ISO string)
 * - source: Filter by specific source
 * - commercial: Filter by specific commercial
 */
export async function GET(request: NextRequest) {
  try {
    // Verify JWT
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const token = authHeader.substring(7)
    let user: { name: string; role: string; magasin?: string } | null = null
    try {
      const decoded = verify(token, JWT_SECRET) as any
      user = { name: decoded.name, role: decoded.role, magasin: decoded.magasin }
    } catch (_) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const sourceFilter = searchParams.get('source')
    const commercialFilter = searchParams.get('commercial')

    // Build where clause
    const where: any = {}
    
    if (startDate) {
      where.createdAt = { ...where.createdAt, gte: new Date(startDate) }
    }
    if (endDate) {
      where.createdAt = { ...where.createdAt, lte: new Date(endDate) }
    }
    if (sourceFilter) {
      where.source = sourceFilter
    }
    if (commercialFilter) {
      where.assignePar = commercialFilter
    }

    // Fetch all leads (both converted and active)
    const leads = await prisma.lead.findMany({
      where,
      select: {
        id: true,
        source: true,
        assignePar: true,
        createdAt: true,
        convertedAt: true,
        statut: true,
        month: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Calculate overall statistics
    const totalLeads = leads.length
    const convertedLeads = leads.filter(l => l.statut === 'converti')
    const nonInterestedLeads = leads.filter(l => l.statut === 'non_interesse')
    const activeLeads = leads.filter(l => l.statut !== 'converti' && l.statut !== 'non_interesse')

    const allDurations = leads.map(lead => 
      calculateLeadDurationDays(lead.createdAt, lead.convertedAt)
    )
    
    const averageDuration = totalLeads > 0
      ? Math.round(allDurations.reduce((sum, d) => sum + d, 0) / totalLeads)
      : 0

    const convertedDurations = convertedLeads.map(lead =>
      calculateLeadDurationDays(lead.createdAt, lead.convertedAt)
    )
    
    const averageConversionDuration = convertedLeads.length > 0
      ? Math.round(convertedDurations.reduce((sum, d) => sum + d, 0) / convertedLeads.length)
      : 0

    // Statistics by source
    const sourceMap = new Map<string, number[]>()
    leads.forEach(lead => {
      const duration = calculateLeadDurationDays(lead.createdAt, lead.convertedAt)
      if (!sourceMap.has(lead.source)) {
        sourceMap.set(lead.source, [])
      }
      sourceMap.get(lead.source)!.push(duration)
    })

    const bySource: DurationStats[] = Array.from(sourceMap.entries()).map(([source, durations]) => ({
      source,
      averageDays: Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length),
      count: durations.length,
      minDays: Math.min(...durations),
      maxDays: Math.max(...durations)
    })).sort((a, b) => a.averageDays - b.averageDays)

    // Statistics by month (for TikTok and other monthly tracked sources)
    const monthMap = new Map<string, number[]>()
    leads.forEach(lead => {
      if (lead.month) {
        const duration = calculateLeadDurationDays(lead.createdAt, lead.convertedAt)
        if (!monthMap.has(lead.month)) {
          monthMap.set(lead.month, [])
        }
        monthMap.get(lead.month)!.push(duration)
      }
    })

    const byMonth: MonthlyStats[] = Array.from(monthMap.entries()).map(([month, durations]) => ({
      month,
      averageDays: Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length),
      count: durations.length
    })).sort((a, b) => a.averageDays - b.averageDays)

    // Statistics by commercial
    const commercialMap = new Map<string, { durations: number[], converted: number, total: number }>()
    leads.forEach(lead => {
      const duration = calculateLeadDurationDays(lead.createdAt, lead.convertedAt)
      if (!commercialMap.has(lead.assignePar)) {
        commercialMap.set(lead.assignePar, { durations: [], converted: 0, total: 0 })
      }
      const stats = commercialMap.get(lead.assignePar)!
      stats.durations.push(duration)
      stats.total++
      if (lead.statut === 'converti') {
        stats.converted++
      }
    })

    const byCommercial: CommercialStats[] = Array.from(commercialMap.entries()).map(([commercial, stats]) => ({
      commercial,
      averageDays: Math.round(stats.durations.reduce((sum, d) => sum + d, 0) / stats.durations.length),
      count: stats.total,
      conversionRate: Math.round((stats.converted / stats.total) * 100)
    })).sort((a, b) => a.averageDays - b.averageDays)

    // Response
    return NextResponse.json({
      overall: {
        totalLeads,
        convertedLeads: convertedLeads.length,
        nonInterestedLeads: nonInterestedLeads.length,
        activeLeads: activeLeads.length,
        averageDuration,
        averageConversionDuration,
        conversionRate: totalLeads > 0 ? Math.round((convertedLeads.length / totalLeads) * 100) : 0
      },
      bySource,
      byMonth,
      byCommercial,
      filters: {
        startDate,
        endDate,
        source: sourceFilter,
        commercial: commercialFilter
      }
    })
  } catch (error) {
    console.error('Error fetching lead duration analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
