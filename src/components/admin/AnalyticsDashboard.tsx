import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, Users, Globe, Activity, TrendingUp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type DateRange = '7d' | '30d' | '90d' | 'all';

interface AnalyticsStats {
  totalVisitors: number;
  totalPageViews: number;
  totalEvents: number;
  activeSessions: number;
  uniqueUsers: number;
}

interface PageViewData {
  date: string;
  views: number;
  visitors: number;
}

interface CountryData {
  country: string;
  visitors: number;
}

interface DeviceData {
  device_type: string;
  count: number;
}

interface EventData {
  event_name: string;
  count: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--muted))', 'hsl(var(--secondary))'];

export function AnalyticsDashboard() {
  const { t } = useLanguage();
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [stats, setStats] = useState<AnalyticsStats>({
    totalVisitors: 0,
    totalPageViews: 0,
    totalEvents: 0,
    activeSessions: 0,
    uniqueUsers: 0,
  });
  const [pageViewData, setPageViewData] = useState<PageViewData[]>([]);
  const [countryData, setCountryData] = useState<CountryData[]>([]);
  const [deviceData, setDeviceData] = useState<DeviceData[]>([]);
  const [eventData, setEventData] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);

  const getDateFilter = () => {
    const now = new Date();
    switch (dateRange) {
      case '7d':
        return new Date(now.setDate(now.getDate() - 7)).toISOString();
      case '30d':
        return new Date(now.setDate(now.getDate() - 30)).toISOString();
      case '90d':
        return new Date(now.setDate(now.getDate() - 90)).toISOString();
      default:
        return '2020-01-01';
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const dateFilter = getDateFilter();

      // Fetch overview stats
      const [visitorsResult, pageViewsResult, eventsResult, sessionsResult, authUsersResult] = await Promise.all([
        supabase
          .from('analytics_page_views')
          .select('session_id', { count: 'exact', head: false })
          .gte('timestamp', dateFilter),
        supabase
          .from('analytics_page_views')
          .select('*', { count: 'exact', head: true })
          .gte('timestamp', dateFilter),
        supabase
          .from('analytics_events')
          .select('*', { count: 'exact', head: true })
          .gte('timestamp', dateFilter),
        supabase
          .from('analytics_sessions')
          .select('*', { count: 'exact', head: true })
          .is('ended_at', null),
        supabase
          .from('analytics_page_views')
          .select('user_id')
          .gte('timestamp', dateFilter)
          .not('user_id', 'is', null),
      ]);

      // Get unique visitors (sessions)
      const uniqueVisitors = visitorsResult.data 
        ? new Set(visitorsResult.data.map(v => v.session_id)).size 
        : 0;

      // Get unique authenticated users
      const uniqueAuthUsers = authUsersResult.data 
        ? new Set(authUsersResult.data.map(v => v.user_id)).size 
        : 0;

      setStats({
        totalVisitors: uniqueVisitors,
        totalPageViews: pageViewsResult.count || 0,
        totalEvents: eventsResult.count || 0,
        activeSessions: sessionsResult.count || 0,
        uniqueUsers: uniqueAuthUsers,
      });

      // Fetch page views over time
      const { data: pageViews } = await supabase
        .from('analytics_page_views')
        .select('timestamp, session_id')
        .gte('timestamp', dateFilter)
        .order('timestamp', { ascending: true });

      if (pageViews) {
        const groupedByDate = pageViews.reduce((acc: Record<string, { views: number; sessions: Set<string> }>, view) => {
          const date = new Date(view.timestamp).toLocaleDateString();
          if (!acc[date]) {
            acc[date] = { views: 0, sessions: new Set() };
          }
          acc[date].views++;
          acc[date].sessions.add(view.session_id);
          return acc;
        }, {});

        const chartData = Object.entries(groupedByDate).map(([date, data]) => ({
          date,
          views: data.views,
          visitors: data.sessions.size,
        }));

        setPageViewData(chartData);
      }

      // Fetch country data
      const { data: countries } = await supabase
        .from('analytics_page_views')
        .select('country, session_id')
        .gte('timestamp', dateFilter)
        .not('country', 'is', null);

      if (countries) {
        const countryMap = countries.reduce((acc: Record<string, Set<string>>, view) => {
          if (!acc[view.country]) {
            acc[view.country] = new Set();
          }
          acc[view.country].add(view.session_id);
          return acc;
        }, {});

        const countryChartData = Object.entries(countryMap)
          .map(([country, sessions]) => ({
            country: country || 'Unknown',
            visitors: sessions.size,
          }))
          .sort((a, b) => b.visitors - a.visitors)
          .slice(0, 10);

        setCountryData(countryChartData);
      }

      // Fetch device data
      const { data: devices } = await supabase
        .from('analytics_page_views')
        .select('device_type')
        .gte('timestamp', dateFilter)
        .not('device_type', 'is', null);

      if (devices) {
        const deviceMap = devices.reduce((acc: Record<string, number>, view) => {
          acc[view.device_type] = (acc[view.device_type] || 0) + 1;
          return acc;
        }, {});

        const deviceChartData = Object.entries(deviceMap).map(([device_type, count]) => ({
          device_type: device_type.charAt(0).toUpperCase() + device_type.slice(1),
          count,
        }));

        setDeviceData(deviceChartData);
      }

      // Fetch event data
      const { data: events } = await supabase
        .from('analytics_events')
        .select('event_name')
        .gte('timestamp', dateFilter);

      if (events) {
        const eventMap = events.reduce((acc: Record<string, number>, event) => {
          acc[event.event_name] = (acc[event.event_name] || 0) + 1;
          return acc;
        }, {});

        const eventChartData = Object.entries(eventMap)
          .map(([event_name, count]) => ({
            event_name,
            count,
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        setEventData(eventChartData);
      }

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{t('admin.analytics.title')}</h2>
          <p className="text-muted-foreground">{t('admin.analytics.description')}</p>
        </div>
        <Select value={dateRange} onValueChange={(value) => setDateRange(value as DateRange)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">{t('admin.analytics.last7Days')}</SelectItem>
            <SelectItem value="30d">{t('admin.analytics.last30Days')}</SelectItem>
            <SelectItem value="90d">{t('admin.analytics.last90Days')}</SelectItem>
            <SelectItem value="all">{t('admin.analytics.allTime')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('admin.analytics.totalSessions')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVisitors.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">{t('admin.analytics.uniqueSessions')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('admin.analytics.uniqueUsers')}</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uniqueUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">{t('admin.analytics.authenticatedUsers')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('admin.analytics.pageViews')}</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPageViews.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('admin.analytics.totalEvents')}</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEvents.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('admin.analytics.activeSessions')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeSessions.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="traffic" className="space-y-4">
        <TabsList>
          <TabsTrigger value="traffic">{t('admin.analytics.traffic')}</TabsTrigger>
          <TabsTrigger value="geography">{t('admin.analytics.geography')}</TabsTrigger>
          <TabsTrigger value="devices">{t('admin.analytics.devices')}</TabsTrigger>
          <TabsTrigger value="events">{t('admin.analytics.events')}</TabsTrigger>
        </TabsList>

        <TabsContent value="traffic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.analytics.trafficOverTime')}</CardTitle>
              <CardDescription>{t('admin.analytics.trafficOverTimeDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={pageViewData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="views" stroke="hsl(var(--primary))" name={t('admin.analytics.pageViews')} />
                  <Line type="monotone" dataKey="visitors" stroke="hsl(var(--accent))" name={t('admin.analytics.visitors')} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="geography" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.analytics.topCountries')}</CardTitle>
              <CardDescription>{t('admin.analytics.topCountriesDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={countryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="country" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="visitors" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="devices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.analytics.deviceBreakdown')}</CardTitle>
              <CardDescription>{t('admin.analytics.deviceBreakdownDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={deviceData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.device_type}: ${entry.count}`}
                    outerRadius={120}
                    fill="hsl(var(--primary))"
                    dataKey="count"
                  >
                    {deviceData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.analytics.topEvents')}</CardTitle>
              <CardDescription>{t('admin.analytics.topEventsDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={eventData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="event_name" type="category" width={150} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
