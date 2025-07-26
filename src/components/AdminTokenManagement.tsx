import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Star, StarOff, TrendingUp, Search, Eye, Trash2, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

interface Token {
  id: string;
  name: string;
  symbol: string;
  description: string;
  image_url: string;
  creator_wallet: string;
  market_cap: number | string;
  price: number | string;
  volume_24h: number | string;
  holder_count: number;
  is_graduated: boolean;
  created_at: string;
}

export const AdminTokenManagement = () => {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    fetchTokens();
  }, []);

  const fetchTokens = async () => {
    try {
      const { data, error } = await supabase
        .from('tokens')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTokens(data || []);
    } catch (error) {
      console.error('Error fetching tokens:', error);
      toast.error('Failed to load tokens');
    } finally {
      setLoading(false);
    }
  };

  const handleForceGraduation = async (tokenId: string) => {
    try {
      const { error } = await supabase
        .from('tokens')
        .update({ 
          is_graduated: true,
          market_cap: 100000 // Set to graduation threshold
        })
        .eq('id', tokenId);

      if (error) throw error;

      toast.success('Token graduated successfully');
      fetchTokens();
    } catch (error: any) {
      console.error('Error graduating token:', error);
      toast.error(error.message || 'Failed to graduate token');
    }
  };

  const handleDeleteToken = async (tokenId: string) => {
    if (!confirm('Are you sure you want to delete this token? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('tokens')
        .delete()
        .eq('id', tokenId);

      if (error) throw error;

      toast.success('Token deleted successfully');
      fetchTokens();
    } catch (error: any) {
      console.error('Error deleting token:', error);
      toast.error(error.message || 'Failed to delete token');
    }
  };

  const filteredTokens = tokens.filter(token =>
    token.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    token.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    token.creator_wallet.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: string | number) => {
    const num = parseFloat(amount.toString());
    if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
    return `$${num.toFixed(2)}`;
  };

  if (loading) {
    return <div className="flex justify-center py-8">Loading token data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search tokens..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Eye className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{tokens.length}</p>
                <p className="text-sm text-muted-foreground">Total Tokens</p>
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
                  {tokens.filter(t => t.is_graduated).length}
                </p>
                <p className="text-sm text-muted-foreground">Graduated</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">
                  {formatCurrency(
                    tokens.reduce((sum, token) => sum + parseFloat(token.market_cap?.toString() || '0'), 0)
                  )}
                </p>
                <p className="text-sm text-muted-foreground">Total Market Cap</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Star className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">
                  {tokens.reduce((sum, token) => sum + token.holder_count, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total Holders</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tokens Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            All Tokens ({filteredTokens.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Token</TableHead>
                <TableHead>Creator</TableHead>
                <TableHead>Market Cap</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Volume 24h</TableHead>
                <TableHead>Holders</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTokens.map((token) => (
                <TableRow key={token.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <img 
                        src={token.image_url || '/placeholder.svg'} 
                        alt={token.name}
                        className="h-8 w-8 rounded-full"
                      />
                      <div>
                        <p className="font-medium">{token.name}</p>
                        <p className="text-sm text-muted-foreground">${token.symbol}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {formatWalletAddress(token.creator_wallet)}
                  </TableCell>
                  <TableCell>{formatCurrency(token.market_cap || 0)}</TableCell>
                  <TableCell>${parseFloat(token.price?.toString() || '0').toFixed(6)}</TableCell>
                  <TableCell>{formatCurrency(token.volume_24h || 0)}</TableCell>
                  <TableCell>{token.holder_count}</TableCell>
                  <TableCell>
                    {token.is_graduated ? (
                      <Badge variant="default">Graduated</Badge>
                    ) : (
                      <Badge variant="secondary">Bonding Curve</Badge>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(token.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedToken(token);
                          setIsDetailsOpen(true);
                        }}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      {!token.is_graduated && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleForceGraduation(token.id)}
                        >
                          <TrendingUp className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteToken(token.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Token Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Token Details</DialogTitle>
          </DialogHeader>
          {selectedToken && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <img 
                  src={selectedToken.image_url || '/placeholder.svg'} 
                  alt={selectedToken.name}
                  className="h-16 w-16 rounded-full"
                />
                <div>
                  <h3 className="text-xl font-bold">{selectedToken.name}</h3>
                  <p className="text-muted-foreground">${selectedToken.symbol}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Creator</label>
                  <p className="font-mono text-sm">{selectedToken.creator_wallet}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Market Cap</label>
                  <p>{formatCurrency(selectedToken.market_cap || 0)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Price</label>
                  <p>${parseFloat(selectedToken.price?.toString() || '0').toFixed(6)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Holders</label>
                  <p>{selectedToken.holder_count}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Description</label>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedToken.description || 'No description provided'}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};