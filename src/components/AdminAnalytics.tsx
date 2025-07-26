import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, Users, Coins, Activity, DollarSign, Trophy, MessageSquare, Eye } from 'lucide-react';

interface Analytics {
  totalUsers: number;
  totalTokens: number;
  totalVolume: number;
  totalPosts: number;
  totalAchievements: number;
  activeToday: number;
  newUsersThisWeek: number;
  tokenLaunchesToday: number;
}

interface RecentActivity {
  id: string;
  type: 'user_joined' | 'token_created' | 'post_created' | 'token_traded';
  description: string;
  user: string;
  timestamp: string;
}

export const AdminAnalytics = () => {
  const [analytics, setAnalytics] = useState<Analytics>({
    totalUsers: 0,
    totalTokens: 0,
    totalVolume: 0,
    totalPosts: 0,
    totalAchievements: 0,
    activeToday: 0,
    newUsersThisWeek: 0,
    tokenLaunchesToday: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
    fetchRecentActivity();
  }, []);

  const fetchAnalytics = async () => {
    try {
      // Fetch users
      const { data: users } = await supabase
        .from('profiles')
        .select('created_at, last_active');

      // Fetch tokens
      const { data: tokens } = await supabase
        .from('tokens')
        .select('created_at, market_cap');

      // Fetch posts
      const { data: posts } = await supabase
        .from('forum_posts')
        .select('created_at');

      // Fetch achievements
      const { data: achievements } = await supabase
        .from('user_achievements')
        .select('created_at');

      // Fetch trading activity for volume
      const { data: trades } = await supabase
        .from('trading_activities')
        .select('amount_sol');

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      setAnalytics({
        totalUsers: users?.length || 0,
        totalTokens: tokens?.length || 0,
        totalVolume: trades?.reduce((sum, trade) => sum + parseFloat(trade.amount_sol?.toString() || '0'), 0) || 0,
        totalPosts: posts?.length || 0,
        totalAchievements: achievements?.length || 0,
        activeToday: users?.filter(user => new Date(user.last_active) >= today).length || 0,
        newUsersThisWeek: users?.filter(user => new Date(user.created_at) >= weekAgo).length || 0,
        tokenLaunchesToday: tokens?.filter(token => new Date(token.created_at) >= today).length || 0
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      // This is a simplified version - you'd want to create a proper activity log table
      const recentUsers = await supabase
        .from('profiles')
        .select('wallet_address, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      const recentTokens = await supabase
        .from('tokens')
        .select('name, creator_wallet, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      const recentPosts = await supabase
        .from('forum_posts')
        .select('title, user_wallet, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      const activities: RecentActivity[] = [];

      recentUsers.data?.forEach(user => {
        activities.push({
          id: `user-${user.wallet_address}`,
          type: 'user_joined',
          description: 'New user joined the platform',
          user: user.wallet_address,
          timestamp: user.created_at
        });
      });

      recentTokens.data?.forEach(token => {
        activities.push({
          id: `token-${token.name}`,
          type: 'token_created',
          description: `Created token "${token.name}"`,
          user: token.creator_wallet,
          timestamp: token.created_at
        });
      });

      recentPosts.data?.forEach(post => {
        activities.push({
          id: `post-${post.title}`,
          type: 'post_created',
          description: `Created forum post "${post.title}"`,
          user: post.user_wallet,
          timestamp: post.created_at
        });
      });

      // Sort by timestamp
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRecentActivity(activities.slice(0, 10));
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };

  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
    return `$${amount.toFixed(2)}`;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_joined': return <Users className="h-4 w-4 text-blue-500" />;
      case 'token_created': return <Coins className="h-4 w-4 text-yellow-500" />;
      case 'post_created': return <MessageSquare className="h-4 w-4 text-green-500" />;
      case 'token_traded': return <TrendingUp className="h-4 w-4 text-purple-500" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getActivityBadge = (type: string) => {
    switch (type) {
      case 'user_joined': return <Badge variant="secondary">User</Badge>;
      case 'token_created': return <Badge variant="default">Token</Badge>;
      case 'post_created': return <Badge variant="outline">Forum</Badge>;
      case 'token_traded': return <Badge variant="destructive">Trade</Badge>;
      default: return <Badge>Activity</Badge>;
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{analytics.totalUsers}</p>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-xs text-green-600">+{analytics.newUsersThisWeek} this week</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Coins className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{analytics.totalTokens}</p>
                <p className="text-sm text-muted-foreground">Total Tokens</p>
                <p className="text-xs text-green-600">+{analytics.tokenLaunchesToday} today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{analytics.totalVolume.toFixed(1)} SOL</p>
                <p className="text-sm text-muted-foreground">Total Volume</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Eye className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{analytics.activeToday}</p>
                <p className="text-sm text-muted-foreground">Active Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{analytics.totalPosts}</p>
                <p className="text-sm text-muted-foreground">Forum Posts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{analytics.totalAchievements}</p>
                <p className="text-sm text-muted-foreground">Achievements Earned</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">
                  {((analytics.newUsersThisWeek / analytics.totalUsers) * 100).toFixed(1)}%
                </p>
                <p className="text-sm text-muted-foreground">Growth Rate (Weekly)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Platform Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Activity</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentActivity.map((activity) => (
                <TableRow key={activity.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getActivityIcon(activity.type)}
                      <span className="text-sm">{activity.description}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {formatWalletAddress(activity.user)}
                  </TableCell>
                  <TableCell>
                    {getActivityBadge(activity.type)}
                  </TableCell>
                  <TableCell>{formatDate(activity.timestamp)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};