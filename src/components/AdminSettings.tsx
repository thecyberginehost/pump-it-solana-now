import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { Settings, Database, Wallet, DollarSign, Shield, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface FeeConfig {
  platform_fee_bps: number;
  creator_fee_bps: number;
  prize_pool_fee_bps: number;
  reserves_fee_bps: number;
}

interface WalletConfig {
  platform_wallet: string;
  community_wallet: string;
  liquidity_wallet: string;
  prize_pool_wallet: string;
  reserves_wallet: string;
}

export const AdminSettings = () => {
  const [feeConfig, setFeeConfig] = useState<FeeConfig>({
    platform_fee_bps: 100,
    creator_fee_bps: 50,
    prize_pool_fee_bps: 30,
    reserves_fee_bps: 20
  });

  const [walletConfig, setWalletConfig] = useState<WalletConfig>({
    platform_wallet: '',
    community_wallet: '',
    liquidity_wallet: '',
    prize_pool_wallet: '',
    reserves_wallet: ''
  });

  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      // Fetch fee config
      const { data: feeData } = await supabase
        .from('fee_config')
        .select('*')
        .eq('is_active', true)
        .single();

      if (feeData) {
        setFeeConfig(feeData);
      }

      // Fetch wallet configs
      const { data: walletData } = await supabase
        .from('wallet_config')
        .select('*')
        .eq('is_active', true);

      if (walletData) {
        const wallets: any = {};
        walletData.forEach(wallet => {
          wallets[`${wallet.wallet_type}_wallet`] = wallet.wallet_address;
        });
        setWalletConfig(wallets);
      }
    } catch (error) {
      console.error('Error fetching configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateFeeConfig = async () => {
    try {
      // Deactivate current config
      await supabase
        .from('fee_config')
        .update({ is_active: false })
        .eq('is_active', true);

      // Insert new config
      const { error } = await supabase
        .from('fee_config')
        .insert({
          ...feeConfig,
          is_active: true
        });

      if (error) throw error;

      toast.success('Fee configuration updated successfully');
    } catch (error: any) {
      console.error('Error updating fee config:', error);
      toast.error(error.message || 'Failed to update fee configuration');
    }
  };

  const handleUpdateWalletConfig = async () => {
    try {
      // This would require admin access to update wallet configs
      toast.info('Wallet configuration requires direct database access');
    } catch (error: any) {
      console.error('Error updating wallet config:', error);
      toast.error(error.message || 'Failed to update wallet configuration');
    }
  };

  const calculateTotalFeeBps = () => {
    return feeConfig.platform_fee_bps + feeConfig.creator_fee_bps + 
           feeConfig.prize_pool_fee_bps + feeConfig.reserves_fee_bps;
  };

  if (loading) {
    return <div className="flex justify-center py-8">Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Platform Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Platform Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="maintenance">Maintenance Mode</Label>
              <p className="text-sm text-muted-foreground">
                Temporarily disable platform access for maintenance
              </p>
            </div>
            <Switch
              id="maintenance"
              checked={maintenanceMode}
              onCheckedChange={setMaintenanceMode}
            />
          </div>
          
          {maintenanceMode && (
            <div className="p-3 border border-yellow-200 rounded-md bg-yellow-50">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <p className="text-sm text-yellow-800">
                  Platform is in maintenance mode. Users cannot access trading features.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fee Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Fee Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="platform-fee">Platform Fee (BPS)</Label>
              <Input
                id="platform-fee"
                type="number"
                value={feeConfig.platform_fee_bps}
                onChange={(e) => setFeeConfig({
                  ...feeConfig,
                  platform_fee_bps: parseInt(e.target.value) || 0
                })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {(feeConfig.platform_fee_bps / 100).toFixed(2)}%
              </p>
            </div>

            <div>
              <Label htmlFor="creator-fee">Creator Fee (BPS)</Label>
              <Input
                id="creator-fee"
                type="number"
                value={feeConfig.creator_fee_bps}
                onChange={(e) => setFeeConfig({
                  ...feeConfig,
                  creator_fee_bps: parseInt(e.target.value) || 0
                })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {(feeConfig.creator_fee_bps / 100).toFixed(2)}%
              </p>
            </div>

            <div>
              <Label htmlFor="prize-fee">Prize Pool Fee (BPS)</Label>
              <Input
                id="prize-fee"
                type="number"
                value={feeConfig.prize_pool_fee_bps}
                onChange={(e) => setFeeConfig({
                  ...feeConfig,
                  prize_pool_fee_bps: parseInt(e.target.value) || 0
                })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {(feeConfig.prize_pool_fee_bps / 100).toFixed(2)}%
              </p>
            </div>

            <div>
              <Label htmlFor="reserves-fee">Reserves Fee (BPS)</Label>
              <Input
                id="reserves-fee"
                type="number"
                value={feeConfig.reserves_fee_bps}
                onChange={(e) => setFeeConfig({
                  ...feeConfig,
                  reserves_fee_bps: parseInt(e.target.value) || 0
                })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {(feeConfig.reserves_fee_bps / 100).toFixed(2)}%
              </p>
            </div>
          </div>

          <div className="p-3 border rounded-md bg-muted/20">
            <p className="text-sm font-medium">
              Total Fee: {calculateTotalFeeBps()} BPS ({(calculateTotalFeeBps() / 100).toFixed(2)}%)
            </p>
            <p className="text-xs text-muted-foreground">
              Total fee applied to all trades
            </p>
          </div>

          <Button onClick={handleUpdateFeeConfig}>
            Update Fee Configuration
          </Button>
        </CardContent>
      </Card>

      {/* Wallet Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Wallet Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <Label htmlFor="platform-wallet">Platform Wallet</Label>
              <Input
                id="platform-wallet"
                value={walletConfig.platform_wallet}
                onChange={(e) => setWalletConfig({
                  ...walletConfig,
                  platform_wallet: e.target.value
                })}
                placeholder="Platform wallet address"
                className="font-mono text-sm"
              />
            </div>

            <div>
              <Label htmlFor="community-wallet">Community Wallet</Label>
              <Input
                id="community-wallet"
                value={walletConfig.community_wallet}
                onChange={(e) => setWalletConfig({
                  ...walletConfig,
                  community_wallet: e.target.value
                })}
                placeholder="Community wallet address"
                className="font-mono text-sm"
              />
            </div>

            <div>
              <Label htmlFor="liquidity-wallet">Liquidity Wallet</Label>
              <Input
                id="liquidity-wallet"
                value={walletConfig.liquidity_wallet}
                onChange={(e) => setWalletConfig({
                  ...walletConfig,
                  liquidity_wallet: e.target.value
                })}
                placeholder="Liquidity wallet address"
                className="font-mono text-sm"
              />
            </div>

            <div>
              <Label htmlFor="prize-wallet">Prize Pool Wallet</Label>
              <Input
                id="prize-wallet"
                value={walletConfig.prize_pool_wallet}
                onChange={(e) => setWalletConfig({
                  ...walletConfig,
                  prize_pool_wallet: e.target.value
                })}
                placeholder="Prize pool wallet address"
                className="font-mono text-sm"
              />
            </div>

            <div>
              <Label htmlFor="reserves-wallet">Reserves Wallet</Label>
              <Input
                id="reserves-wallet"
                value={walletConfig.reserves_wallet}
                onChange={(e) => setWalletConfig({
                  ...walletConfig,
                  reserves_wallet: e.target.value
                })}
                placeholder="Reserves wallet address"
                className="font-mono text-sm"
              />
            </div>
          </div>

          <Button onClick={handleUpdateWalletConfig} variant="outline">
            Update Wallet Configuration
          </Button>
        </CardContent>
      </Card>

      {/* Database Operations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Operations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Button variant="outline" size="sm">
              Backup Database
            </Button>
            <Button variant="outline" size="sm">
              Clear Cache
            </Button>
            <Button variant="outline" size="sm">
              Refresh Analytics
            </Button>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <p className="text-sm font-medium text-destructive">Danger Zone</p>
            <Button variant="destructive" size="sm" disabled>
              Reset Platform Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};