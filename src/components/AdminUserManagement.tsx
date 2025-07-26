import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, Ban, UnlockKeyhole, Search, Eye, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { UserRankBadge } from './UserRankBadge';

interface Profile {
  wallet_address: string;
  username: string | null;
  email: string | null;
  auth_type: string;
  is_admin: boolean;
  created_at: string;
  last_active: string;
  total_tokens_created: number;
  total_volume_traded: number | string;
}

interface BannedWallet {
  id: string;
  wallet_address: string;
  banned_by: string;
  ban_reason: string | null;
  banned_at: string;
  is_permanent: boolean;
}

export const AdminUserManagement = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [bannedWallets, setBannedWallets] = useState<BannedWallet[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateAdminOpen, setIsCreateAdminOpen] = useState(false);
  const [isBanUserOpen, setIsBanUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const [adminForm, setAdminForm] = useState({
    email: '',
    password: '',
    rankType: 'Forgemaster'
  });

  const [banForm, setBanForm] = useState({
    walletAddress: '',
    reason: '',
    isPermanent: true
  });

  useEffect(() => {
    fetchProfiles();
    fetchBannedWallets();
  }, []);

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
      toast.error('Failed to load user profiles');
    } finally {
      setLoading(false);
    }
  };

  const fetchBannedWallets = async () => {
    try {
      const { data, error } = await supabase
        .from('banned_wallets')
        .select('*')
        .order('banned_at', { ascending: false });

      if (error) throw error;
      setBannedWallets(data || []);
    } catch (error) {
      console.error('Error fetching banned wallets:', error);
    }
  };

  const handleCreateAdmin = async () => {
    try {
      // Use Supabase admin API to create user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: adminForm.email,
        password: adminForm.password,
        user_metadata: {
          is_admin: true,
          rank_type: adminForm.rankType
        }
      });

      if (authError) throw authError;

      toast.success(`${adminForm.rankType} account created successfully`);
      setIsCreateAdminOpen(false);
      setAdminForm({ email: '', password: '', rankType: 'Forgemaster' });
      fetchProfiles();
    } catch (error: any) {
      console.error('Error creating admin:', error);
      toast.error(error.message || 'Failed to create admin account');
    }
  };

  const handleBanUser = async () => {
    try {
      const { error } = await supabase
        .from('banned_wallets')
        .insert({
          wallet_address: banForm.walletAddress,
          banned_by: 'Forgelord', // Current admin
          ban_reason: banForm.reason,
          is_permanent: banForm.isPermanent
        });

      if (error) throw error;

      toast.success('User banned successfully');
      setIsBanUserOpen(false);
      setBanForm({ walletAddress: '', reason: '', isPermanent: true });
      fetchBannedWallets();
    } catch (error: any) {
      console.error('Error banning user:', error);
      toast.error(error.message || 'Failed to ban user');
    }
  };

  const handleUnbanUser = async (walletAddress: string) => {
    try {
      const { error } = await supabase
        .from('banned_wallets')
        .delete()
        .eq('wallet_address', walletAddress);

      if (error) throw error;

      toast.success('User unbanned successfully');
      fetchBannedWallets();
    } catch (error: any) {
      console.error('Error unbanning user:', error);
      toast.error(error.message || 'Failed to unban user');
    }
  };

  const filteredProfiles = profiles.filter(profile =>
    profile.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    profile.wallet_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    profile.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const isBanned = (walletAddress: string) => {
    return bannedWallets.some(banned => banned.wallet_address === walletAddress);
  };

  if (loading) {
    return <div className="flex justify-center py-8">Loading user data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4">
        <Dialog open={isCreateAdminOpen} onOpenChange={setIsCreateAdminOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Create Admin
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Admin Account</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="admin-email">Email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  value={adminForm.email}
                  onChange={(e) => setAdminForm({...adminForm, email: e.target.value})}
                  placeholder="admin@moonforge.io"
                />
              </div>
              <div>
                <Label htmlFor="admin-password">Password</Label>
                <Input
                  id="admin-password"
                  type="password"
                  value={adminForm.password}
                  onChange={(e) => setAdminForm({...adminForm, password: e.target.value})}
                  placeholder="Secure password"
                />
              </div>
              <div>
                <Label htmlFor="rank-type">Admin Rank</Label>
                <Select value={adminForm.rankType} onValueChange={(value) => setAdminForm({...adminForm, rankType: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Forgemaster">Forgemaster</SelectItem>
                    <SelectItem value="Forgelord" disabled>Forgelord (Reserved)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreateAdmin} className="w-full">
                Create Admin Account
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isBanUserOpen} onOpenChange={setIsBanUserOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive" className="flex items-center gap-2">
              <Ban className="h-4 w-4" />
              Ban User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ban User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="ban-wallet">Wallet Address</Label>
                <Input
                  id="ban-wallet"
                  value={banForm.walletAddress}
                  onChange={(e) => setBanForm({...banForm, walletAddress: e.target.value})}
                  placeholder="Enter wallet address to ban"
                />
              </div>
              <div>
                <Label htmlFor="ban-reason">Reason</Label>
                <Textarea
                  id="ban-reason"
                  value={banForm.reason}
                  onChange={(e) => setBanForm({...banForm, reason: e.target.value})}
                  placeholder="Reason for ban..."
                />
              </div>
              <Button onClick={handleBanUser} variant="destructive" className="w-full">
                Ban User
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            All Users ({filteredProfiles.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Wallet</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Rank</TableHead>
                <TableHead>Tokens</TableHead>
                <TableHead>Volume</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProfiles.map((profile) => (
                <TableRow key={profile.wallet_address}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {profile.username ? profile.username[0].toUpperCase() : '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{profile.username || 'Anonymous'}</p>
                        {profile.email && (
                          <p className="text-sm text-muted-foreground">{profile.email}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {formatWalletAddress(profile.wallet_address)}
                  </TableCell>
                  <TableCell>
                    {profile.is_admin ? (
                      <Badge variant="destructive">Admin</Badge>
                    ) : (
                      <Badge variant="secondary">{profile.auth_type}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <UserRankBadge walletAddress={profile.wallet_address} size="sm" />
                  </TableCell>
                  <TableCell>{profile.total_tokens_created}</TableCell>
                  <TableCell>{parseFloat(profile.total_volume_traded?.toString() || '0').toFixed(2)} SOL</TableCell>
                  <TableCell>{formatDate(profile.created_at)}</TableCell>
                  <TableCell>
                    {isBanned(profile.wallet_address) ? (
                      <Badge variant="destructive">BANNED</Badge>
                    ) : (
                      <Badge variant="default">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {isBanned(profile.wallet_address) ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUnbanUser(profile.wallet_address)}
                        className="flex items-center gap-1"
                      >
                        <UnlockKeyhole className="h-3 w-3" />
                        Unban
                      </Button>
                    ) : !profile.is_admin ? (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setBanForm({...banForm, walletAddress: profile.wallet_address});
                          setIsBanUserOpen(true);
                        }}
                        className="flex items-center gap-1"
                      >
                        <Ban className="h-3 w-3" />
                        Ban
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Banned Users */}
      {bannedWallets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5" />
              Banned Users ({bannedWallets.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Wallet Address</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Banned By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bannedWallets.map((banned) => (
                  <TableRow key={banned.id}>
                    <TableCell className="font-mono text-sm">
                      {formatWalletAddress(banned.wallet_address)}
                    </TableCell>
                    <TableCell>{banned.ban_reason || 'No reason provided'}</TableCell>
                    <TableCell>{banned.banned_by}</TableCell>
                    <TableCell>{formatDate(banned.banned_at)}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUnbanUser(banned.wallet_address)}
                        className="flex items-center gap-1"
                      >
                        <UnlockKeyhole className="h-3 w-3" />
                        Unban
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};