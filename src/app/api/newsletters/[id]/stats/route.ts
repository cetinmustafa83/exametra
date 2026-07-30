import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/newsletters/[id]/stats — get newsletter analytics
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');

    // Single newsletter stats
    if (id !== 'aggregate') {
      const newsletter = await db.newsletter.findUnique({ where: { id } });
      if (!newsletter || newsletter.deletedAt) {
        return NextResponse.json({ error: 'Newsletter not found' }, { status: 404 });
      }

      const openRate = newsletter.totalRecipients > 0
        ? (newsletter.openCount / newsletter.totalRecipients) * 100
        : 0;
      const clickRate = newsletter.totalRecipients > 0
        ? (newsletter.clickCount / newsletter.totalRecipients) * 100
        : 0;
      const bounceRate = newsletter.totalRecipients > 0
        ? (newsletter.bounceCount / newsletter.totalRecipients) * 100
        : 0;

      return NextResponse.json({
        newsletterId: newsletter.id,
        title: newsletter.title,
        status: newsletter.status,
        templateType: newsletter.templateType,
        totalRecipients: newsletter.totalRecipients,
        openCount: newsletter.openCount,
        clickCount: newsletter.clickCount,
        bounceCount: newsletter.bounceCount,
        openRate: Math.round(openRate * 10) / 10,
        clickRate: Math.round(clickRate * 10) / 10,
        bounceRate: Math.round(bounceRate * 10) / 10,
        sentAt: newsletter.sentAt,
        publishedAt: newsletter.publishedAt,
      });
    }

    // Aggregate stats for school
    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId required for aggregate stats' }, { status: 400 });
    }

    const newsletters = await db.newsletter.findMany({
      where: { schoolId, status: 'sent', deletedAt: null },
      orderBy: { sentAt: 'desc' },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const totalSent = newsletters.length;
    const totalRecipients = newsletters.reduce((sum, n) => sum + n.totalRecipients, 0);
    const totalOpens = newsletters.reduce((sum, n) => sum + n.openCount, 0);
    const totalClicks = newsletters.reduce((sum, n) => sum + n.clickCount, 0);
    const totalBounces = newsletters.reduce((sum, n) => sum + n.bounceCount, 0);

    const overallOpenRate = totalRecipients > 0 ? (totalOpens / totalRecipients) * 100 : 0;
    const overallClickRate = totalRecipients > 0 ? (totalClicks / totalRecipients) * 100 : 0;
    const overallBounceRate = totalRecipients > 0 ? (totalBounces / totalRecipients) * 100 : 0;

    // Monthly trend data
    const monthlyData: Record<string, { sent: number; opens: number; clicks: number; recipients: number }> = {};
    newsletters.forEach((n) => {
      if (n.sentAt) {
        const month = new Date(n.sentAt).toISOString().slice(0, 7);
        if (!monthlyData[month]) {
          monthlyData[month] = { sent: 0, opens: 0, clicks: 0, recipients: 0 };
        }
        monthlyData[month].sent++;
        monthlyData[month].opens += n.openCount;
        monthlyData[month].clicks += n.clickCount;
        monthlyData[month].recipients += n.totalRecipients;
      }
    });

    // Best sending time analysis
    const hourCounts: Record<number, { total: number; opens: number }> = {};
    newsletters.forEach((n) => {
      if (n.sentAt) {
        const hour = new Date(n.sentAt).getHours();
        if (!hourCounts[hour]) hourCounts[hour] = { total: 0, opens: 0 };
        hourCounts[hour].total += n.totalRecipients;
        hourCounts[hour].opens += n.openCount;
      }
    });

    const bestHour = Object.entries(hourCounts).sort((a, b) => {
      const rateA = a[1].total > 0 ? a[1].opens / a[1].total : 0;
      const rateB = b[1].total > 0 ? b[1].opens / b[1].total : 0;
      return rateB - rateA;
    })[0];

    // Template type performance
    const templatePerformance: Record<string, { count: number; openRate: number; clickRate: number }> = {};
    newsletters.forEach((n) => {
      if (!templatePerformance[n.templateType]) {
        templatePerformance[n.templateType] = { count: 0, openRate: 0, clickRate: 0 };
      }
      templatePerformance[n.templateType].count++;
      if (n.totalRecipients > 0) {
        templatePerformance[n.templateType].openRate += (n.openCount / n.totalRecipients) * 100;
        templatePerformance[n.templateType].clickRate += (n.clickCount / n.totalRecipients) * 100;
      }
    });

    // Average per template
    Object.keys(templatePerformance).forEach((key) => {
      const tp = templatePerformance[key];
      if (tp.count > 0) {
        tp.openRate = Math.round((tp.openRate / tp.count) * 10) / 10;
        tp.clickRate = Math.round((tp.clickRate / tp.count) * 10) / 10;
      }
    });

    return NextResponse.json({
      overview: {
        totalSent,
        totalRecipients,
        totalOpens,
        totalClicks,
        totalBounces,
        overallOpenRate: Math.round(overallOpenRate * 10) / 10,
        overallClickRate: Math.round(overallClickRate * 10) / 10,
        overallBounceRate: Math.round(overallBounceRate * 10) / 10,
      },
      monthlyTrend: Object.entries(monthlyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, data]) => ({
          month,
          openRate: data.recipients > 0 ? Math.round((data.opens / data.recipients) * 1000) / 10 : 0,
          clickRate: data.recipients > 0 ? Math.round((data.clicks / data.recipients) * 1000) / 10 : 0,
          sent: data.sent,
          recipients: data.recipients,
        })),
      bestSendingTime: bestHour ? {
        hour: parseInt(bestHour[0]),
        openRate: bestHour[1].total > 0
          ? Math.round((bestHour[1].opens / bestHour[1].total) * 1000) / 10
          : 0,
      } : null,
      templatePerformance,
      recentNewsletters: newsletters.slice(0, 10).map((n) => ({
        id: n.id,
        title: n.title,
        templateType: n.templateType,
        sentAt: n.sentAt,
        totalRecipients: n.totalRecipients,
        openCount: n.openCount,
        clickCount: n.clickCount,
        openRate: n.totalRecipients > 0
          ? Math.round((n.openCount / n.totalRecipients) * 1000) / 10
          : 0,
        clickRate: n.totalRecipients > 0
          ? Math.round((n.clickCount / n.totalRecipients) * 1000) / 10
          : 0,
      })),
    });
  } catch (error) {
    console.error('Error fetching newsletter stats:', error);
    return NextResponse.json({ error: 'Failed to fetch newsletter stats' }, { status: 500 });
  }
}
